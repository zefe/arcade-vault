#!/usr/bin/env bash
# PostToolUse hook: format with Prettier and lint with ESLint after Write/Edit.
set -u

file=$(jq -r '.tool_input.file_path // empty')
project="${CLAUDE_PROJECT_DIR:-$(pwd)}"

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0
case "$file" in
  "$project"/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  */node_modules/*|*/.next/*|*/references/*) exit 0 ;;
esac

cd "$project" || exit 0

npx --no-install prettier --write --ignore-unknown --log-level warn "$file" >/dev/null 2>&1

case "$file" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    if ! out=$(npx --no-install eslint --fix "$file" 2>&1); then
      echo "ESLint errors in $file:" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac

exit 0
