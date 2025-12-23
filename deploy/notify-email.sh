#!/usr/bin/env bash
set -euo pipefail

UNIT_NAME="${1:-unknown}"

ENV_FILE="/etc/kitchorify/email-alert.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "email alert env not found ($ENV_FILE); skipping" >&2
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${SMTP_HOST:?SMTP_HOST is required}"
: "${SMTP_PORT:?SMTP_PORT is required}"
: "${SMTP_USER:?SMTP_USER is required}"
: "${SMTP_PASSWORD:?SMTP_PASSWORD is required}"
: "${ALERT_FROM:?ALERT_FROM is required}"
: "${ALERT_TO:?ALERT_TO is required}"

ALERT_SUBJECT_PREFIX="${ALERT_SUBJECT_PREFIX:-[kitchorify]}"
ENV_NAME="${ENV_NAME:-prod}"
SMTP_TLS="${SMTP_TLS:-on}"

if ! command -v msmtp >/dev/null 2>&1; then
  echo "msmtp not installed; install: apt-get install -y msmtp msmtp-mta" >&2
  exit 1
fi

msmtprc="/tmp/kitchorify-msmtprc.$$.conf"
trap 'rm -f "$msmtprc"' EXIT

chmod 600 /tmp || true

cat >"$msmtprc" <<EOF
defaults
auth           on
tls            ${SMTP_TLS}
logfile        /tmp/kitchorify-msmtp.log

account        default
host           ${SMTP_HOST}
port           ${SMTP_PORT}
user           ${SMTP_USER}
password       ${SMTP_PASSWORD}
from           ${SMTP_USER}
EOF
hostname="$(hostname -f 2>/dev/null || hostname)"
subject="${ALERT_SUBJECT_PREFIX} ${ENV_NAME} ${hostname} failure: ${UNIT_NAME}"
now="$(date -Is)"

timer_unit=""
case "$UNIT_NAME" in
  *.service)
    timer_candidate="${UNIT_NAME%.service}.timer"
    if systemctl list-unit-files --type=timer --no-pager --no-legend 2>/dev/null | awk '{print $1}' | grep -qx "$timer_candidate"; then
      timer_unit="$timer_candidate"
    fi
    ;;
esac

unit_result=""
unit_exit_code=""
unit_exec_main_status=""
if command -v systemctl >/dev/null 2>&1; then
  unit_result="$(systemctl show -p Result --value "$UNIT_NAME" 2>/dev/null || true)"
  unit_exit_code="$(systemctl show -p ExecMainCode --value "$UNIT_NAME" 2>/dev/null || true)"
  unit_exec_main_status="$(systemctl show -p ExecMainStatus --value "$UNIT_NAME" 2>/dev/null || true)"
fi

timer_last_trigger=""
timer_next_elapse=""
if [[ -n "$timer_unit" ]]; then
  timer_last_trigger="$(systemctl show -p LastTriggerUSec --value "$timer_unit" 2>/dev/null || true)"
  timer_next_elapse="$(systemctl show -p NextElapseUSecRealtime --value "$timer_unit" 2>/dev/null || true)"
fi

format_usec_epoch() {
  local usec="$1"
  if [[ -z "$usec" || "$usec" == "0" ]]; then
    echo "unknown"
    return 0
  fi
  local sec=$((usec / 1000000))
  date -Is -d "@${sec}" 2>/dev/null || echo "@${sec}"
}

{
  echo "From: ${ALERT_FROM}"
  echo "To: ${ALERT_TO}"
  echo "Subject: ${subject}"
  echo
  echo "Time: ${now}"
  echo "Env:  ${ENV_NAME}"
  echo "Host: ${hostname}"
  echo "Unit: ${UNIT_NAME}"
  if [[ -n "$unit_result" || -n "$unit_exit_code" || -n "$unit_exec_main_status" ]]; then
    echo "Result: ${unit_result:-unknown} (ExecMainCode=${unit_exit_code:-?}, ExecMainStatus=${unit_exec_main_status:-?})"
  fi
  if [[ -n "$timer_unit" ]]; then
    echo "Timer: ${timer_unit}"
    echo "TimerLast: $(format_usec_epoch "$timer_last_trigger")"
    echo "TimerNext: $(format_usec_epoch "$timer_next_elapse")"
  fi
  echo
  echo "systemctl status (brief):"
  systemctl status "$UNIT_NAME" --no-pager -n 40 2>/dev/null || true
  if [[ -n "$timer_unit" ]]; then
    echo
    echo "timer status (brief):"
    systemctl status "$timer_unit" --no-pager -n 40 2>/dev/null || true
  fi
  echo
  echo "Recent logs:"
  journalctl -u "${UNIT_NAME}" -n 200 --no-pager 2>/dev/null || true
} | msmtp -C "$msmtprc" -t
