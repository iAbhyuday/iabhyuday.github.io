#!/usr/bin/env bash
# Start a topic map in _notes/ (not published on the site).
# Usage: ./new-topic.sh <slug> "Topic name"
set -euo pipefail
slug="${1:?usage: ./new-topic.sh <slug> \"Topic name\"}"
topic="${2:?give the topic name in quotes}"
f="_notes/$slug.md"
[ -e "$f" ] && { echo "$f already exists" >&2; exit 1; }
sed -e "s/{{TOPIC}}/$topic/" -e "s/{{DATE}}/$(date +%Y-%m-%d)/" _notes/TEMPLATE.md > "$f"
echo "Created $f. Fill in sections 0-3 and 8 before you start learning."
