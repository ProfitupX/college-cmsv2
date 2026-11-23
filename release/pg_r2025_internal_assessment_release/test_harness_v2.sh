#!/usr/bin/env bash
# ==============================================================================
# Comprehensive Simulation Test Suite for MarkHub PG R2025 Deployment & Rollback
# Covers: Pre-flight checks, atomic replacement, failure recovery,
# strict recovery manifest validation, and all post-recovery health failure scenarios.
# ==============================================================================
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d /tmp/markhub_sim_v2_XXXXXX)"
trap 'rm -rf "${TEST_ROOT}"' EXIT

MOCK_BIN="${TEST_ROOT}/mock_bin"
mkdir -p "${MOCK_BIN}"
export PATH="${MOCK_BIN}:${PATH}"
SCRATCH_DIR="${SCRATCH_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

# Create mock pm2
cat << 'EOF' > "${MOCK_BIN}/pm2"
#!/usr/bin/env bash
case "${1:-}" in
  reload)
    if [ "${PM2_FAIL_RELOAD:-false}" = "true" ]; then
      echo "Mock PM2 reload failed!" >&2
      exit 1
    fi
    echo "Mock PM2 reloaded ${2:-}"
    exit 0
    ;;
  show)
    if [ "${PM2_FAIL_SHOW:-false}" = "true" ]; then
      echo "status: stopped"
    else
      echo "status: online"
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
EOF
chmod +x "${MOCK_BIN}/pm2"

# Create mock curl
cat << 'EOF' > "${MOCK_BIN}/curl"
#!/usr/bin/env bash
URL="${!#}"
if [ "${CURL_FAIL:-false}" = "true" ]; then
  exit 1
fi

if [[ "${URL}" == *"api/health"* ]]; then
  if [ "${HEALTH_DB_DISCONNECTED:-false}" = "true" ]; then
    echo '{"status":"error","database":"disconnected"}'
    exit 1
  fi
  echo '{"status":"ok","database":"connected","service":"college-cms-api"}'
  exit 0
fi

if [[ "${URL}" == *"version.json"* ]]; then
  if [ "${REMOTE_VERSION_MISMATCH:-false}" = "true" ]; then
    echo '{"version":"9.9.999","buildTime":12345}'
  elif [ -n "${MOCK_FRONTEND_VER:-}" ]; then
    echo "{\"version\":\"${MOCK_FRONTEND_VER}\",\"buildTime\":12345}"
  elif [ -n "${PROD_DIR:-}" ] && [ -f "${PROD_DIR}/dist/version.json" ]; then
    cat "${PROD_DIR}/dist/version.json"
  else
    echo '{"version":"1.0.old","buildTime":12345}'
  fi
  exit 0
fi

if [[ "${URL}" == *"markhub.nscet.org"* ]]; then
  if [ "${FRONTEND_HTTPS_FAIL:-false}" = "true" ]; then
    exit 1
  fi
  exit 0
fi

exit 0
EOF
chmod +x "${MOCK_BIN}/curl"

PASS_COUNT=0
FAIL_COUNT=0

record_test() {
  local name="$1"
  local expected_code="$2"
  local actual_code="$3"
  if [ "${expected_code}" -eq "${actual_code}" ]; then
    echo "[PASS] ${name} (Exit code: ${actual_code})"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "[FAIL] ${name} (Expected: ${expected_code}, Got: ${actual_code})" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

setup_mock_env() {
  local env_dir="$1"
  mkdir -p "${env_dir}/prod/server/routes"
  mkdir -p "${env_dir}/prod/src/utils"
  mkdir -p "${env_dir}/prod/dist"
  mkdir -p "${env_dir}/prod/backups"

  # Prod existing files
  echo "console.log('original marks.js');" > "${env_dir}/prod/server/routes/marks.js"
  echo "console.log('original regulationResolver.js');" > "${env_dir}/prod/src/utils/regulationResolver.js"
  echo "console.log('original academicProgrammes.js');" > "${env_dir}/prod/src/utils/academicProgrammes.js"
  # pgRegulation2025.js absent initially in prod

  # Prod dist
  echo "<html>Original</html>" > "${env_dir}/prod/dist/index.html"
  echo '{"version":"1.0.old","buildTime":11111}' > "${env_dir}/prod/dist/version.json"

  # Release content
  mkdir -p "${env_dir}/release_content/server/routes"
  mkdir -p "${env_dir}/release_content/src/utils"
  mkdir -p "${env_dir}/release_content/dist"

  echo "console.log('new marks.js');" > "${env_dir}/release_content/server/routes/marks.js"
  echo "console.log('new regulationResolver.js');" > "${env_dir}/release_content/src/utils/regulationResolver.js"
  echo "console.log('new pgRegulation2025.js');" > "${env_dir}/release_content/src/utils/pgRegulation2025.js"
  echo "console.log('new academicProgrammes.js');" > "${env_dir}/release_content/src/utils/academicProgrammes.js"

  echo "<html>New Release</html>" > "${env_dir}/release_content/dist/index.html"
  echo '{"version":"2.0.test","buildTime":22222}' > "${env_dir}/release_content/dist/version.json"

  tar -czf "${env_dir}/release.tar.gz" -C "${env_dir}/release_content" .
}

echo "=== Running MarkHub Deployment & Rollback Simulation Test Suite ==="

# ------------------------------------------------------------------------------
# TEST 1: Release Archive Unexpected Path Rejection
# ------------------------------------------------------------------------------
T1_DIR="${TEST_ROOT}/t1"
setup_mock_env "${T1_DIR}"
mkdir -p "${T1_DIR}/bad_tar_content"
cp -r "${T1_DIR}/release_content/"* "${T1_DIR}/bad_tar_content/"
echo "MALICIOUS" > "${T1_DIR}/bad_tar_content/unapproved_script.sh"
tar -czf "${T1_DIR}/bad_release.tar.gz" -C "${T1_DIR}/bad_tar_content" .
CALC_SHA="$(sha256sum "${T1_DIR}/bad_release.tar.gz" | awk '{print $1}')"

set +e
PROD_DIR="${T1_DIR}/prod" \
RELEASE_TAR="${T1_DIR}/bad_release.tar.gz" \
EXPECTED_SHA256="${CALC_SHA}" \
bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" > "${T1_DIR}/deploy.log" 2>&1
T1_EXIT=$?
set -e

if [ "${T1_EXIT}" -ne 0 ] && grep -q "Unexpected entry in release archive:" "${T1_DIR}/deploy.log"; then
  record_test "Test 1: Release archive with unexpected path rejected before extraction" 1 "${T1_EXIT}"
else
  record_test "Test 1: Release archive with unexpected path rejected before extraction" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 2: Staged Backend File Syntax Check Failure
# ------------------------------------------------------------------------------
T2_DIR="${TEST_ROOT}/t2"
setup_mock_env "${T2_DIR}"
mkdir -p "${T2_DIR}/corrupt_content"
cp -r "${T2_DIR}/release_content/"* "${T2_DIR}/corrupt_content/"
echo "INVALID SYNTAX {{{{ ;;;;" > "${T2_DIR}/corrupt_content/server/routes/marks.js"
tar -czf "${T2_DIR}/corrupt_release.tar.gz" -C "${T2_DIR}/corrupt_content" .
CALC_SHA="$(sha256sum "${T2_DIR}/corrupt_release.tar.gz" | awk '{print $1}')"

set +e
PROD_DIR="${T2_DIR}/prod" \
RELEASE_TAR="${T2_DIR}/corrupt_release.tar.gz" \
EXPECTED_SHA256="${CALC_SHA}" \
bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" > "${T2_DIR}/deploy.log" 2>&1
T2_EXIT=$?
set -e

if [ "${T2_EXIT}" -ne 0 ] && grep -q "Node syntax check failed for staged" "${T2_DIR}/deploy.log" && grep -q "original marks.js" "${T2_DIR}/prod/server/routes/marks.js"; then
  record_test "Test 2: Staged backend syntax error aborted without touching production" 1 "${T2_EXIT}"
else
  record_test "Test 2: Staged backend syntax error aborted without touching production" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 3: Staged Dist Validation Failure
# ------------------------------------------------------------------------------
T3_DIR="${TEST_ROOT}/t3"
setup_mock_env "${T3_DIR}"
mkdir -p "${T3_DIR}/bad_dist_content"
cp -r "${T3_DIR}/release_content/"* "${T3_DIR}/bad_dist_content/"
echo "INVALID JSON" > "${T3_DIR}/bad_dist_content/dist/version.json"
tar -czf "${T3_DIR}/bad_dist_release.tar.gz" -C "${T3_DIR}/bad_dist_content" .
CALC_SHA="$(sha256sum "${T3_DIR}/bad_dist_release.tar.gz" | awk '{print $1}')"

set +e
PROD_DIR="${T3_DIR}/prod" \
RELEASE_TAR="${T3_DIR}/bad_dist_release.tar.gz" \
EXPECTED_SHA256="${CALC_SHA}" \
bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" > "${T3_DIR}/deploy.log" 2>&1
T3_EXIT=$?
set -e

if [ "${T3_EXIT}" -ne 0 ] && grep -q "Invalid version.json" "${T3_DIR}/deploy.log"; then
  record_test "Test 3: Staged dist validation caught invalid version.json without touching production" 1 "${T3_EXIT}"
else
  record_test "Test 3: Staged dist validation caught invalid version.json without touching production" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 4: Clean Deployment Success Flow
# ------------------------------------------------------------------------------
T4_DIR="${TEST_ROOT}/t4"
setup_mock_env "${T4_DIR}"
CALC_SHA="$(sha256sum "${T4_DIR}/release.tar.gz" | awk '{print $1}')"

export MOCK_FRONTEND_VER="2.0.test"
set +e
PROD_DIR="${T4_DIR}/prod" \
RELEASE_TAR="${T4_DIR}/release.tar.gz" \
EXPECTED_SHA256="${CALC_SHA}" \
bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" > "${T4_DIR}/deploy.log" 2>&1
T4_EXIT=$?
unset MOCK_FRONTEND_VER
set -e

if [ "${T4_EXIT}" -eq 0 ] && grep -q "new marks.js" "${T4_DIR}/prod/server/routes/marks.js" && grep -q "2.0.test" "${T4_DIR}/prod/dist/version.json"; then
  record_test "Test 4: Clean deployment executed and verified successfully" 0 "${T4_EXIT}"
else
  record_test "Test 4: Clean deployment executed and verified successfully" 0 1
fi

# ------------------------------------------------------------------------------
# TEST 5: Deployment Failure Triggers Recovery & Recovery Fully Verified
# ------------------------------------------------------------------------------
T5_DIR="${TEST_ROOT}/t5"
setup_mock_env "${T5_DIR}"
CALC_SHA="$(sha256sum "${T5_DIR}/release.tar.gz" | awk '{print $1}')"

set +e
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T5_DIR}/prod'
  TIMESTAMP='test_t5'
  BACKUP_DIR='${T5_DIR}/prod/backups/pg_r2025_backup_test_t5'
  DIST_PREV='${T5_DIR}/prod/dist_prev_test_t5'
  STAGE_DIR='${T5_DIR}/stage_t5'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regulationResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original academicProgrammes.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  # Faulty state in prod
  mkdir -p '${T5_DIR}/prod/dist'
  echo 'faulty' > '${T5_DIR}/prod/dist/version.json'
  touch '${T5_DIR}/prod/src/utils/pgRegulation2025.js'

  execute_full_recovery 'Simulated mid-step deployment failure'
" > "${T5_DIR}/deploy_recovery_success.log" 2>&1
T5_EXIT=$?
set -e

if [ "${T5_EXIT}" -ne 0 ] && grep -q "RECOVERY SUCCESS" "${T5_DIR}/deploy_recovery_success.log" && grep -q "1.0.old" "${T5_DIR}/prod/dist/version.json"; then
  record_test "Test 5: Deployment recovery verified all 4 health checks and reported RECOVERY SUCCESS" 1 "${T5_EXIT}"
else
  record_test "Test 5: Deployment recovery verified all 4 health checks and reported RECOVERY SUCCESS" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 6: Deployment Recovery Failure Scenario - PM2 Process Offline
# ------------------------------------------------------------------------------
T6_DIR="${TEST_ROOT}/t6"
setup_mock_env "${T6_DIR}"

set +e
export PM2_FAIL_SHOW="true"
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T6_DIR}/prod'
  TIMESTAMP='test_t6'
  BACKUP_DIR='${T6_DIR}/prod/backups/pg_r2025_backup_test_t6'
  DIST_PREV='${T6_DIR}/prod/dist_prev_test_t6'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regulationResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original academicProgrammes.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  execute_full_recovery 'Trigger recovery with offline PM2'
" > "${T6_DIR}/recovery_pm2_fail.log" 2>&1
T6_EXIT=$?
unset PM2_FAIL_SHOW
set -e

if [ "${T6_EXIT}" -ne 0 ] && grep -q "PM2 markhub-server is not in 'online' state" "${T6_DIR}/recovery_pm2_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T6_DIR}/recovery_pm2_fail.log"; then
  record_test "Test 6: Deployment recovery health failure (PM2 offline) reported as FAILED" 1 "${T6_EXIT}"
else
  record_test "Test 6: Deployment recovery health failure (PM2 offline) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 7: Deployment Recovery Failure Scenario - Backend Health DB Disconnected
# ------------------------------------------------------------------------------
T7_DIR="${TEST_ROOT}/t7"
setup_mock_env "${T7_DIR}"

set +e
export HEALTH_DB_DISCONNECTED="true"
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T7_DIR}/prod'
  TIMESTAMP='test_t7'
  BACKUP_DIR='${T7_DIR}/prod/backups/pg_r2025_backup_test_t7'
  DIST_PREV='${T7_DIR}/prod/dist_prev_test_t7'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regulationResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original academicProgrammes.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  execute_full_recovery 'Trigger recovery with DB disconnected'
" > "${T7_DIR}/recovery_health_fail.log" 2>&1
T7_EXIT=$?
unset HEALTH_DB_DISCONNECTED
set -e

if [ "${T7_EXIT}" -ne 0 ] && grep -q "Backend Health:.*FAILED" "${T7_DIR}/recovery_health_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T7_DIR}/recovery_health_fail.log"; then
  record_test "Test 7: Deployment recovery health failure (DB disconnected) reported as FAILED" 1 "${T7_EXIT}"
else
  record_test "Test 7: Deployment recovery health failure (DB disconnected) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 8: Deployment Recovery Failure Scenario - Frontend Root Inaccessible
# ------------------------------------------------------------------------------
T8_DIR="${TEST_ROOT}/t8"
setup_mock_env "${T8_DIR}"

set +e
export FRONTEND_HTTPS_FAIL="true"
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T8_DIR}/prod'
  TIMESTAMP='test_t8'
  BACKUP_DIR='${T8_DIR}/prod/backups/pg_r2025_backup_test_t8'
  DIST_PREV='${T8_DIR}/prod/dist_prev_test_t8'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regulationResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original academicProgrammes.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  execute_full_recovery 'Trigger recovery with frontend HTTPS down'
" > "${T8_DIR}/recovery_root_fail.log" 2>&1
T8_EXIT=$?
unset FRONTEND_HTTPS_FAIL
set -e

if [ "${T8_EXIT}" -ne 0 ] && grep -q "Frontend root endpoint.*unreachable" "${T8_DIR}/recovery_root_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T8_DIR}/recovery_root_fail.log"; then
  record_test "Test 8: Deployment recovery health failure (Frontend root inaccessible) reported as FAILED" 1 "${T8_EXIT}"
else
  record_test "Test 8: Deployment recovery health failure (Frontend root inaccessible) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 9: Deployment Recovery Failure Scenario - Restored Version Mismatch
# ------------------------------------------------------------------------------
T9_DIR="${TEST_ROOT}/t9"
setup_mock_env "${T9_DIR}"

set +e
export REMOTE_VERSION_MISMATCH="true"
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T9_DIR}/prod'
  TIMESTAMP='test_t9'
  BACKUP_DIR='${T9_DIR}/prod/backups/pg_r2025_backup_test_t9'
  DIST_PREV='${T9_DIR}/prod/dist_prev_test_t9'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regulationResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original academicProgrammes.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  execute_full_recovery 'Trigger recovery with version mismatch'
" > "${T9_DIR}/recovery_ver_fail.log" 2>&1
T9_EXIT=$?
unset REMOTE_VERSION_MISMATCH
set -e

if [ "${T9_EXIT}" -ne 0 ] && grep -q "Remote version mismatch" "${T9_DIR}/recovery_ver_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T9_DIR}/recovery_ver_fail.log"; then
  record_test "Test 9: Deployment recovery health failure (Version mismatch) reported as FAILED" 1 "${T9_EXIT}"
else
  record_test "Test 9: Deployment recovery health failure (Version mismatch) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 10: Rollback Manifest Hardening (Rejection of Tampered Manifests)
# ------------------------------------------------------------------------------
T10_DIR="${TEST_ROOT}/t10"
setup_mock_env "${T10_DIR}"
B10_DIR="${T10_DIR}/prod/backups/test_backup"
D10_PREV="${T10_DIR}/prod/dist_prev_test"
mkdir -p "${B10_DIR}" "${D10_PREV}"
echo "<html>Old</html>" > "${D10_PREV}/index.html"
echo '{"version":"1.0.old","buildTime":1}' > "${D10_PREV}/version.json"

# Missing required path
cat << 'EOF' > "${B10_DIR}/manifest.txt"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EOF

set +e
PROD_DIR="${T10_DIR}/prod" bash "${SCRATCH_DIR}/rollback_pg_r2025.sh" "${B10_DIR}" "${D10_PREV}" > "${T10_DIR}/rb_missing.log" 2>&1
RB_MISSING_EXIT=$?

# Path traversal
cat << 'EOF' > "${B10_DIR}/manifest.txt"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:../../etc/shadow
EOF

PROD_DIR="${T10_DIR}/prod" bash "${SCRATCH_DIR}/rollback_pg_r2025.sh" "${B10_DIR}" "${D10_PREV}" > "${T10_DIR}/rb_traversal.log" 2>&1
RB_TRAVERSAL_EXIT=$?

# Duplicate entry
cat << 'EOF' > "${B10_DIR}/manifest.txt"
EXISTS:server/routes/marks.js
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF

PROD_DIR="${T10_DIR}/prod" bash "${SCRATCH_DIR}/rollback_pg_r2025.sh" "${B10_DIR}" "${D10_PREV}" > "${T10_DIR}/rb_duplicate.log" 2>&1
RB_DUPLICATE_EXIT=$?
set -e

if [ "${RB_MISSING_EXIT}" -ne 0 ] && [ "${RB_TRAVERSAL_EXIT}" -ne 0 ] && [ "${RB_DUPLICATE_EXIT}" -ne 0 ]; then
  record_test "Test 10: Rollback manifest hardening rejected missing paths, path traversal, and duplicates" 1 1
else
  record_test "Test 10: Rollback manifest hardening rejected missing paths, path traversal, and duplicates" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 11: Rollback Pre-Verification of Backup Files (Syntax Check)
# ------------------------------------------------------------------------------
T11_DIR="${TEST_ROOT}/t11"
setup_mock_env "${T11_DIR}"
B11_DIR="${T11_DIR}/prod/backups/test_backup"
D11_PREV="${T11_DIR}/prod/dist_prev_test"
mkdir -p "${B11_DIR}/server/routes" "${B11_DIR}/src/utils" "${D11_PREV}"
echo "<html>Old</html>" > "${D11_PREV}/index.html"
echo '{"version":"1.0.old","buildTime":1}' > "${D11_PREV}/version.json"

cat << 'EOF' > "${B11_DIR}/manifest.txt"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF

echo "INVALID SYNTAX {{{{ ;;;;" > "${B11_DIR}/server/routes/marks.js"
echo "console.log('valid');" > "${B11_DIR}/src/utils/regulationResolver.js"
echo "console.log('valid');" > "${B11_DIR}/src/utils/academicProgrammes.js"

set +e
PROD_DIR="${T11_DIR}/prod" bash "${SCRATCH_DIR}/rollback_pg_r2025.sh" "${B11_DIR}" "${D11_PREV}" > "${T11_DIR}/rb_syntax.log" 2>&1
RB_SYNTAX_EXIT=$?
set -e

if [ "${RB_SYNTAX_EXIT}" -ne 0 ] && grep -q "Backup file failed syntax validation" "${T11_DIR}/rb_syntax.log" && grep -q "original marks.js" "${T11_DIR}/prod/server/routes/marks.js"; then
  record_test "Test 11: Rollback pre-verification aborted before modifying production due to syntax check" 1 "${RB_SYNTAX_EXIT}"
else
  record_test "Test 11: Rollback pre-verification aborted before modifying production due to syntax check" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 12: Rollback Backend Replacement Failing Mid-Way & Rollback Recovery
# ------------------------------------------------------------------------------
T12_DIR="${TEST_ROOT}/t12"
setup_mock_env "${T12_DIR}"
CALC_SHA="$(sha256sum "${T12_DIR}/release.tar.gz" | awk '{print $1}')"
export MOCK_FRONTEND_VER="2.0.test"
PROD_DIR="${T12_DIR}/prod" RELEASE_TAR="${T12_DIR}/release.tar.gz" EXPECTED_SHA256="${CALC_SHA}" bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" >/dev/null 2>&1
unset MOCK_FRONTEND_VER

set +e
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T12_DIR}/prod'
  TIMESTAMP='test_t12'
  PRE_ROLLBACK_BACKUP='${T12_DIR}/prod/backups/pre_rollback_backup_test_t12'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T12_DIR}/prod/dist_pre_rollback_test_t12'
  mkdir -p \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\" \"\${PRE_ROLLBACK_DIST}\"
  echo 'console.log(\"pre-rb marks\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"pre-rb regulationResolver\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"pre-rb academicProgrammes\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  # Corrupt prod marks.js and create newly-added pgRegulation2025
  echo 'corrupt marks' > '${T12_DIR}/prod/server/routes/marks.js'
  touch '${T12_DIR}/prod/src/utils/pgRegulation2025.js'

  handle_rollback_failure 'Simulated mid-step failure during backend replacement'
" > "${T12_DIR}/rb_mid_step.log" 2>&1
T12_EXIT=$?
set -e

T12_MARKS_OK=false
T12_PG_REMOVED=false
if grep -q "pre-rb marks" "${T12_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  T12_MARKS_OK=true
fi
if [ ! -f "${T12_DIR}/prod/src/utils/pgRegulation2025.js" ]; then
  T12_PG_REMOVED=true
fi

if [ "${T12_EXIT}" -ne 0 ] && [ "${T12_MARKS_OK}" = "true" ] && [ "${T12_PG_REMOVED}" = "true" ]; then
  record_test "Test 12: Rollback failure recovery restored pre-rollback backend files and removed newly-added files" 1 "${T12_EXIT}"
else
  record_test "Test 12: Rollback failure recovery restored pre-rollback backend files and removed newly-added files" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 13: Rollback Frontend Restoration Failure & Safe Preservation
# ------------------------------------------------------------------------------
T13_DIR="${TEST_ROOT}/t13"
setup_mock_env "${T13_DIR}"
CALC_SHA="$(sha256sum "${T13_DIR}/release.tar.gz" | awk '{print $1}')"
export MOCK_FRONTEND_VER="2.0.test"
PROD_DIR="${T13_DIR}/prod" RELEASE_TAR="${T13_DIR}/release.tar.gz" EXPECTED_SHA256="${CALC_SHA}" bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" >/dev/null 2>&1
unset MOCK_FRONTEND_VER

set +e
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T13_DIR}/prod'
  TIMESTAMP='test_t13'
  PRE_ROLLBACK_BACKUP='${T13_DIR}/prod/backups/pre_rollback_backup_test_t13'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T13_DIR}/prod/dist_pre_rollback_test_t13'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  # Corrupt active prod dist
  echo 'faulty' > '${T13_DIR}/prod/dist/version.json'

  handle_rollback_failure 'Frontend restoration failed during rollback'
" > "${T13_DIR}/rb_frontend_fail.log" 2>&1
T13_EXIT=$?
set -e

if [ "${T13_EXIT}" -ne 0 ] && grep -q "Successfully restored pre-rollback dist to:" "${T13_DIR}/rb_frontend_fail.log" && grep -q "pre.rb" "${T13_DIR}/prod/dist/version.json"; then
  record_test "Test 13: Rollback frontend failure safely recovered pre-rollback dist and preserved copies" 1 "${T13_EXIT}"
else
  record_test "Test 13: Rollback frontend failure safely recovered pre-rollback dist and preserved copies" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 14: Rollback Failure Triggers Recovery & Recovery Fully Verified
# ------------------------------------------------------------------------------
T14_DIR="${TEST_ROOT}/t14"
setup_mock_env "${T14_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T14_DIR}/prod'
  TIMESTAMP='test_t14'
  PRE_ROLLBACK_BACKUP='${T14_DIR}/prod/backups/pre_rollback_backup_test_t14'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T14_DIR}/prod/dist_pre_rollback_test_t14'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  # Corrupt active dist to trigger recovery
  echo 'faulty' > '${T14_DIR}/prod/dist/version.json'

  handle_rollback_failure 'Simulated rollback failure'
" > "${T14_DIR}/rb_recovery_success.log" 2>&1
T14_EXIT=$?
set -e

if [ "${T14_EXIT}" -ne 0 ] && grep -q "ROLLBACK RECOVERY SUCCESS" "${T14_DIR}/rb_recovery_success.log" && grep -q "pre.rb" "${T14_DIR}/prod/dist/version.json"; then
  record_test "Test 14: Rollback failure recovery verified all 4 health checks and reported SUCCESS" 1 "${T14_EXIT}"
else
  record_test "Test 14: Rollback failure recovery verified all 4 health checks and reported SUCCESS" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 15: Rollback Recovery Failure Scenario - PM2 Process Offline
# ------------------------------------------------------------------------------
T15_DIR="${TEST_ROOT}/t15"
setup_mock_env "${T15_DIR}"

set +e
export PM2_FAIL_SHOW="true"
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T15_DIR}/prod'
  TIMESTAMP='test_t15'
  PRE_ROLLBACK_BACKUP='${T15_DIR}/prod/backups/pre_rollback_backup_test_t15'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T15_DIR}/prod/dist_pre_rollback_test_t15'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  handle_rollback_failure 'Rollback recovery with offline PM2'
" > "${T15_DIR}/rb_rec_pm2_fail.log" 2>&1
T15_EXIT=$?
unset PM2_FAIL_SHOW
set -e

if [ "${T15_EXIT}" -ne 0 ] && grep -q "PM2 markhub-server is not in 'online' state" "${T15_DIR}/rb_rec_pm2_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T15_DIR}/rb_rec_pm2_fail.log"; then
  record_test "Test 15: Rollback recovery health failure (PM2 offline) reported as FAILED" 1 "${T15_EXIT}"
else
  record_test "Test 15: Rollback recovery health failure (PM2 offline) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 16: Rollback Recovery Failure Scenario - Backend Health DB Disconnected
# ------------------------------------------------------------------------------
T16_DIR="${TEST_ROOT}/t16"
setup_mock_env "${T16_DIR}"

set +e
export HEALTH_DB_DISCONNECTED="true"
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T16_DIR}/prod'
  TIMESTAMP='test_t16'
  PRE_ROLLBACK_BACKUP='${T16_DIR}/prod/backups/pre_rollback_backup_test_t16'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T16_DIR}/prod/dist_pre_rollback_test_t16'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  handle_rollback_failure 'Rollback recovery with DB disconnected'
" > "${T16_DIR}/rb_rec_health_fail.log" 2>&1
T16_EXIT=$?
unset HEALTH_DB_DISCONNECTED
set -e

if [ "${T16_EXIT}" -ne 0 ] && grep -q "Backend Health:.*FAILED" "${T16_DIR}/rb_rec_health_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T16_DIR}/rb_rec_health_fail.log"; then
  record_test "Test 16: Rollback recovery health failure (DB disconnected) reported as FAILED" 1 "${T16_EXIT}"
else
  record_test "Test 16: Rollback recovery health failure (DB disconnected) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 17: Rollback Recovery Failure Scenario - Frontend Root Inaccessible
# ------------------------------------------------------------------------------
T17_DIR="${TEST_ROOT}/t17"
setup_mock_env "${T17_DIR}"

set +e
export FRONTEND_HTTPS_FAIL="true"
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T17_DIR}/prod'
  TIMESTAMP='test_t17'
  PRE_ROLLBACK_BACKUP='${T17_DIR}/prod/backups/pre_rollback_backup_test_t17'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T17_DIR}/prod/dist_pre_rollback_test_t17'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  handle_rollback_failure 'Rollback recovery with frontend HTTPS down'
" > "${T17_DIR}/rb_rec_root_fail.log" 2>&1
T17_EXIT=$?
unset FRONTEND_HTTPS_FAIL
set -e

if [ "${T17_EXIT}" -ne 0 ] && grep -q "Frontend root endpoint.*unreachable" "${T17_DIR}/rb_rec_root_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T17_DIR}/rb_rec_root_fail.log"; then
  record_test "Test 17: Rollback recovery health failure (Frontend root inaccessible) reported as FAILED" 1 "${T17_EXIT}"
else
  record_test "Test 17: Rollback recovery health failure (Frontend root inaccessible) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 18: Rollback Recovery Failure Scenario - Restored Version Mismatch
# ------------------------------------------------------------------------------
T18_DIR="${TEST_ROOT}/t18"
setup_mock_env "${T18_DIR}"

set +e
export REMOTE_VERSION_MISMATCH="true"
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T18_DIR}/prod'
  TIMESTAMP='test_t18'
  PRE_ROLLBACK_BACKUP='${T18_DIR}/prod/backups/pre_rollback_backup_test_t18'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T18_DIR}/prod/dist_pre_rollback_test_t18'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/regulationResolver.js\"
  echo 'console.log(\"valid\");' > \"\${PRE_ROLLBACK_BACKUP}/src/utils/academicProgrammes.js\"
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  handle_rollback_failure 'Rollback recovery with version mismatch'
" > "${T18_DIR}/rb_rec_ver_fail.log" 2>&1
T18_EXIT=$?
unset REMOTE_VERSION_MISMATCH
set -e

if [ "${T18_EXIT}" -ne 0 ] && grep -q "Remote version mismatch" "${T18_DIR}/rb_rec_ver_fail.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T18_DIR}/rb_rec_ver_fail.log"; then
  record_test "Test 18: Rollback recovery health failure (Version mismatch) reported as FAILED" 1 "${T18_EXIT}"
else
  record_test "Test 18: Rollback recovery health failure (Version mismatch) reported as FAILED" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 19: Rollback PM2 Reload Failure During Health Verification Phase
# ------------------------------------------------------------------------------
T19_DIR="${TEST_ROOT}/t19"
setup_mock_env "${T19_DIR}"
CALC_SHA="$(sha256sum "${T19_DIR}/release.tar.gz" | awk '{print $1}')"
export MOCK_FRONTEND_VER="2.0.test"
PROD_DIR="${T19_DIR}/prod" RELEASE_TAR="${T19_DIR}/release.tar.gz" EXPECTED_SHA256="${CALC_SHA}" bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" >/dev/null 2>&1
unset MOCK_FRONTEND_VER

BACKUP_PATH="$(ls -d "${T19_DIR}/prod/backups/pg_r2025_backup_"* | head -n 1)"
DIST_PREV_PATH="$(ls -d "${T19_DIR}/prod/dist_prev_"* | head -n 1)"

set +e
export PM2_FAIL_RELOAD="true"
PROD_DIR="${T19_DIR}/prod" bash "${SCRATCH_DIR}/rollback_pg_r2025.sh" "${BACKUP_PATH}" "${DIST_PREV_PATH}" > "${T19_DIR}/rb_pm2_fail.log" 2>&1
T19_EXIT=$?
unset PM2_FAIL_RELOAD
set -e

if [ "${T19_EXIT}" -ne 0 ] && grep -q "CRITICAL" "${T19_DIR}/rb_pm2_fail.log"; then
  record_test "Test 19: Rollback PM2 reload failure reported as critical without silent ignore" 1 "${T19_EXIT}"
else
  record_test "Test 19: Rollback PM2 reload failure reported as critical without silent ignore" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 20: Recovery Snapshot Itself Corrupted / Missing
# ------------------------------------------------------------------------------
T20_DIR="${TEST_ROOT}/t20"
setup_mock_env "${T20_DIR}"
set +e
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  PROD_DIR='${T20_DIR}/prod'
  TIMESTAMP='test_t20'
  PRE_ROLLBACK_BACKUP='${T20_DIR}/prod/backups/pre_rollback_backup_test_t20'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest_missing.txt\"
  PRE_ROLLBACK_DIST='${T20_DIR}/prod/dist_pre_rollback_missing'

  handle_rollback_failure 'Simulated recovery snapshot failure'
" > "${T20_DIR}/rb_corrupted_snapshot.log" 2>&1
T20_EXIT=$?
set -e

if [ "${T20_EXIT}" -ne 0 ] && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T20_DIR}/rb_corrupted_snapshot.log"; then
  record_test "Test 20: Corrupted recovery snapshot reported as PARTIAL or FAILED without claiming success" 1 "${T20_EXIT}"
else
  record_test "Test 20: Corrupted recovery snapshot reported as PARTIAL or FAILED without claiming success" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 21: Full Successful Rollback Flow
# ------------------------------------------------------------------------------
T21_DIR="${TEST_ROOT}/t21"
setup_mock_env "${T21_DIR}"
CALC_SHA="$(sha256sum "${T21_DIR}/release.tar.gz" | awk '{print $1}')"
export MOCK_FRONTEND_VER="2.0.test"
PROD_DIR="${T21_DIR}/prod" RELEASE_TAR="${T21_DIR}/release.tar.gz" EXPECTED_SHA256="${CALC_SHA}" bash "${SCRATCH_DIR}/deploy_pg_r2025.sh" >/dev/null 2>&1
unset MOCK_FRONTEND_VER

BACKUP_PATH="$(ls -d "${T21_DIR}/prod/backups/pg_r2025_backup_"* | head -n 1)"
DIST_PREV_PATH="$(ls -d "${T21_DIR}/prod/dist_prev_"* | head -n 1)"

export MOCK_FRONTEND_VER="1.0.old"
set +e
PROD_DIR="${T21_DIR}/prod" bash "${SCRATCH_DIR}/rollback_pg_r2025.sh" "${BACKUP_PATH}" "${DIST_PREV_PATH}" > "${T21_DIR}/rollback.log" 2>&1
T21_EXIT=$?
unset MOCK_FRONTEND_VER
set -e

ORIG_MARKS_RESTORED=false
PG_REG_REMOVED=false
ORIG_DIST_RESTORED=false
PRE_RB_SNAPSHOT_EXISTS=false

if grep -q "original marks.js" "${T21_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  ORIG_MARKS_RESTORED=true
fi
if [ ! -f "${T21_DIR}/prod/src/utils/pgRegulation2025.js" ]; then
  PG_REG_REMOVED=true
fi
if grep -q "1.0.old" "${T21_DIR}/prod/dist/version.json" 2>/dev/null; then
  ORIG_DIST_RESTORED=true
fi
if ls -d "${T21_DIR}/prod/backups/pre_rollback_backup_"* >/dev/null 2>&1; then
  PRE_RB_SNAPSHOT_EXISTS=true
fi

if [ "${T21_EXIT}" -eq 0 ] && [ "${ORIG_MARKS_RESTORED}" = "true" ] && [ "${PG_REG_REMOVED}" = "true" ] && [ "${ORIG_DIST_RESTORED}" = "true" ] && [ "${PRE_RB_SNAPSHOT_EXISTS}" = "true" ]; then
  record_test "Test 21: Clean rollback executed successfully, pre-deployment state restored, and snapshot preserved" 0 "${T21_EXIT}"
else
  record_test "Test 21: Clean rollback executed successfully, pre-deployment state restored, and snapshot preserved" 0 1
fi

# ------------------------------------------------------------------------------
# TEST 22: Recovery Manifest Validation - Missing Entry Rejected
# ------------------------------------------------------------------------------
T22_DIR="${TEST_ROOT}/t22"
setup_mock_env "${T22_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T22_DIR}/prod'
  TIMESTAMP='test_t22'
  BACKUP_DIR='${T22_DIR}/prod/backups/pg_r2025_backup_test_t22'
  DIST_PREV='${T22_DIR}/prod/dist_prev_test_t22'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"

  # Missing academicProgrammes.js entry (only 3 entries)
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  # Faulty state in prod
  echo 'corrupt marks' > '${T22_DIR}/prod/server/routes/marks.js'

  execute_full_recovery 'Trigger recovery with missing manifest entry'
" > "${T22_DIR}/recov_missing.log" 2>&1
T22_EXIT=$?
set -e

# Backend restoration must NOT have been performed
T22_MARKS_UNTOUCHED=false
if grep -q "corrupt marks" "${T22_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  T22_MARKS_UNTOUCHED=true
fi

if [ "${T22_EXIT}" -ne 0 ] && grep -q "Missing required path in recovery manifest" "${T22_DIR}/recov_missing.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T22_DIR}/recov_missing.log" && [ "${T22_MARKS_UNTOUCHED}" = "true" ]; then
  record_test "Test 22: Recovery manifest with missing entry rejected without restoring backend files" 1 "${T22_EXIT}"
else
  record_test "Test 22: Recovery manifest with missing entry rejected without restoring backend files" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 23: Recovery Manifest Validation - Duplicate Entry Rejected
# ------------------------------------------------------------------------------
T23_DIR="${TEST_ROOT}/t23"
setup_mock_env "${T23_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T23_DIR}/prod'
  TIMESTAMP='test_t23'
  BACKUP_DIR='${T23_DIR}/prod/backups/pg_r2025_backup_test_t23'
  DIST_PREV='${T23_DIR}/prod/dist_prev_test_t23'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original acadProg.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"

  # Duplicate entry for marks.js
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  echo 'corrupt marks' > '${T23_DIR}/prod/server/routes/marks.js'

  execute_full_recovery 'Trigger recovery with duplicate manifest entry'
" > "${T23_DIR}/recov_duplicate.log" 2>&1
T23_EXIT=$?
set -e

T23_MARKS_UNTOUCHED=false
if grep -q "corrupt marks" "${T23_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  T23_MARKS_UNTOUCHED=true
fi

if [ "${T23_EXIT}" -ne 0 ] && grep -q "Duplicate entry in recovery manifest" "${T23_DIR}/recov_duplicate.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T23_DIR}/recov_duplicate.log" && [ "${T23_MARKS_UNTOUCHED}" = "true" ]; then
  record_test "Test 23: Recovery manifest with duplicate entry rejected without restoring backend files" 1 "${T23_EXIT}"
else
  record_test "Test 23: Recovery manifest with duplicate entry rejected without restoring backend files" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 24: Recovery Manifest Validation - Unexpected Path / Path Traversal Rejected
# ------------------------------------------------------------------------------
T24_DIR="${TEST_ROOT}/t24"
setup_mock_env "${T24_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T24_DIR}/prod'
  TIMESTAMP='test_t24'
  BACKUP_DIR='${T24_DIR}/prod/backups/pg_r2025_backup_test_t24'
  DIST_PREV='${T24_DIR}/prod/dist_prev_test_t24'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"

  # Path traversal entry
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:../../etc/shadow
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  echo 'corrupt marks' > '${T24_DIR}/prod/server/routes/marks.js'

  execute_full_recovery 'Trigger recovery with path traversal in manifest'
" > "${T24_DIR}/recov_traversal.log" 2>&1
T24_EXIT=$?
set -e

T24_MARKS_UNTOUCHED=false
if grep -q "corrupt marks" "${T24_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  T24_MARKS_UNTOUCHED=true
fi

if [ "${T24_EXIT}" -ne 0 ] && grep -q "Forbidden path (absolute or path traversal) in recovery manifest" "${T24_DIR}/recov_traversal.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T24_DIR}/recov_traversal.log" && [ "${T24_MARKS_UNTOUCHED}" = "true" ]; then
  record_test "Test 24: Recovery manifest with path traversal rejected without restoring backend files" 1 "${T24_EXIT}"
else
  record_test "Test 24: Recovery manifest with path traversal rejected without restoring backend files" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 25: Recovery Manifest Validation - Invalid Manifest Status Rejected
# ------------------------------------------------------------------------------
T25_DIR="${TEST_ROOT}/t25"
setup_mock_env "${T25_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T25_DIR}/prod'
  TIMESTAMP='test_t25'
  BACKUP_DIR='${T25_DIR}/prod/backups/pg_r2025_backup_test_t25'
  DIST_PREV='${T25_DIR}/prod/dist_prev_test_t25'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"

  # Invalid status: CORRUPT instead of EXISTS or ABSENT
  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
CORRUPT:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  echo 'corrupt marks' > '${T25_DIR}/prod/server/routes/marks.js'

  execute_full_recovery 'Trigger recovery with invalid manifest status'
" > "${T25_DIR}/recov_bad_status.log" 2>&1
T25_EXIT=$?
set -e

T25_MARKS_UNTOUCHED=false
if grep -q "corrupt marks" "${T25_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  T25_MARKS_UNTOUCHED=true
fi

if [ "${T25_EXIT}" -ne 0 ] && grep -q "Invalid manifest entry format in recovery manifest" "${T25_DIR}/recov_bad_status.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T25_DIR}/recov_bad_status.log" && [ "${T25_MARKS_UNTOUCHED}" = "true" ]; then
  record_test "Test 25: Recovery manifest with invalid status rejected without restoring backend files" 1 "${T25_EXIT}"
else
  record_test "Test 25: Recovery manifest with invalid status rejected without restoring backend files" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 26: Recovery Manifest Validation - Valid Manifest Restores Successfully
# ------------------------------------------------------------------------------
T26_DIR="${TEST_ROOT}/t26"
setup_mock_env "${T26_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/deploy_pg_r2025.sh' --functions-only
  export PROD_DIR='${T26_DIR}/prod'
  TIMESTAMP='test_t26'
  BACKUP_DIR='${T26_DIR}/prod/backups/pg_r2025_backup_test_t26'
  DIST_PREV='${T26_DIR}/prod/dist_prev_test_t26'
  STAGE_DIR='${T26_DIR}/stage_t26'
  mkdir -p \"\${BACKUP_DIR}/server/routes\" \"\${BACKUP_DIR}/src/utils\" \"\${DIST_PREV}\"
  echo 'console.log(\"original marks.js\");' > \"\${BACKUP_DIR}/server/routes/marks.js\"
  echo 'console.log(\"original regulationResolver.js\");' > \"\${BACKUP_DIR}/src/utils/regulationResolver.js\"
  echo 'console.log(\"original academicProgrammes.js\");' > \"\${BACKUP_DIR}/src/utils/academicProgrammes.js\"

  cat << 'EOF' > \"\${BACKUP_DIR}/manifest.txt\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:src/utils/academicProgrammes.js
EOF
  echo '<html>Original</html>' > \"\${DIST_PREV}/index.html\"
  echo '{\"version\":\"1.0.old\",\"buildTime\":11111}' > \"\${DIST_PREV}/version.json\"

  # Faulty state in prod
  mkdir -p '${T26_DIR}/prod/dist'
  echo 'faulty' > '${T26_DIR}/prod/dist/version.json'
  echo 'faulty marks' > '${T26_DIR}/prod/server/routes/marks.js'
  touch '${T26_DIR}/prod/src/utils/pgRegulation2025.js'

  execute_full_recovery 'Trigger recovery with 100% valid manifest'
" > "${T26_DIR}/recov_valid.log" 2>&1
T26_EXIT=$?
set -e

T26_RESTORED_OK=false
if grep -q "original marks.js" "${T26_DIR}/prod/server/routes/marks.js" 2>/dev/null && \
   [ ! -f "${T26_DIR}/prod/src/utils/pgRegulation2025.js" ] && \
   grep -q "1.0.old" "${T26_DIR}/prod/dist/version.json" 2>/dev/null; then
  T26_RESTORED_OK=true
fi

if [ "${T26_EXIT}" -ne 0 ] && grep -q "RECOVERY SUCCESS" "${T26_DIR}/recov_valid.log" && [ "${T26_RESTORED_OK}" = "true" ]; then
  record_test "Test 26: Valid recovery manifest restored all backend files, cleaned uncommitted files, and reported RECOVERY SUCCESS" 1 "${T26_EXIT}"
else
  record_test "Test 26: Valid recovery manifest restored all backend files, cleaned uncommitted files, and reported RECOVERY SUCCESS" 1 0
fi

# ------------------------------------------------------------------------------
# TEST 27: Rollback Failure Recovery Manifest Validation - Tampered Manifest Rejection
# ------------------------------------------------------------------------------
T27_DIR="${TEST_ROOT}/t27"
setup_mock_env "${T27_DIR}"

set +e
bash -c "
  source '${SCRATCH_DIR}/rollback_pg_r2025.sh' --functions-only
  export PROD_DIR='${T27_DIR}/prod'
  TIMESTAMP='test_t27'
  PRE_ROLLBACK_BACKUP='${T27_DIR}/prod/backups/pre_rollback_backup_test_t27'
  PRE_MANIFEST_FILE=\"\${PRE_ROLLBACK_BACKUP}/pre_manifest.txt\"
  PRE_ROLLBACK_DIST='${T27_DIR}/prod/dist_pre_rollback_test_t27'
  mkdir -p \"\${PRE_ROLLBACK_DIST}\" \"\${PRE_ROLLBACK_BACKUP}/server/routes\" \"\${PRE_ROLLBACK_BACKUP}/src/utils\"
  echo 'console.log(\"valid marks\");' > \"\${PRE_ROLLBACK_BACKUP}/server/routes/marks.js\"

  # Malformed manifest: unexpected file
  cat << 'EOF' > \"\${PRE_MANIFEST_FILE}\"
EXISTS:server/routes/marks.js
EXISTS:src/utils/regulationResolver.js
ABSENT:src/utils/pgRegulation2025.js
EXISTS:server/routes/unauthorized_injection.js
EOF
  echo '<html>Pre-RB</html>' > \"\${PRE_ROLLBACK_DIST}/index.html\"
  echo '{\"version\":\"pre.rb\",\"buildTime\":1}' > \"\${PRE_ROLLBACK_DIST}/version.json\"

  echo 'corrupt marks' > '${T27_DIR}/prod/server/routes/marks.js'

  handle_rollback_failure 'Rollback recovery with tampered pre-rollback manifest'
" > "${T27_DIR}/rb_recov_tampered.log" 2>&1
T27_EXIT=$?
set -e

T27_MARKS_UNTOUCHED=false
if grep -q "corrupt marks" "${T27_DIR}/prod/server/routes/marks.js" 2>/dev/null; then
  T27_MARKS_UNTOUCHED=true
fi

if [ "${T27_EXIT}" -ne 0 ] && grep -q "Unexpected path in pre-rollback manifest" "${T27_DIR}/rb_recov_tampered.log" && grep -q "CRITICAL ALERT.*PARTIAL or FAILED" "${T27_DIR}/rb_recov_tampered.log" && [ "${T27_MARKS_UNTOUCHED}" = "true" ]; then
  record_test "Test 27: Rollback failure recovery rejected tampered manifest without restoring backend files" 1 "${T27_EXIT}"
else
  record_test "Test 27: Rollback failure recovery rejected tampered manifest without restoring backend files" 1 0
fi

echo ""
echo "=========================================================================="
echo "SIMULATION TEST SUMMARY: Passed ${PASS_COUNT} / $((PASS_COUNT + FAIL_COUNT)) tests."
echo "=========================================================================="
if [ "${FAIL_COUNT}" -gt 0 ]; then
  exit 1
fi
exit 0
