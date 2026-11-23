#!/usr/bin/env bash
# ==============================================================================
# MarkHub PG R2025 Production Rollback Script (Hardened)
# Requires exact BACKUP_DIR and DIST_PREV arguments.
# ==============================================================================
set -Eeuo pipefail

PROD_DIR="${PROD_DIR:-/var/www/markhub}"
BACKUP_DIR="${1:-}"
DIST_PREV="${2:-}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

APPROVED_BACKEND_FILES=(
  "server/routes/marks.js"
  "src/utils/regulationResolver.js"
  "src/utils/pgRegulation2025.js"
  "src/utils/academicProgrammes.js"
)

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

# ------------------------------------------------------------------------------
# Robust Rollback Failure Recovery Handler
# ------------------------------------------------------------------------------
handle_rollback_failure() {
  local reason="${1:-Unknown rollback failure}"
  echo ""
  echo "=========================================================================="
  echo "[ROLLBACK FAILED]: ${reason}"
  echo "Initiating automatic recovery to restore pre-rollback production state..."
  echo "=========================================================================="

  trap - ERR

  local ALL_BACKEND_RESTORED=true
  local FRONTEND_RESTORED=true
  local PM2_RELOAD_SUCCESS=true
  local RESTORED_FILES=()
  local FAILED_RESTORE_FILES=()
  local FAULTY_DIST_DIR=""

  cleanup_tracked_tmp_files

  # 1. Restore backend files from pre-rollback snapshot
  local manifest_path="${PRE_MANIFEST_FILE:-${PRE_ROLLBACK_BACKUP:-}/pre_manifest.txt}"
  if [ -f "${manifest_path}" ] && [ -s "${manifest_path}" ]; then
    declare -A PRE_RECOV_MAP=()
    local recov_entry_count=0
    local manifest_valid=true

    while IFS= read -r raw_line || [ -n "${raw_line}" ]; do
      local line="$(echo "${raw_line}" | tr -d '\r' | xargs)"
      [ -z "${line}" ] && continue

      # Format must strictly be STATUS:PATH with only EXISTS or ABSENT
      if [[ ! "${line}" =~ ^(EXISTS|ABSENT):([^:]+)$ ]]; then
        echo "[CRITICAL FAILURE] Invalid manifest entry format in pre-rollback manifest: '${line}'" >&2
        manifest_valid=false
        break
      fi

      local status="${BASH_REMATCH[1]}"
      local rel_path="${BASH_REMATCH[2]}"

      # Reject absolute paths or path traversal (..)
      if [[ "${rel_path}" = /* ]] || [[ "${rel_path}" =~ \.\. ]]; then
        echo "[CRITICAL FAILURE] Forbidden path (absolute or path traversal) in pre-rollback manifest: '${rel_path}'" >&2
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
        echo "[CRITICAL FAILURE] Unexpected path in pre-rollback manifest: '${rel_path}' (only 4 approved backend files allowed)" >&2
        manifest_valid=false
        break
      fi

      # Reject duplicate entries
      if [ -n "${PRE_RECOV_MAP[${rel_path}]:-}" ]; then
        echo "[CRITICAL FAILURE] Duplicate entry in pre-rollback manifest for path: '${rel_path}'" >&2
        manifest_valid=false
        break
      fi

      PRE_RECOV_MAP["${rel_path}"]="${status}"
      recov_entry_count=$((recov_entry_count + 1))
    done < "${manifest_path}"

    # Require EXACTLY all 4 approved paths
    if [ "${manifest_valid}" = "true" ]; then
      for expected in "${APPROVED_BACKEND_FILES[@]}"; do
        if [ -z "${PRE_RECOV_MAP[${expected}]:-}" ]; then
          echo "[CRITICAL FAILURE] Missing required path in pre-rollback manifest: '${expected}'" >&2
          manifest_valid=false
          break
        fi
      done
      if [ "${manifest_valid}" = "true" ] && [ "${recov_entry_count}" -ne "${#APPROVED_BACKEND_FILES[@]}" ]; then
        echo "[CRITICAL FAILURE] Pre-rollback manifest entry count mismatch! Expected ${#APPROVED_BACKEND_FILES[@]}, found ${recov_entry_count}" >&2
        manifest_valid=false
      fi
    fi

    if [ "${manifest_valid}" != "true" ]; then
      echo "[CRITICAL FAILURE] Pre-rollback manifest validation failed for ${manifest_path}! Aborting backend restoration." >&2
      FAILED_RESTORE_FILES+=("Pre-rollback manifest validation failed (${manifest_path}) - backend restoration aborted")
      ALL_BACKEND_RESTORED=false
    else
      # Manifest is valid: proceed with restoring backend files
      for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
        local status="${PRE_RECOV_MAP[${rel_path}]}"
        local target_file="${PROD_DIR}/${rel_path}"
        local source_file="${PRE_ROLLBACK_BACKUP}/${rel_path}"
        local target_dir="$(dirname "${target_file}")"

        if [ "${status}" = "EXISTS" ]; then
          if [ -s "${source_file}" ]; then
            mkdir -p "${target_dir}"
            local TMP_REC="${target_file}.tmp.recov.${TIMESTAMP}_$$"
            TRACKED_TMP_FILES+=("${TMP_REC}")

            if cp -p "${source_file}" "${TMP_REC}" && \
               chmod --reference="${source_file}" "${TMP_REC}" 2>/dev/null && \
               chown --reference="${source_file}" "${TMP_REC}" 2>/dev/null && \
               mv -f "${TMP_REC}" "${target_file}" && \
               node --check "${target_file}" >/dev/null 2>&1; then
              RESTORED_FILES+=("${rel_path} (restored to pre-rollback state and validated)")
            else
              FAILED_RESTORE_FILES+=("${rel_path} (pre-rollback restore or syntax check failed)")
              ALL_BACKEND_RESTORED=false
            fi
          else
            FAILED_RESTORE_FILES+=("${rel_path} (pre-rollback backup file missing or empty)")
            ALL_BACKEND_RESTORED=false
          fi
        elif [ "${status}" = "ABSENT" ]; then
          if [ -f "${target_file}" ]; then
            if rm -f "${target_file}"; then
              RESTORED_FILES+=("${rel_path} (removed newly-introduced file)")
            else
              FAILED_RESTORE_FILES+=("${rel_path} (failed to remove newly-introduced file)")
              ALL_BACKEND_RESTORED=false
            fi
          else
            RESTORED_FILES+=("${rel_path} (confirmed absent)")
          fi
        fi
      done
    fi
  else
    echo "[CRITICAL FAILURE] Pre-rollback manifest missing or empty: ${manifest_path}" >&2
    FAILED_RESTORE_FILES+=("Pre-rollback manifest missing or empty: ${manifest_path}")
    ALL_BACKEND_RESTORED=false
  fi

  cleanup_tracked_tmp_files

  # 2. Restore frontend dist from pre-rollback snapshot
  local pre_dist="${PRE_ROLLBACK_DIST:-}"
  if [ -n "${pre_dist}" ] && [ -d "${pre_dist}" ]; then
    local dist_quarantined=false
    FAULTY_DIST_DIR="${PROD_DIR}/dist_faulty_rollback_${TIMESTAMP}_$$"

    if [ -d "${PROD_DIR}/dist" ]; then
      if mv "${PROD_DIR}/dist" "${FAULTY_DIST_DIR}"; then
        echo "[RECOVERY] Quarantined faulty dist to: ${FAULTY_DIST_DIR}"
        dist_quarantined=true
      else
        echo "[CRITICAL FAILURE] Could not quarantine faulty dist from ${PROD_DIR}/dist!" >&2
        echo "  Preserving ${PROD_DIR}/dist as-is. Will NOT overwrite uncertain destination." >&2
        FRONTEND_RESTORED=false
      fi
    else
      dist_quarantined=true
    fi

    if [ "${dist_quarantined}" = "true" ] && [ ! -e "${PROD_DIR}/dist" ]; then
      if cp -rp "${pre_dist}" "${PROD_DIR}/dist"; then
        if validate_dist_directory "${PROD_DIR}/dist"; then
          echo "[RECOVERY] Successfully restored pre-rollback dist to: ${PROD_DIR}/dist"
        else
          echo "[CRITICAL FAILURE] Restored pre-rollback dist failed validation!" >&2
          FRONTEND_RESTORED=false
        fi
      else
        echo "[CRITICAL FAILURE] Failed to copy ${pre_dist} to ${PROD_DIR}/dist!" >&2
        FRONTEND_RESTORED=false
      fi
    elif [ -e "${PROD_DIR}/dist" ]; then
      echo "[CRITICAL FAILURE] ${PROD_DIR}/dist exists; refusing to overwrite uncertain destination!" >&2
      FRONTEND_RESTORED=false
    fi
  else
    echo "[CRITICAL FAILURE] Pre-rollback dist snapshot missing: ${pre_dist}" >&2
    FRONTEND_RESTORED=false
  fi

  # 3. Reload PM2 markhub-server and verify health
  echo "[RECOVERY] Reloading PM2 markhub-server..."
  if ! pm2 reload markhub-server; then
    echo "[CRITICAL FAILURE] 'pm2 reload markhub-server' failed during rollback recovery!" >&2
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

  # 4. Truthful status reporting
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
    echo "[ROLLBACK RECOVERY SUCCESS]: Rollback failed, but pre-rollback production state was fully restored and verified."
  else
    echo "[CRITICAL ALERT]: Rollback failure recovery was PARTIAL or FAILED!"
    echo "  Immediate manual investigation required."
  fi
  echo "--------------------------------------------------------------------------"
  echo "Restoration Details:"
  if [ "${#RESTORED_FILES[@]}" -gt 0 ]; then
    echo "Restored Files:"
    for rf in "${RESTORED_FILES[@]}"; do
      echo "  [OK]   ${rf}"
    done
  fi
  if [ "${#FAILED_RESTORE_FILES[@]}" -gt 0 ]; then
    echo "Failed Files:"
    for ff in "${FAILED_RESTORE_FILES[@]}"; do
      echo "  [FAIL] ${ff}"
    done
  fi
  echo "Frontend Status:             $([ "${FRONTEND_RESTORED}" = "true" ] && echo "RESTORED" || echo "FAILED")"
  echo "PM2 Reload Status:           $([ "${PM2_RELOAD_SUCCESS}" = "true" ] && echo "SUCCESS" || echo "FAILED")"
  echo "PM2 Process Status:          $([ "${PM2_ONLINE}" = "true" ] && echo "ONLINE" || echo "OFFLINE / FAILED")"
  echo "Backend Health:              $([ "${BACKEND_HEALTH_OK}" = "true" ] && echo "OK (database connected)" || echo "FAILED")"
  echo "Frontend Access:             $([ "${FRONTEND_ACCESSIBLE}" = "true" ] && echo "ACCESSIBLE" || echo "FAILED")"
  echo "Version Parity:              $([ "${VERSION_MATCH_OK}" = "true" ] && echo "VERIFIED (${RESTORED_VER})" || echo "FAILED")"
  echo "Pre-Rollback Backup:         ${PRE_ROLLBACK_BACKUP:-none} (preserved)"
  echo "Pre-Rollback Dist Snapshot:  ${PRE_ROLLBACK_DIST:-none} (preserved)"
  echo "Original Deployment Backup:  ${BACKUP_DIR:-none} (preserved)"
  echo "Original Deployment Dist:    ${DIST_PREV:-none} (preserved)"
  if [ -n "${FAULTY_DIST_DIR}" ] && [ -d "${FAULTY_DIST_DIR}" ]; then
    echo "Quarantined Faulty Dist:     ${FAULTY_DIST_DIR} (preserved)"
  fi
  echo "=========================================================================="
  exit 1
}

# Allow sourcing helper functions only
if [ "${1:-}" = "--functions-only" ]; then
  return 0 2>/dev/null || exit 0
fi

# ------------------------------------------------------------------------------
# STEP 1: Strict Parameter & Path Validation (Before Any Modification)
# ------------------------------------------------------------------------------
echo "=== MarkHub PG R2025 Rollback Initiated: ${TIMESTAMP} ==="

if [ -z "${BACKUP_DIR}" ] || [ -z "${DIST_PREV}" ]; then
  echo "[FATAL] Usage: $0 <EXACT_BACKUP_DIR> <EXACT_DIST_PREV>" >&2
  echo "Example: $0 /var/www/markhub/backups/pg_r2025_backup_20261122_224500 /var/www/markhub/dist_prev_20261122_224500" >&2
  exit 1
fi

case "${BACKUP_DIR}" in
  *\**|*\?*) echo "[FATAL] Wildcards forbidden in BACKUP_DIR: ${BACKUP_DIR}" >&2; exit 1 ;;
esac
case "${DIST_PREV}" in
  *\**|*\?*) echo "[FATAL] Wildcards forbidden in DIST_PREV: ${DIST_PREV}" >&2; exit 1 ;;
esac

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "[FATAL] Specified BACKUP_DIR does not exist: ${BACKUP_DIR}" >&2
  exit 1
fi

MANIFEST_FILE="${BACKUP_DIR}/manifest.txt"
if [ ! -f "${MANIFEST_FILE}" ] || [ ! -s "${MANIFEST_FILE}" ]; then
  echo "[FATAL] Manifest file missing or empty in backup: ${MANIFEST_FILE}" >&2
  exit 1
fi

if ! validate_dist_directory "${DIST_PREV}"; then
  echo "[FATAL] Specified DIST_PREV is invalid or corrupted: ${DIST_PREV}" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# STEP 2: Strict Manifest Validation & Backup File Pre-Verification
# ------------------------------------------------------------------------------
echo "--> [1/5] Validating manifest integrity and pre-verifying backup files..."

declare -A MANIFEST_MAP=()
line_count=0

while IFS= read -r raw_line || [ -n "${raw_line}" ]; do
  line="$(echo "${raw_line}" | tr -d '\r' | xargs)"
  [ -z "${line}" ] && continue

  # Format must strictly be STATUS:PATH
  if [[ ! "${line}" =~ ^(EXISTS|ABSENT):([^:]+)$ ]]; then
    echo "[FATAL] Invalid manifest entry format: '${line}'" >&2
    exit 1
  fi

  status="${BASH_REMATCH[1]}"
  rel_path="${BASH_REMATCH[2]}"

  # Reject absolute paths or path traversal (..)
  if [[ "${rel_path}" = /* ]] || [[ "${rel_path}" =~ \.\. ]]; then
    echo "[FATAL] Forbidden path (absolute or path traversal) in manifest: '${rel_path}'" >&2
    exit 1
  fi

  # Must match one of the 4 approved backend files
  approved=false
  for expected in "${APPROVED_BACKEND_FILES[@]}"; do
    if [ "${rel_path}" = "${expected}" ]; then
      approved=true
      break
    fi
  done

  if [ "${approved}" != "true" ]; then
    echo "[FATAL] Unexpected path in manifest: '${rel_path}' (only 4 approved backend files allowed)" >&2
    exit 1
  fi

  # Reject duplicate entries
  if [ -n "${MANIFEST_MAP[${rel_path}]:-}" ]; then
    echo "[FATAL] Duplicate entry in manifest for path: '${rel_path}'" >&2
    exit 1
  fi

  MANIFEST_MAP["${rel_path}"]="${status}"
  line_count=$((line_count + 1))
done < "${MANIFEST_FILE}"

# Require EXACTLY all 4 approved paths
for expected in "${APPROVED_BACKEND_FILES[@]}"; do
  if [ -z "${MANIFEST_MAP[${expected}]:-}" ]; then
    echo "[FATAL] Missing required path in manifest: '${expected}'" >&2
    exit 1
  fi
done

if [ "${line_count}" -ne "${#APPROVED_BACKEND_FILES[@]}" ]; then
  echo "[FATAL] Manifest entry count mismatch! Expected ${#APPROVED_BACKEND_FILES[@]}, found ${line_count}" >&2
  exit 1
fi

# Pre-verify all required backup files BEFORE touching production
for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
  status="${MANIFEST_MAP[${rel_path}]}"
  if [ "${status}" = "EXISTS" ]; then
    backup_file="${BACKUP_DIR}/${rel_path}"
    if [ ! -s "${backup_file}" ]; then
      echo "[FATAL] Required backup file is missing or empty: ${backup_file}" >&2
      exit 1
    fi
    node --check "${backup_file}" || {
      echo "[FATAL] Backup file failed syntax validation: ${backup_file}" >&2
      exit 1
    }
    echo "Pre-verified backup file: ${rel_path}"
  elif [ "${status}" = "ABSENT" ]; then
    echo "Pre-verified file will be unlinked if present: ${rel_path}"
  fi
done
echo "Manifest and backup pre-verification completed successfully."

# ------------------------------------------------------------------------------
# STEP 3: Create Pre-Rollback Production Snapshot (Failure Recovery Safety Net)
# ------------------------------------------------------------------------------
echo "--> [2/5] Creating pre-rollback snapshot to preserve current working state..."
PRE_ROLLBACK_BACKUP="${PROD_DIR}/backups/pre_rollback_backup_${TIMESTAMP}_$$"
mkdir -p "${PRE_ROLLBACK_BACKUP}"
PRE_MANIFEST_FILE="${PRE_ROLLBACK_BACKUP}/pre_manifest.txt"
: > "${PRE_MANIFEST_FILE}"

for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
  prod_file="${PROD_DIR}/${rel_path}"
  backup_target="${PRE_ROLLBACK_BACKUP}/${rel_path}"

  if [ -f "${prod_file}" ]; then
    mkdir -p "$(dirname "${backup_target}")"
    cp -p "${prod_file}" "${backup_target}"
    echo "EXISTS:${rel_path}" >> "${PRE_MANIFEST_FILE}"
    echo "Snapshot existing: ${rel_path}"
  else
    echo "ABSENT:${rel_path}" >> "${PRE_MANIFEST_FILE}"
    echo "Snapshot prior absence: ${rel_path}"
  fi
done

# Snapshot current frontend dist into standalone directory before any modification
PRE_ROLLBACK_DIST="${PROD_DIR}/dist_pre_rollback_${TIMESTAMP}_$$"
if [ -d "${PROD_DIR}/dist" ]; then
  cp -rp "${PROD_DIR}/dist" "${PRE_ROLLBACK_DIST}"
  echo "Snapshot frontend dist saved to: ${PRE_ROLLBACK_DIST}"
fi

# ------------------------------------------------------------------------------
# STEP 4: Restore Backend Files from Manifest (Preserving Backups)
# ------------------------------------------------------------------------------
echo "--> [3/5] Restoring backend files from verified backup via atomic swap..."

trap 'handle_rollback_failure "Backend replacement failed during rollback"' ERR

for rel_path in "${APPROVED_BACKEND_FILES[@]}"; do
  target_file="${PROD_DIR}/${rel_path}"
  backup_file="${BACKUP_DIR}/${rel_path}"
  target_dir="$(dirname "${target_file}")"
  mkdir -p "${target_dir}"
  status="${MANIFEST_MAP[${rel_path}]}"

  if [ "${status}" = "EXISTS" ]; then
    TMP_SWAP="${target_file}.tmp.rollback.${TIMESTAMP}_$$"
    TRACKED_TMP_FILES+=("${TMP_SWAP}")

    # Copy from backup (never move, preserving original backup intact)
    cp -p "${backup_file}" "${TMP_SWAP}"
    chmod --reference="${backup_file}" "${TMP_SWAP}" 2>/dev/null || true
    chown --reference="${backup_file}" "${TMP_SWAP}" 2>/dev/null || true
    mv -f "${TMP_SWAP}" "${target_file}"

    node --check "${target_file}"
    echo "Restored backend file: ${rel_path}"
  elif [ "${status}" = "ABSENT" ]; then
    if [ -f "${target_file}" ]; then
      rm -f "${target_file}"
      echo "Removed file that was not present prior to deployment: ${rel_path}"
    fi
  fi
done

cleanup_tracked_tmp_files

# ------------------------------------------------------------------------------
# STEP 5: Restore Frontend Dist (Non-destructive, Preserving Working Copies)
# ------------------------------------------------------------------------------
echo "--> [4/5] Restoring frontend dist..."

trap 'handle_rollback_failure "Frontend dist restoration failed during rollback"' ERR

ROLLBACK_SWAP_DIST="${PROD_DIR}/dist_swapped_rollback_${TIMESTAMP}_$$"

# Safely quarantine active dist before placing DIST_PREV
if [ -d "${PROD_DIR}/dist" ]; then
  mv "${PROD_DIR}/dist" "${ROLLBACK_SWAP_DIST}"
  echo "Preserved active dist to: ${ROLLBACK_SWAP_DIST}"
fi

# Copy DIST_PREV so DIST_PREV itself is never destroyed or lost
cp -rp "${DIST_PREV}" "${PROD_DIR}/dist"
chmod --reference="${DIST_PREV}" "${PROD_DIR}/dist" 2>/dev/null || true
chown --reference="${DIST_PREV}" "${PROD_DIR}/dist" 2>/dev/null || true

if ! validate_dist_directory "${PROD_DIR}/dist"; then
  echo "[FATAL] Restored dist validation failed!" >&2
  false # triggers ERR trap
fi
echo "Frontend dist successfully restored and validated on disk."

# ------------------------------------------------------------------------------
# STEP 6: Reload PM2 markhub-server & Strict Health Verification
# ------------------------------------------------------------------------------
echo "--> [5/5] Reloading PM2 markhub-server and verifying health..."

trap 'handle_rollback_failure "PM2 reload or health check failed during rollback"' ERR

pm2 reload markhub-server

sleep 3

echo "Verifying PM2 status for markhub-server..."
if ! pm2 show markhub-server | grep -i 'status' | grep -q 'online'; then
  echo "[FATAL] PM2 markhub-server is not in 'online' state after rollback!" >&2
  false
fi

echo "Verifying backend health on https://markhub.nscet.org/api/health..."
BACKEND_HEALTH_JSON="$(curl -fsS --max-time 10 https://markhub.nscet.org/api/health 2>&1)" || {
  echo "[FATAL] Backend health endpoint failed after rollback!" >&2
  false
}

node -e "
  const data = JSON.parse(process.argv[1]);
  if (data.status !== 'ok' || data.database !== 'connected') {
    console.error('Backend unhealthy state:', JSON.stringify(data));
    process.exit(1);
  }
" "${BACKEND_HEALTH_JSON}" || {
  echo "[FATAL] Backend reported unhealthy state after rollback!" >&2
  false
}
echo "Backend health verified: status=ok, database=connected."

echo "Verifying frontend HTTPS endpoint https://markhub.nscet.org/..."
curl -fsS -o /dev/null --max-time 15 https://markhub.nscet.org/ || {
  echo "[FATAL] Frontend https://markhub.nscet.org/ failed after rollback!" >&2
  false
}

RESTORED_FRONTEND_VER="$(cat "${PROD_DIR}/dist/version.json" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).version)")"
REMOTE_VERSION_JSON="$(curl -fsS --max-time 15 https://markhub.nscet.org/version.json 2>&1)" || {
  echo "[FATAL] Could not fetch https://markhub.nscet.org/version.json after rollback!" >&2
  false
}

node -e "
  const remote = JSON.parse(process.argv[1]);
  const expected = process.argv[2];
  if (!remote || remote.version !== expected) {
    console.error('Version mismatch: remote=' + (remote ? remote.version : 'null') + ' expected=' + expected);
    process.exit(1);
  }
" "${REMOTE_VERSION_JSON}" "${RESTORED_FRONTEND_VER}" || {
  echo "[FATAL] Remote version does not match restored version!" >&2
  false
}
echo "Frontend HTTPS and restored version verified (${RESTORED_FRONTEND_VER})."

# Disarm trap
trap - ERR

echo ""
echo "=========================================================================="
echo "ROLLBACK SUCCESSFUL: Production restored to pre-deployment state."
echo "  Restored from:            ${BACKUP_DIR}"
echo "  Restored Dist:            ${DIST_PREV}"
echo "  Frontend Version:         ${RESTORED_FRONTEND_VER}"
echo "  PM2 Service:              markhub-server (online)"
echo "  Pre-Rollback State Saved: ${PRE_ROLLBACK_BACKUP}"
echo "  Pre-Rollback Dist Saved:  ${PRE_ROLLBACK_DIST}"
if [ -d "${ROLLBACK_SWAP_DIST}" ]; then
  echo "  Quarantined Active Dist:  ${ROLLBACK_SWAP_DIST}"
fi
echo "=========================================================================="
