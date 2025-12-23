#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  restore-drill.sh --env-file <path> --backup <path-to-backup>

What it does:
  - Creates a NEW database (kitchorify_restore_test_<timestamp>)
  - Restores the given backup into it
  - Runs a few basic sanity queries
  - Prints elapsed time

Backup formats supported:
  - .sql            (psql)
  - .sql.gz         (gzip -dc | psql)
  - .dump / .backup (pg_restore)

Notes:
  - This is a DR TEST. It does NOT modify your production DB.
  - You still must run a real production restore test periodically.
EOF
}

ENV_FILE=""
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --backup)
      BACKUP_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$ENV_FILE" || -z "$BACKUP_FILE" ]]; then
  usage
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

start_ts="$(date +%s)"

db_suffix="$(date +%Y%m%d_%H%M%S)"
TEST_DB="kitchorify_restore_test_${db_suffix}"

echo "[restore-drill] Test DB: $TEST_DB"

echo "[restore-drill] Creating DB..."
cd "$(dirname "$ENV_FILE")"

docker compose --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-kitchorify}" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$TEST_DB\";"

restore_sql() {
  local file="$1"
  echo "[restore-drill] Restoring SQL into $TEST_DB..."
  cat "$file" | docker compose --env-file "$ENV_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-kitchorify}" -d "$TEST_DB" -v ON_ERROR_STOP=1
}

restore_sql_gz() {
  local file="$1"
  echo "[restore-drill] Restoring SQL.GZ into $TEST_DB..."
  gzip -dc "$file" | docker compose --env-file "$ENV_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-kitchorify}" -d "$TEST_DB" -v ON_ERROR_STOP=1
}

restore_dump() {
  local file="$1"
  echo "[restore-drill] Restoring DUMP into $TEST_DB..."
  cat "$file" | docker compose --env-file "$ENV_FILE" exec -T postgres \
    pg_restore -U "${POSTGRES_USER:-kitchorify}" -d "$TEST_DB" --no-owner --no-privileges
}

case "$BACKUP_FILE" in
  *.sql)
    restore_sql "$BACKUP_FILE"
    ;;
  *.sql.gz)
    restore_sql_gz "$BACKUP_FILE"
    ;;
  *.dump|*.backup)
    restore_dump "$BACKUP_FILE"
    ;;
  *)
    echo "Unsupported backup extension: $BACKUP_FILE" >&2
    exit 1
    ;;
esac

echo "[restore-drill] Sanity checks..."

docker compose --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-kitchorify}" -d "$TEST_DB" -v ON_ERROR_STOP=1 <<'SQL'
SELECT now() AS restored_at;

-- Basic presence checks (tables may evolve over time)
SELECT COUNT(*) AS tenants FROM "Tenant";
SELECT COUNT(*) AS users FROM "User";
SELECT COUNT(*) AS orders FROM "Order";
SQL

elapsed=$(( $(date +%s) - start_ts ))
echo "[restore-drill] OK. Elapsed: ${elapsed}s"

echo
echo "Next steps:"
echo "- Optional: manually inspect the restored DB: $TEST_DB"
echo "- When done, drop it:"
echo "  docker compose --env-file $ENV_FILE exec -T postgres psql -U \"${POSTGRES_USER:-kitchorify}\" -d postgres -c 'DROP DATABASE \"$TEST_DB\";'"
