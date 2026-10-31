#!/bin/bash
file=$(jq -r '.tool_input.file_path // empty')
root="$CLAUDE_PROJECT_DIR"
[ -f "$file" ] || exit 0

case "$file" in
  "$root"/client/*.ts|"$root"/client/*.tsx)
    cd "$root/client" || exit 0
    out=$(npx biome check --write --no-errors-on-unmatched "$file" 2>&1) || {
      echo "biome 에러 (자동 수정 후 남은 항목):" >&2
      echo "$out" >&2
      exit 2
    }
    ;;
  "$root"/server/*.py)
    cd "$root/server" || exit 0
    uv run ruff format -q "$file" >/dev/null 2>&1
    out=$(uv run ruff check --fix -q "$file" 2>&1) || {
      echo "ruff 에러 (자동 수정 후 남은 항목):" >&2
      echo "$out" >&2
      exit 2
    }
    ;;
esac
exit 0
