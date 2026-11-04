#!/bin/bash
input=$(cat)
[ "$(echo "$input" | jq -r '.stop_hook_active')" = "true" ] && exit 0

root="$CLAUDE_PROJECT_DIR"
changed=$(git -C "$root" status --porcelain --untracked-files=all | awk '{print $NF}')
failed=0

if echo "$changed" | grep -qE '^client/.*\.tsx?$'; then
  out=$(cd "$root/client" && pnpm -s typecheck 2>&1) || {
    echo "client 타입체크 실패:" >&2
    echo "$out" | tail -40 >&2
    failed=1
  }
fi

py_files=$(echo "$changed" | grep -E '^server/.*\.py$' | sed 's#^server/##' | while read -r f; do [ -f "$root/server/$f" ] && echo "$f"; done)
if [ -n "$py_files" ]; then
  out=$(cd "$root/server" && echo "$py_files" | xargs uv run pyright 2>&1) || {
    echo "server 타입체크 실패:" >&2
    echo "$out" | tail -40 >&2
    failed=1
  }
fi

[ $failed -eq 1 ] && exit 2
exit 0
