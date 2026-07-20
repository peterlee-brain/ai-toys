#!/usr/bin/env bash
# Read-only integration tests for bird-cli.md commands.
set -uo pipefail

DOCS_DIR="$(cd "$(dirname "$0")" && pwd)"
DOC="$DOCS_DIR/bird-cli.md"
CREDS_FILE="${BIRD_CREDS_FILE:-$DOCS_DIR/.bird-credentials.env}"

CREDS_SOURCE="fallback:bird-cli.md"
if [[ -f "$CREDS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CREDS_FILE"
  CREDS_SOURCE="$CREDS_FILE"
fi

if [[ -z "${AUTH_TOKEN:-}" || -z "${CT0:-}" ]]; then
  AUTH_TOKEN="$(grep -o "authToken: '[^']*'" "$DOC" | head -1 | sed "s/authToken: '//;s/'$//")"
  CT0="$(grep -o "ct0: '[^']*'" "$DOC" | head -1 | sed "s/ct0: '//;s/'$//")"
fi

if [[ -z "${AUTH_TOKEN:-}" || -z "${CT0:-}" ]]; then
  echo "ERROR: Missing AUTH_TOKEN/CT0. Set env vars or create $CREDS_FILE"
  exit 1
fi

BIRD=(bird --auth-token "$AUTH_TOKEN" --ct0 "$CT0" --timeout 60000)
PASS=0
FAIL=0
SKIP=0
RESULTS=()

run_test() {
  local name="$1"
  local expect="$2"
  shift 2
  local output
  local status=0

  if ! output=$("$@" 2>&1); then
    status=1
  fi

  local ok=0
  case "$expect" in
    json_array)
      echo "$output" | jq -e 'type == "array"' >/dev/null 2>&1 && ok=1
      ;;
    json_object)
      echo "$output" | jq -e 'type == "object"' >/dev/null 2>&1 && ok=1
      ;;
    json_any)
      echo "$output" | jq -e . >/dev/null 2>&1 && ok=1
      ;;
    text_ok)
      [[ $status -eq 0 ]] && ok=1
      ;;
    text_contains)
      local needle="$3"
      [[ $status -eq 0 && "$output" == *"$needle"* ]] && ok=1
      ;;
    allow_fail)
      ok=1
      ;;
  esac

  if [[ $ok -eq 1 ]]; then
    RESULTS+=("PASS|$name")
    PASS=$((PASS + 1))
    echo "[PASS] $name"
  else
    RESULTS+=("FAIL|$name")
    FAIL=$((FAIL + 1))
    echo "[FAIL] $name"
    echo "$output" | head -20
    echo "---"
  fi
}

skip_test() {
  local name="$1"
  local reason="$2"
  RESULTS+=("SKIP|$name|$reason")
  SKIP=$((SKIP + 1))
  echo "[SKIP] $name — $reason"
}

echo "Bird CLI integration tests"
echo "bird version: $(bird --version 2>/dev/null || echo unknown)"
echo "credential source: ${CREDS_SOURCE}"
echo ""

# 17 documented read-only scenarios (+ helpers)
run_test "check" text_ok "${BIRD[@]}" check
run_test "whoami" text_ok "${BIRD[@]}" whoami
run_test "read" json_object "${BIRD[@]}" read 2036870207730573382 --json
run_test "user-tweets" json_array "${BIRD[@]}" user-tweets BTCdayu -n 3 --json
run_test "home" json_array "${BIRD[@]}" home -n 5 --json
run_test "search" json_array "${BIRD[@]}" search "比特币" -n 3 --json
run_test "mentions" json_array "${BIRD[@]}" mentions -n 5 --json
run_test "replies" json_array "${BIRD[@]}" replies 2036870207730573382 --json
run_test "thread" json_array "${BIRD[@]}" thread 2036870207730573382 --json
run_test "bookmarks" json_array "${BIRD[@]}" bookmarks -n 5 --json
run_test "likes" json_array "${BIRD[@]}" likes -n 5 --json
run_test "following" json_array "${BIRD[@]}" following -n 10 --json
run_test "followers" json_array "${BIRD[@]}" followers -n 5 --json
run_test "lists" json_array "${BIRD[@]}" lists --json
run_test "about" json_object "${BIRD[@]}" about XXY177 --json
run_test "trending" json_array "${BIRD[@]}" trending --json
run_test "query-ids" text_ok "${BIRD[@]}" query-ids
run_test "news" json_array "${BIRD[@]}" news -n 3 --json

# list-timeline needs a real list id; skip if lists empty
LIST_ID=$("${BIRD[@]}" lists --json 2>/dev/null | jq -r '.[0].id // empty' 2>/dev/null || true)
if [[ -n "$LIST_ID" ]]; then
  run_test "list-timeline" json_array "${BIRD[@]}" list-timeline "$LIST_ID" -n 3 --json
else
  skip_test "list-timeline" "no lists on account (expected empty [] from lists)"
fi

# Shortcut: tweet id without subcommand
run_test "shortcut-tweet-id" json_object "${BIRD[@]}" 2036870207730573382 --json

echo ""
echo "======== SUMMARY ========"
printf '%s\n' "${RESULTS[@]}" | while IFS='|' read -r status name rest; do
  if [[ "$status" == "SKIP" ]]; then
    printf "  %-18s %s (%s)\n" "$status" "$name" "$rest"
  else
    printf "  %-18s %s\n" "$status" "$name"
  fi
done
echo "PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
[[ $FAIL -eq 0 ]]
