#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '%s %s\n' "$(date -Is)" "$*"
}

BACKUPS_DIR="${BACKUPS_DIR:-}" 
RCLONE_CONFIG="${RCLONE_CONFIG:-/etc/kitchorify/rclone.conf}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
RCLONE_DEST="${RCLONE_DEST:-}"
RCLONE_FLAGS="${RCLONE_FLAGS:-}"

if [[ -z "$BACKUPS_DIR" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  BACKUPS_DIR="$script_dir/backups"
fi

if ! command -v docker >/dev/null 2>&1; then
  log "ERROR: docker not found"
  exit 1
fi

if [[ ! -d "$BACKUPS_DIR" ]]; then
  log "INFO: backups dir does not exist yet: $BACKUPS_DIR (creating)"
  mkdir -p "$BACKUPS_DIR"
fi

if [[ -z "$RCLONE_REMOTE" || -z "$RCLONE_DEST" ]]; then
  log "ERROR: RCLONE_REMOTE and RCLONE_DEST must be set"
  exit 1
fi

if [[ ! -f "$RCLONE_CONFIG" ]]; then
  log "ERROR: rclone config not found: $RCLONE_CONFIG"
  exit 1
fi

log "Starting off-host backup sync"
log "Source: $BACKUPS_DIR"
log "Dest:   $RCLONE_REMOTE:$RCLONE_DEST"

# Mirror local retention to remote:
# - local pg-backup already applies retention
# - rclone sync makes remote match local set
#
# NOTE: This does not encrypt data by itself. Prefer a private bucket + server-side encryption,
# or use restic/age if you need client-side encryption.

docker run --rm \
  -v "$BACKUPS_DIR:/data:ro" \
  -v "$RCLONE_CONFIG:/config/rclone/rclone.conf:ro" \
  -e RCLONE_CONFIG=/config/rclone/rclone.conf \
  rclone/rclone sync /data "$RCLONE_REMOTE:$RCLONE_DEST" \
  --stats-one-line --stats 30s \
  ${RCLONE_FLAGS}

log "Backup sync finished"
