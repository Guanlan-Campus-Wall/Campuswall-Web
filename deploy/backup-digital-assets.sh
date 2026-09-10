#!/usr/bin/env bash
set -euo pipefail
umask 077

ENV_FILE="${CAMPUSWALL_BACKUP_ENV:-/etc/campuswall/backup.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  printf 'missing backup env: %s\n' "$ENV_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

PROJECT_DIR="${CAMPUSWALL_PROJECT_DIR:-/www/wwwroot/campuswall-react}"
BACKUP_ROOT="${CAMPUSWALL_BACKUP_ROOT:-/www/backups/campuswall}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="${BACKUP_ROOT}/${STAMP}-assets"
REMOTE_DIR="campuswall-backups/${STAMP}"

install -d -m 0700 "$WORK_DIR"
cd "$PROJECT_DIR"
git rev-parse HEAD > "$WORK_DIR/commit.txt" || true
printf '%s\n' "$STAMP" > "$WORK_DIR/stamp.txt"

runuser -u postgres -- pg_dump -Fc campus_wall > "$WORK_DIR/campus_wall.dump"
runuser -u postgres -- pg_restore -l < "$WORK_DIR/campus_wall.dump" >/dev/null
tar --exclude='backend/static/chunks' --exclude='backend/static/chunks/*' \
  -czf "$WORK_DIR/runtime-files.tar.gz" \
  backend/static backend/help backend/logs \
  backend/admin_log.json backend/manage_message.json 2>/dev/null || \
tar --exclude='backend/static/chunks' --exclude='backend/static/chunks/*' \
  -czf "$WORK_DIR/runtime-files.tar.gz" \
  backend/static backend/help
sha256sum "$WORK_DIR/campus_wall.dump" "$WORK_DIR/runtime-files.tar.gz" "$WORK_DIR/commit.txt" \
  > "$WORK_DIR/SHA256SUMS"

push_one() {
  local name="$1" host="$2" user="$3" pass="$4" port="${5:-22}"
  if [[ -z "$host" || -z "$user" || -z "$pass" ]]; then
    printf 'skip empty backup target %s\n' "$name" >&2
    return 1
  fi
  export SSHPASS="$pass"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    -p "$port" "${user}@${host}" "mkdir -p '${REMOTE_DIR}' && chmod 700 campuswall-backups '${REMOTE_DIR}'"
  sshpass -e scp -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    -P "$port" -r "$WORK_DIR/." "${user}@${host}:${REMOTE_DIR}/"
  printf 'pushed %s -> %s@%s:%s\n' "$name" "$user" "$host" "$REMOTE_DIR"
}

status=0
push_one "${BACKUP_OCI_NAME:-OCI US SanJose}" "${BACKUP_OCI_HOST}" "${BACKUP_OCI_USER}" "${BACKUP_OCI_PASS}" "${BACKUP_OCI_PORT:-22}" || status=1
push_one "${BACKUP_GROK_NAME:-Grok Bot}" "${BACKUP_GROK_HOST}" "${BACKUP_GROK_USER}" "${BACKUP_GROK_PASS}" "${BACKUP_GROK_PORT:-22}" || status=1
unset SSHPASS
exit "$status"
