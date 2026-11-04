#!/bin/bash
cmd=$(jq -r '.tool_input.command // empty')
root="$CLAUDE_PROJECT_DIR"

if echo "$cmd" | grep -qE '\bgh\s+pr\s+create\b'; then
  if ! echo "$cmd" | grep -qE '(--base[= ]|-B ?)dev\b'; then
    echo "git-guard: PR은 항상 dev 브랜치를 base로 생성해야 합니다. --base dev를 붙여 다시 실행하세요." >&2
    exit 2
  fi
fi

if echo "$cmd" | grep -qE '\bgit\s+push\b'; then
  branch=$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null)
  [ -z "$branch" ] || [ "$branch" = "HEAD" ] && exit 0
  prs=$(cd "$root" && gh pr list --head "$branch" --state all --json number,state 2>/dev/null) || exit 0
  open=$(echo "$prs" | jq '[.[] | select(.state == "OPEN")] | length')
  merged=$(echo "$prs" | jq -r '[.[] | select(.state == "MERGED") | "#\(.number)"] | join(", ")')
  if [ "$open" = "0" ] && [ -n "$merged" ]; then
    echo "git-guard: '$branch' 브랜치의 PR($merged)은 이미 머지됐습니다. 여기에 푸시하지 말고 새 브랜치를 만들어 새 PR로 올리세요." >&2
    exit 2
  fi
fi
exit 0
