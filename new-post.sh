#!/usr/bin/env bash
# Create a new post from _post-template.
# Usage: ./new-post.sh <slug> "Post title" ["one-line description"] ["cat1, cat2"]
set -euo pipefail
slug="${1:?usage: ./new-post.sh <slug> \"Post title\" [\"description\"] [\"cat1, cat2\"]}"
title="${2:?give a post title in quotes}"
desc="${3:-One sentence on what the reader will understand.}"
cats="${4:-notes}"
dir="posts/$slug"
[ -e "$dir" ] && { echo "posts/$slug already exists" >&2; exit 1; }
cp -R _post-template "$dir"
rm -f "$dir/README.md"
python3 - "$dir/index.qmd" "$title" "$desc" "$(date +%Y-%m-%d)" "$cats" <<'PY'
import sys
p, title, desc, date, cats = sys.argv[1:]
s = open(p).read()
for k, v in {"{{TITLE}}": title.replace('"', '\\"'), "{{DESCRIPTION}}": desc.replace('"', '\\"'), "{{DATE}}": date, "{{CATEGORIES}}": cats}.items():
    s = s.replace(k, v)
open(p, "w").write(s)
PY
echo "Created $dir — edit $dir/index.qmd and $dir/figs.js, then preview with: quarto preview $dir/index.qmd"
