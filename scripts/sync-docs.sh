#!/usr/bin/env bash
# Reprend la documentation du dépôt openbastion/openbastion dans ./docs.
set -euo pipefail

REPO="${OPENBASTION_REPO:-https://github.com/openbastion/openbastion.git}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Clonage de $REPO"
git clone --depth 1 "$REPO" "$WORK/upstream"
SRC="$WORK/upstream/docs"

# 1. L'index général devient une page du site ; les index de section deviennent des index.md.
mv "$SRC/README.md" "$SRC/documentation.md"
find "$SRC" -name README.md | while read -r file; do mv "$file" "$(dirname "$file")/index.md"; done

# 2. Les liens de page doivent viser les nouveaux noms, et sortir du dossier docs/ par une URL.
find "$SRC" -name '*.md' -print0 | xargs -0 sed -i -E \
  -e 's#\]\(\.\./README\.md\)#](../documentation.md)#g' \
  -e 's#\]\(\.\./NOTES_SANDBOX\.md\)#](https://github.com/openbastion/openbastion/blob/main/NOTES_SANDBOX.md)#g' \
  -e 's#\]\(\.\./\.\./([^)]+)\)#](https://github.com/openbastion/openbastion/blob/main/\1)#g' \
  -e 's#\]\(([^)]*)README\.md#](\1index.md#g'

# 3. Remplacement des sections ; la page d'accueil et la configuration du site sont conservées.
rm -rf "$ROOT"/docs/{architecture,adr,api,security,development,deployment,administration,user-guide,operations,compliance}
cp -a "$SRC"/. "$ROOT/docs"/

echo "Documentation synchronisée depuis $(git -C "$WORK/upstream" rev-parse --short HEAD)"
