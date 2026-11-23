#!/usr/bin/env bash
# ==============================================================================
# MarkHub PG R2025 Production Deployment Script
# Target: /var/www/markhub
# Commit: 373012e28d429e122c397661f85aee161bad0cfa
# ==============================================================================
set -Eeuo pipefail

PROD_DIR="${PROD_DIR:-/var/www/markhub}"
RELEASE_TAR="${RELEASE_TAR:-/tmp/markhub_pg_r2025_release_full.tar.gz}"
EXPECTED_SHA256="${EXPECTED_SHA256:-5e3370066fd9f707b77b575a22a90f181bc3a3a94166dfa16f8721615f4dc804}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
STAGE_DIR="/tmp/markhub_stage_${TIMESTAMP}_$$"
BACKUP_DIR="${PROD_DIR}/backups/pg_r2025_backup_${TIMESTAMP}"
DIST_PREV="${PROD_DIR}/dist_prev_${TIMESTAMP}"

APPROVED_BACKEND_FILES=(
  "server/routes/marks.js"
  "src/utils/regulationResolver.js"
  "src/utils/pgRegulation2025.js"
  "src/utils/academicProgrammes.js"
)

# Explicitly track temporary files created by this run for deterministic cleanup
TRACKED_TMP_FILES=()

cleanup_tracked_tmp_files() {
  for tmp_file in "${TRACKED_TMP_FILES[@]:-}"; do
    if [ -n "${tmp_file}" ] && [ -f "${tmp_file}" ]; then
      rm -f "${tmp_file}"
    fi
  done
}

validate_dist_directory() {
  local target_dir="$1"
  if [ ! -d "${target_dir}" ]; then
    echo "[FATAL] Directory not found: ${target_dir}" >&2
    return 1
  fi
  if [ ! -s "${target_dir}/index.html" ]; then
    echo "[FATAL] Missing or empty index.html in: ${target_dir}" >&2
    return 1
  fi
  if [ ! -s "${target_dir}/version.json" ]; then
    echo "[FATAL] Missing or empty version.json in: ${target_dir}" >&2
    return 1
  fi
  cat "${target_dir}/version.json" | node -e "
    try {
      const v = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      if (!v || typeof v !== 'object' || !v.version || !v.buildTime) {
        process.exit(1);
      }
    } catch (e) {
      process.exit(1);
    }
  " || {
    echo "[FATAL] Invalid version.json in: ${target_dir}" >&2
    return 1
  }
  return 0
}

validate_release_archive_paths() {
  local archive="$1"
  echo "Inspecting release archive paths before extraction..."
  while IFS= read -r raw_entry || [ -n "${raw_entry}" ]; do
    local entry="$(echo "${raw_entry}" | tr -d '\r' | xargs)"
    [ -z "${entry}" ] && continue

    # Strip leading ./
    entry="${entry#./}"
    [ -z "${entry}" ] && continue

    # Reject absolute paths or path traversal
    if [[ "${entry}" = /* ]] || [[ "${entry}" =~ \.\. ]]; then
      echo "[FATAL] Forbidden path in release archive: '${raw_entry}'" >&2
      return 1
    fi

    local clean_entry="${entry%/}"
    [ -z "${clean_entry}" ] && continue
    [ "${clean_entry}" = "." ] && continue

    # Must be dist/ or under dist/, or match one of the 4 approved backend files
    if [[ "${entry}" == dist/* ]] || [ "${clean_entry}" = "dist" ]; then
      continue
    fi

    # Allow approved parent directories (e.g. server, server/routes, src, src/utils)
    local is_approved_dir=false
    for app_path in "${APPROVED_BACKEND_FILES[@]}"; do
      if [[ "${app_path}" == "${clean_entry}/"* ]]; then
        is_approved_dir=true
        break
      fi
    done
    if [ "${is_approved_dir}" = "true" ]; then
      continue
    fi

    local approved=false
    for app_path in "${APPROVED_BACKEND_FILES[@]}"; do
      if [ "${clean_entry}" = "${app_path}" ]; then
        approved=true
        break
      fi
    done

    if [ "${approved}" != "true" ]; then
      echo "[FATAL] Unexpected entry in release archive: '${raw_entry}' (rejected before extraction)" >&2
      return 1
    fi
  done < <(tar -tf "${archive}")

  echo "Release archive contents verified: only approved backend files and dist present."
  return 0
}

# ------------------------------------------------------------------------------
# Robust Automatic Deployment Recovery Handler
# ------------------------------------------------------------------------------
execute_full_recovery() {
  local reason="${1:-Unknown deployment failure}"
  echo ""
  echo "=========================================================================="
  echo "[DEPLOYMENT FAILED]: ${reason}"
  echo "Initiating automatic recovery to restore production state..."
  echo "=========================================================================="

  # Disarm trap to prevent recursive recovery
  trap - ERR

  local ALL_BACKEND_RESTORED=true
  local FRONTEND_RESTORED=true
  local PM2_RELOAD_SUCCESS=true
  local RESTORED_FILES=()
  local FAILED_RESTORE_FILES=()
  local FAILED_DIST_DIR=""

  # 1. Clean up temporary swap files created by this deployment execution
  cleanup_tracked_tmp_files

  # 2. Frontend dist recovery with strict destination protection
  if [ -d "${DIST_PREV}" ]; then
    FAILED_DIST_DIR="${PROD_DIR}/dist_failed_${TIMESTAMP}_$$"
    local dist_quarantined=false

    if [ -d "${PROD_DIR}/dist" ]; then
      if mv "${PROD_DIR}/dist" "${FAILED_DIST_DIR}"; then
        echo "[RECOVERY] Quarantined failed new dist to: ${FAILED_DIST_DIR}"
        dist_quarantined=true
      else
        echo "[CRITICAL FAILURE] Could not quarantine faulty dist from ${PROD_DIR}/dist!" >&2
        echo "  Preserving ${PROD_DIR}/dist as-is. Will NOT attempt to overwrite with ${DIST_PREV}." >&2
        FRONTEND_RESTORED=false
      fi
    else
      # ${PROD_DIR}/dist does not exist (cleanly absent)
      dist_quarantined=true
    fi

    # ONLY restore DIST_PREV if the destination is verified absent
    if [ "${dist_quarantined}" = "true" ] && [ ! -e "${PROD_DIR}/dist" ]; then
      if mv "${DIST_PREV}" "${PROD_DIR}/dist"; then
        if validate_dist_directory "${PROD_DIR}/dist"; then
          echo "[RECOVERY] Successfully restored previous working dist to: ${PROD_DIR}/dist"
        else
          echo "[CRITICAL FAILURE] Restored dist in ${PROD_DIR}/dist failed validation!" >&2
          FRONTEND_RESTORED=false
        fi
      else
        echo "[CRITICAL FAILURE] Failed to move ${DIST_PREV} to ${PROD_DIR}/dist!" >&2
        FRONTEND_RESTORED=false
      fi
    elif [ -e "${PROD_DIR}/dist" ]; then
      echo "[CRITICAL FAILURE] ${PROD_DIR}/dist still exists; refusing to overwrite uncertain destination!" >&2
      FRONTEND_RESTORED=false
    fi
  else
    # DIST_PREV was never created (failure occurred before dist swap)
    if [ -d "${PROD_DIR}/dist" ]; then
      if validate_dist_directory "${PROD_DIR}/dist"; then
        echo "[RECOVERY] Original dist was not swapped and remains valid."
      else
        echo "[CRITICAL FAILURE] Production dist invalid and DIST_PREV not found!" >&2
        FRONTEND_RESTORED=false
      fi
    else
      echo "[CRITICAL FAILURE] Production dist is completely absent!" >&2
      FRONTEND_RESTORED=false
    fi
  fi

  # 3. Backend files recovery from manifest via atomic temporary swap
  MANIFEST_FILE="${BACKUP_DIR}/manifest.txt"
  if [ -f "${MANIFEST_FILE}" ] && [ -s "${MANIFEST_FILE}" ]; then
    declare -A RECOV_MAP=()
    local recov_entry_count=0
    local manifest_valid=true

    while IFS= read -r raw_line || [ -n "${raw_line}" ]; do
      local line="$(echo "${raw_line}" | tr -d '\r' | xargs)"
      [ -z "${line}" ] && continue

      # Format must strictly be STATUS:PATH with only EXISTS or ABSENT
      if [[ ! "${line}" =~ ^(EXISTS|ABSENT):([^:]+)$ ]]; then
        echo "[CRITICAL FAILURE] Invalid manifest entry format in recovery manifest: '${line}'" >&2
        manifest_valid=false
        break
      fi

      local status="${BASH_REMATCH[1]}"
      local rel_path="${BASH_REMATCH[2]}"

      # Reject absolute paths or path traversal (..)
      if [[ "${rel_path}" = /* ]] || [[ "${rel_path}" =~ \.\. ]]; then
        echo "[CRITICAL FAILURE] Forbidden path (absolute or path traversal) in recovery manifest: '${rel_path}'" >&2
        manifest_valid=false
        break
      fi

      # Must match one of the 4 approved backend files
      local is_approved=false
      for expected in "${APPROVED_BACKEND_FILES[@]}"; do
        if [ "${rel_path}" = "${expected}" ]; then
          is_approved=true
          break
        fi
      done

      if [ "${is_approved}" != "true" ]; then
        echo "[CRITICAL FAILURE] Unexpected path in recovery manifest: '${rel_path}' (only 4 approved backend files allowed)" >&2
        manifest_valid=false
        break
      fi

      # Reject duplicate entries
      if [ -n "${RECOV_MAP[${rel_path}]:-}" ]; then
        echo "[CRITICAL FAILURE] Duplicate entry in recovery manifest for path: '${rel_path}'" >&2
        manifest_valid=false
        break
      fi

      RECOV_MAP["${rel_path}"]="${status}"
      recov_entry_count=$((recov_entry_count + 1))
    done < "${MANIFEST_FILE}"

    # Require EXACTLY all 4 approved paths
    if [ "${manifest_valid}" = "true" ]; then
      for expected in "${APPROVED_BACKEND_FILES[@]}"; do
        if [ -z "${RECOV_MAP[${expected}]:-}" ]; then
          echo "[CRITICAL FAILURE] Missing required path in recovery manifest: '${expected}'" >&2
          manifest_valid=false
          break
        fi
      done
      if [ "${manifest_valid}" = "true" ] && [ "${recov_entry_count}" -ne "${#APPROVED_BACKEND_FILES[@]}" ]; then
        echo "[CRITICAL FAILURE] Recovery manifest entry count mismatch! Expected ${#APPROVED_BACKEND_FILES[@]}, found ${recov_entry_count}" >&2
        manifest_valid=false
      fi
    fi

    if [ "${manifest_valid}" != "true" ]; then
      echo "[CRITICAL FAILURE] Recovery manifest validation failed for ${MANIFEST_FILE}! Aborting backend restoration." >&2
      FAILED_RESTORE_FILES+=("Recovery manifest validation failed (${MANIFEST_FILE}) - backend restoration aborted")
      ALL_BACKEND_RESTORED=false
    else
      # Manifest is valid: proceed with restoring backend files
      for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
        local status="${RECOV_MAP[${rel_path}]}"
        local target_file="${PROD_DIR}/${rel_path}"
        local backup_file="${BACKUP_DIR}/${rel_path}"
        local target_dir="$(dirname "${target_file}")"

        if [ "${status}" = "EXISTS" ]; then
          if [ -s "${backup_file}" ]; then
            mkdir -p "${target_dir}"
            local TMP_RECOV="${target_file}.tmp.recov.${TIMESTAMP}_$$"
            TRACKED_TMP_FILES+=("${TMP_RECOV}")

            if cp -p "${backup_file}" "${TMP_RECOV}" && \
               chmod --reference="${backup_file}" "${TMP_RECOV}" 2>/dev/null && \
               chown --reference="${backup_file}" "${TMP_RECOV}" 2>/dev/null && \
               mv -f "${TMP_RECOV}" "${target_file}" && \
               node --check "${target_file}" >/dev/null 2>&1; then
              RESTORED_FILES+=("${rel_path} (restored from backup and validated)")
            else
              FAILED_RESTORE_FILES+=("${rel_path} (restore or syntax check failed)")
              ALL_BACKEND_RESTORED=false
            fi
          else
            FAILED_RESTORE_FILES+=("${rel_path} (backup file missing or empty in ${BACKUP_DIR})")
            ALL_BACKEND_RESTORED=false
          fi
        elif [ "${status}" = "ABSENT" ]; then
          if [ -f "${target_file}" ]; then
            if rm -f "${target_file}"; then
              RESTORED_FILES+=("${rel_path} (removed uncommitted file)")
            else
              FAILED_RESTORE_FILES+=("${rel_path} (failed to remove uncommitted file)")
              ALL_BACKEND_RESTORED=false
            fi
          else
            RESTORED_FILES+=("${rel_path} (confirmed absent)")
          fi
        fi
      done
    fi
  else
    echo "[CRITICAL FAILURE] Manifest file missing or empty in backup directory: ${MANIFEST_FILE:-empty}" >&2
    FAILED_RESTORE_FILES+=("Manifest file missing or empty in backup: ${MANIFEST_FILE:-empty}")
    ALL_BACKEND_RESTORED=false
  fi

  cleanup_tracked_tmp_files

  # 4. Reload markhub-server and verify health
  echo "[RECOVERY] Reloading PM2 markhub-server..."
  if ! pm2 reload markhub-server; then
    echo "[CRITICAL FAILURE] 'pm2 reload markhub-server' failed during recovery!" >&2
    PM2_RELOAD_SUCCESS=false
  fi

  sleep 3

  # Post-recovery health verification variables
  local PM2_ONLINE=false
  local BACKEND_HEALTH_OK=false
  local FRONTEND_ACCESSIBLE=false
  local VERSION_MATCH_OK=false
  local RESTORED_VER="unknown"

  if [ "${PM2_RELOAD_SUCCESS}" = "true" ]; then
    echo "[RECOVERY] Verifying PM2 process markhub-server is online..."
    if pm2 show markhub-server 2>/dev/null | grep -i 'status' | grep -q 'online'; then
      PM2_ONLINE=true
      echo "[RECOVERY] PM2 process markhub-server confirmed online."
    else
      echo "[CRITICAL FAILURE] PM2 markhub-server is not in 'online' state after reload!" >&2
    fi
  fi

  echo "[RECOVERY] Verifying backend health on https://markhub.nscet.org/api/health..."
  local recovery_health_json=""
  if recovery_health_json="$(curl -fsS --max-time 10 https://markhub.nscet.org/api/health 2>&1)"; then
    if node -e "
      const data = JSON.parse(process.argv[1]);
      if (data.status !== 'ok' || data.database !== 'connected') process.exit(1);
    " "${recovery_health_json}" 2>/dev/null; then
      BACKEND_HEALTH_OK=true
      echo "[RECOVERY] Backend health verified: status=ok, database=connected."
    else
      echo "[CRITICAL FAILURE] Backend health check reported unhealthy state or database disconnected!" >&2
    fi
  else
    echo "[CRITICAL FAILURE] Backend health endpoint https://markhub.nscet.org/api/health unreachable during recovery!" >&2
  fi

  echo "[RECOVERY] Verifying frontend root access on https://markhub.nscet.org/..."
  if curl -fsS -o /dev/null --max-time 15 https://markhub.nscet.org/; then
    FRONTEND_ACCESSIBLE=true
    echo "[RECOVERY] Frontend root access verified."
  else
    echo "[CRITICAL FAILURE] Frontend root endpoint https://markhub.nscet.org/ unreachable or returned HTTP error!" >&2
  fi

  echo "[RECOVERY] Verifying restored version on https://markhub.nscet.org/version.json..."
  if [ -f "${PROD_DIR}/dist/version.json" ]; then
    RESTORED_VER="$(cat "${PROD_DIR}/dist/version.json" | node -e "try { console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).version); } catch(e) { process.exit(1); }" 2>/dev/null || echo "invalid")"
  fi

  local remote_ver_json=""
  if remote_ver_json="$(curl -fsS --max-time 15 https://markhub.nscet.org/version.json 2>&1)"; then
    if node -e "
      const remote = JSON.parse(process.argv[1]);
      const expected = process.argv[2];
      if (!remote || !expected || expected === 'invalid' || remote.version !== expected) process.exit(1);
    " "${remote_ver_json}" "${RESTORED_VER}" 2>/dev/null; then
      VERSION_MATCH_OK=true
      echo "[RECOVERY] Restored frontend version verified: ${RESTORED_VER}."
    else
      echo "[CRITICAL FAILURE] Remote version mismatch: expected ${RESTORED_VER}!" >&2
    fi
  else
    echo "[CRITICAL FAILURE] Could not fetch https://markhub.nscet.org/version.json during recovery!" >&2
  fi

  # 5. Clean up staging directory only
  if [ -n "${STAGE_DIR:-}" ] && [ -d "${STAGE_DIR}" ]; then
    rm -rf "${STAGE_DIR}"
  fi

  # 6. Comprehensive recovery report
  local RECOVERY_VERIFIED=false
  if [ "${ALL_BACKEND_RESTORED}" = "true" ] && \
     [ "${FRONTEND_RESTORED}" = "true" ] && \
     [ "${PM2_RELOAD_SUCCESS}" = "true" ] && \
     [ "${PM2_ONLINE}" = "true" ] && \
     [ "${BACKEND_HEALTH_OK}" = "true" ] && \
     [ "${FRONTEND_ACCESSIBLE}" = "true" ] && \
     [ "${VERSION_MATCH_OK}" = "true" ]; then
    RECOVERY_VERIFIED=true
  fi

  echo ""
  echo "=========================================================================="
  if [ "${RECOVERY_VERIFIED}" = "true" ]; then
    echo "[RECOVERY SUCCESS]: Production state was successfully restored and verified."
  else
    echo "[CRITICAL ALERT]: Production recovery was PARTIAL or FAILED!"
    echo "  Immediate manual investigation required."
  fi
  echo "--------------------------------------------------------------------------"
  echo "Restoration Details:"
  if [ "${#RESTORED_FILES[@]}" -gt 0 ]; then
    echo "Successfully Restored Files:"
    for rf in "${RESTORED_FILES[@]}"; do
      echo "  [OK]   ${rf}"
    done
  fi
  if [ "${#FAILED_RESTORE_FILES[@]}" -gt 0 ]; then
    echo "Failed Backend Restorations:"
    for ff in "${FAILED_RESTORE_FILES[@]}"; do
      echo "  [FAIL] ${ff}"
    done
  fi
  echo "Frontend Disk Status:  $([ "${FRONTEND_RESTORED}" = "true" ] && echo "RESTORED" || echo "FAILED")"
  echo "PM2 Reload Status:     $([ "${PM2_RELOAD_SUCCESS}" = "true" ] && echo "SUCCESS" || echo "FAILED")"
  echo "PM2 Process Status:    $([ "${PM2_ONLINE}" = "true" ] && echo "ONLINE" || echo "OFFLINE / FAILED")"
  echo "Backend Health:        $([ "${BACKEND_HEALTH_OK}" = "true" ] && echo "OK (database connected)" || echo "FAILED")"
  echo "Frontend Access:       $([ "${FRONTEND_ACCESSIBLE}" = "true" ] && echo "ACCESSIBLE" || echo "FAILED")"
  echo "Version Parity:        $([ "${VERSION_MATCH_OK}" = "true" ] && echo "VERIFIED (${RESTORED_VER})" || echo "FAILED")"
  echo "Backup Directory:      ${BACKUP_DIR} (preserved)"
  if [ -n "${FAILED_DIST_DIR}" ] && [ -d "${FAILED_DIST_DIR}" ]; then
    echo "Failed Dist Preserved: ${FAILED_DIST_DIR}"
  fi
  echo "=========================================================================="
  exit 1
}

# Allow sourcing helper functions only
if [ "${1:-}" = "--functions-only" ]; then
  return 0 2>/dev/null || exit 0
fi

# ------------------------------------------------------------------------------
# STEP 1: Pre-flight Verification & Checksums
# ------------------------------------------------------------------------------
echo "=== MarkHub PG R2025 Deployment Started: ${TIMESTAMP} ==="
echo "--> [1/6] Running pre-flight checks..."

if [ ! -d "${PROD_DIR}" ]; then
  echo "[FATAL] Production directory ${PROD_DIR} not found!" >&2
  exit 1
fi

if [ ! -f "${RELEASE_TAR}" ]; then
  echo "[FATAL] Release archive ${RELEASE_TAR} not found!" >&2
  exit 1
fi

echo "Verifying release tarball SHA256 checksum..."
ACTUAL_SHA256="$(sha256sum "${RELEASE_TAR}" | awk '{print $1}')"
if [ "${ACTUAL_SHA256}" != "${EXPECTED_SHA256}" ]; then
  echo "[FATAL] Checksum mismatch for ${RELEASE_TAR}!" >&2
  echo "  Expected: ${EXPECTED_SHA256}" >&2
  echo "  Actual:   ${ACTUAL_SHA256}" >&2
  exit 1
fi
echo "Release archive checksum verified."

# Reject unexpected paths before extraction
validate_release_archive_paths "${RELEASE_TAR}"

# ------------------------------------------------------------------------------
# STEP 2: Staging Extraction & Pre-Production Node Syntax Validation
# ------------------------------------------------------------------------------
echo "--> [2/6] Extracting to isolated staging and validating syntax..."
mkdir -p "${STAGE_DIR}"
tar -xzf "${RELEASE_TAR}" -C "${STAGE_DIR}"

# Provide package.json context in staging for ES module parsing
if [ -f "${PROD_DIR}/package.json" ]; then
  cp -p "${PROD_DIR}/package.json" "${STAGE_DIR}/package.json"
fi

for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
  staged_file="${STAGE_DIR}/${rel_path}"
  if [ ! -f "${staged_file}" ]; then
    echo "[FATAL] Staged file missing: ${staged_file}" >&2
    rm -rf "${STAGE_DIR}"
    exit 1
  fi
  echo "Syntax checking staged: ${rel_path}"
  node --check "${staged_file}" || {
    echo "[FATAL] Node syntax check failed for staged ${rel_path}!" >&2
    rm -rf "${STAGE_DIR}"
    exit 1
  }
done

validate_dist_directory "${STAGE_DIR}/dist"
echo "Staged backend files and frontend dist verified successfully."

# ------------------------------------------------------------------------------
# STEP 3: Mandatory Backup & Prior Absence Manifest
# ------------------------------------------------------------------------------
echo "--> [3/6] Creating mandatory backup and recording absence manifest..."
mkdir -p "${BACKUP_DIR}"
MANIFEST_FILE="${BACKUP_DIR}/manifest.txt"
: > "${MANIFEST_FILE}"

for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
  prod_file="${PROD_DIR}/${rel_path}"
  backup_file="${BACKUP_DIR}/${rel_path}"

  if [ -f "${prod_file}" ]; then
    mkdir -p "$(dirname "${backup_file}")"
    cp -p "${prod_file}" "${backup_file}"
    if [ ! -s "${backup_file}" ]; then
      echo "[FATAL] Backup verification failed for ${prod_file}!" >&2
      rm -rf "${STAGE_DIR}"
      exit 1
    fi
    echo "EXISTS:${rel_path}" >> "${MANIFEST_FILE}"
    echo "Backed up existing: ${rel_path}"
  else
    echo "ABSENT:${rel_path}" >> "${MANIFEST_FILE}"
    echo "Recorded prior absence: ${rel_path}"
  fi
done

# Verify existing frontend dist before proceeding
validate_dist_directory "${PROD_DIR}/dist"
echo "Manifest and backups verified in: ${BACKUP_DIR}"

# ------------------------------------------------------------------------------
# STEP 4: Atomic Backend Replacement with Failure Trap
# ------------------------------------------------------------------------------
echo "--> [4/6] Atomically deploying backend files..."

# Arm failure recovery trap
trap 'execute_full_recovery "Backend file replacement failed"' ERR

for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
  target_file="${PROD_DIR}/${rel_path}"
  staged_file="${STAGE_DIR}/${rel_path}"
  target_dir="$(dirname "${target_file}")"
  mkdir -p "${target_dir}"

  if [ -f "${target_file}" ]; then
    REF_TARGET="${target_file}"
  else
    REF_TARGET="${target_dir}"
  fi

  TMP_SWAP="${target_file}.tmp.${TIMESTAMP}_$$"
  TRACKED_TMP_FILES+=("${TMP_SWAP}")

  cp "${staged_file}" "${TMP_SWAP}"
  chmod --reference="${REF_TARGET}" "${TMP_SWAP}" 2>/dev/null || true
  chown --reference="${REF_TARGET}" "${TMP_SWAP}" 2>/dev/null || true
  mv -f "${TMP_SWAP}" "${target_file}"

  node --check "${target_file}"
  echo "Installed and verified: ${rel_path}"
done

cleanup_tracked_tmp_files

# ------------------------------------------------------------------------------
# STEP 5: Failure-Safe Frontend Dist Switch
# ------------------------------------------------------------------------------
echo "--> [5/6] Switching frontend dist with safety preservation..."

trap 'execute_full_recovery "Frontend dist activation failed"' ERR

# Atomic directory rename preserving previous dist
mv "${PROD_DIR}/dist" "${DIST_PREV}"
mv "${STAGE_DIR}/dist" "${PROD_DIR}/dist"

chmod --reference="${DIST_PREV}" "${PROD_DIR}/dist" 2>/dev/null || true
chown --reference="${DIST_PREV}" "${PROD_DIR}/dist" 2>/dev/null || true

# Validate activated production dist (BOTH index.html and version.json)
if ! validate_dist_directory "${PROD_DIR}/dist"; then
  execute_full_recovery "Activated production dist failed validation (index.html or version.json missing/invalid)"
fi
echo "Frontend dist activated and validated on disk."

# ------------------------------------------------------------------------------
# STEP 6: PM2 Reload (Scoped) & Strict Production Health Checks
# ------------------------------------------------------------------------------
echo "--> [6/6] Reloading PM2 markhub-server and verifying production health..."

trap 'execute_full_recovery "PM2 reload or service health verification failed"' ERR

# Scope: Reload ONLY markhub-server
echo "Reloading PM2 service: markhub-server..."
pm2 reload markhub-server

sleep 3

# Verify markhub-server is online
echo "Verifying PM2 status for markhub-server..."
if ! pm2 show markhub-server | grep -i 'status' | grep -q 'online'; then
  execute_full_recovery "PM2 markhub-server is not in 'online' state"
fi

# Verify backend health on https://markhub.nscet.org/api/health
echo "Verifying backend health on https://markhub.nscet.org/api/health..."
BACKEND_HEALTH_JSON="$(curl -fsS --max-time 10 https://markhub.nscet.org/api/health 2>&1)" || execute_full_recovery "Backend health endpoint unreachable or returned HTTP error"

node -e "
  const data = JSON.parse(process.argv[1]);
  if (data.status !== 'ok') {
    console.error('Backend status not ok:', data.status);
    process.exit(1);
  }
  if (data.database !== 'connected') {
    console.error('Backend database disconnected:', data.database);
    process.exit(1);
  }
" "${BACKEND_HEALTH_JSON}" || execute_full_recovery "Backend health reported unhealthy status or database disconnection"
echo "Backend health check passed: status=ok, database=connected."

# Verify frontend HTTPS endpoint and exact deployed version
echo "Verifying frontend HTTPS endpoint https://markhub.nscet.org/..."
curl -fsS -o /dev/null --max-time 15 https://markhub.nscet.org/ || execute_full_recovery "Frontend HTTPS https://markhub.nscet.org/ returned non-200 or connection timeout"

EXPECTED_FRONTEND_VER="$(cat "${PROD_DIR}/dist/version.json" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).version)")"
echo "Checking remote frontend version against expected: ${EXPECTED_FRONTEND_VER}..."
REMOTE_VERSION_JSON="$(curl -fsS --max-time 15 https://markhub.nscet.org/version.json 2>&1)" || execute_full_recovery "Could not fetch https://markhub.nscet.org/version.json"

node -e "
  const remote = JSON.parse(process.argv[1]);
  const expected = process.argv[2];
  if (!remote || remote.version !== expected) {
    console.error('Version mismatch: remote=' + (remote ? remote.version : 'null') + ' expected=' + expected);
    process.exit(1);
  }
" "${REMOTE_VERSION_JSON}" "${EXPECTED_FRONTEND_VER}" || execute_full_recovery "Deployed frontend version did not match release package"
echo "Frontend HTTPS and deployed version verified successfully."

# Disarm trap - all verifications have passed 100%
trap - ERR

# Clean up staging directory only
rm -rf "${STAGE_DIR}"

echo ""
echo "=========================================================================="
echo "DEPLOYMENT SUCCESSFUL: MarkHub PG R2025 release is active."
echo "  Target:               ${PROD_DIR}"
echo "  Commit:               373012e28d429e122c397661f85aee161bad0cfa"
echo "  Frontend Version:     ${EXPECTED_FRONTEND_VER}"
echo "  Backend Health:       status=ok, database=connected"
echo "  PM2 Service:          markhub-server (online)"
echo "  Backup Directory:     ${BACKUP_DIR}"
echo "  Previous Dist Backup: ${DIST_PREV}"
echo "  Manifest:             ${MANIFEST_FILE}"
echo "=========================================================================="
