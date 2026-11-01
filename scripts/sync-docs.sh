#!/usr/bin/env bash
# Synchronise ./docs avec le dossier docs/ du dépôt openbastion/openbastion.
#
# Les pages copiées sont un miroir de l'amont : une correction durable se fait
# dans le dépôt principal. Une retouche locale reste possible, mais le script ne
# l'écrase plus silencieusement. Il compare chaque page à l'état de la dernière
# synchronisation (scripts/sync-docs.manifest) :
#   - seule l'amont a changé  -> la page locale est remplacée ;
#   - seule la copie a changé -> la page locale est conservée et signalée ;
#   - les deux ont changé     -> fusion à trois points ; les chevauchements
#                                laissent des marqueurs de conflit à résoudre.
# Une page supprimée en amont est retirée, sauf si elle a été modifiée ici.
# docs/index.md, docs/public/ et docs/.vitepress/ ne sont jamais touchés.
#
# Usage : ./scripts/sync-docs.sh [--dry-run] [--force]
#   -n, --dry-run  affiche les actions sans rien écrire
#       --force    miroir strict : écrase les modifications locales
#   -h, --help     affiche cette aide
#
# Variable : OPENBASTION_REPO, dépôt amont à reprendre.
#
# Code retour : 0 si tout est synchronisé, 1 s'il reste des conflits à résoudre,
# 2 si la synchronisation n'a pas pu démarrer.
set -euo pipefail

REPO="${OPENBASTION_REPO:-https://github.com/openbastion/openbastion.git}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS="$ROOT/docs"
MANIFEST="$ROOT/scripts/sync-docs.manifest"
MANIFEST_HEADER="# sync-docs manifest v1 — état de la dernière synchronisation, ne pas éditer à la main"

DRY_RUN=0
FORCE=0

usage() {
  cat <<'EOF'
Usage : ./scripts/sync-docs.sh [--dry-run] [--force]

  -n, --dry-run  affiche les actions sans rien écrire
      --force    écrase les modifications locales (miroir strict de l'amont)

Le script reprend docs/ du dépôt openbastion/openbastion, renomme les pages
d'index et réécrit les liens sortants. Les modifications locales des pages
copiées sont conservées, fusionnées ou signalées comme conflits.
EOF
}

warn() { printf 'sync-docs : %s\n' "$*" >&2; }

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--dry-run) DRY_RUN=1 ;;
    --force) FORCE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) warn "option inconnue : $1"; usage >&2; exit 2 ;;
  esac
  shift
done

if [ "${BASH_VERSINFO[0]}" -lt 4 ] ||
  { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -lt 3 ]; }; then
  warn "bash 4.3 ou plus est requis (macOS : brew install bash)"
  exit 2
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# Pages écrites ici ou par VitePress : jamais écrasées par la synchronisation.
is_protected() {
  case "$1" in
    index.md|public/*|.vitepress/*) return 0 ;;
  esac
  return 1
}

install_file() { # $1 = source, $2 = destination
  [ "$DRY_RUN" = 1 ] && return 0
  mkdir -p "$(dirname "$2")"
  cp "$1" "$2"
}

has_conflict_markers() {
  grep -qE '^<{7}( |$)' "$1"
}

# Contenu de la dernière synchronisation pour une page, extrait du commit où le
# manifeste a été enregistré. Sert de base à la fusion à trois points.
base_content() { # $1 = page relative à docs/, $2 = fichier de sortie
  local known="${BASE[$1]-}"
  [ -n "$known" ] && [ -n "$SYNC_COMMIT" ] || return 1
  git -C "$ROOT" show "$SYNC_COMMIT:docs/$1" > "$2" 2>/dev/null || return 1
  [ "$(hash_file "$2")" = "$known" ] || return 1
}

echo "Clonage de $REPO"
if ! git clone --quiet --depth 1 "$REPO" "$WORK/upstream"; then
  warn "clonage impossible depuis $REPO"
  exit 2
fi
SRC="$WORK/upstream/docs"
UPSTREAM_COMMIT="$(git -C "$WORK/upstream" rev-parse --short HEAD)"

if [ ! -f "$SRC/README.md" ]; then
  warn "docs/README.md introuvable dans $REPO ($UPSTREAM_COMMIT)"
  exit 2
fi

# 1. L'index général devient une page du site ; les index de section deviennent des index.md.
mv "$SRC/README.md" "$SRC/documentation.md"
find "$SRC" -name README.md | while read -r file; do mv "$file" "$(dirname "$file")/index.md"; done

# 2. Les liens de page doivent viser les nouveaux noms, et sortir du dossier docs/ par une URL.
find "$SRC" -name '*.md' -print0 | xargs -0 sed -i -E \
  -e 's#\]\(\.\./README\.md\)#](../documentation.md)#g' \
  -e 's#\]\(\.\./NOTES_SANDBOX\.md\)#](https://github.com/openbastion/openbastion/blob/main/NOTES_SANDBOX.md)#g' \
  -e 's#\]\(\.\./\.\./([^)]+)\)#](https://github.com/openbastion/openbastion/blob/main/\1)#g' \
  -e 's#\]\(([^)]*)README\.md#](\1index.md#g'

# 3. État de la dernière synchronisation.
declare -A BASE=()
if [ -f "$MANIFEST" ] && [ "$(head -n 1 "$MANIFEST")" = "$MANIFEST_HEADER" ]; then
  while IFS=$'\t' read -r hash rel; do
    [ -n "$hash" ] && BASE["$rel"]="$hash"
  done < <(tail -n +2 "$MANIFEST")
elif [ -f "$MANIFEST" ]; then
  warn "manifeste illisible ($MANIFEST) : synchronisation sans détection de conflits"
fi

SYNC_COMMIT="$(git -C "$ROOT" log -1 --format=%H -- scripts/sync-docs.manifest 2>/dev/null || true)"

mapfile -t UPSTREAM_FILES < <(cd "$SRC" && find . -type f | sed 's|^\./||' | LC_ALL=C sort)
[ "${#UPSTREAM_FILES[@]}" -gt 0 ] || { warn "docs/ vide dans $REPO ($UPSTREAM_COMMIT)"; exit 2; }

declare -A UPSTREAM_SET=()
declare -A NEW_MANIFEST=()
ADDED=(); UPDATED=(); OVERWRITTEN=(); REMOVED=(); MERGED=(); KEPT=(); CONFLICTS=()

for rel in "${UPSTREAM_FILES[@]}"; do
  is_protected "$rel" && continue
  UPSTREAM_SET["$rel"]=1

  ufile="$SRC/$rel"
  tfile="$DOCS/$rel"
  uhash="$(hash_file "$ufile")"
  known="${BASE[$rel]-}"

  # Page absente localement : ajout, suppression locale ou fichier disparu.
  if [ ! -e "$tfile" ]; then
    if [ -z "$known" ]; then
      install_file "$ufile" "$tfile"
      ADDED+=("$rel")
      NEW_MANIFEST["$rel"]="$uhash"
    elif [ "$uhash" = "$known" ]; then
      KEPT+=("$rel  (supprimé localement, toujours présent en amont)")
      NEW_MANIFEST["$rel"]="$known"
    else
      CONFLICTS+=("$rel  (supprimé localement, modifié en amont)")
      NEW_MANIFEST["$rel"]="$uhash"
    fi
    continue
  fi

  lhash="$(hash_file "$tfile")"
  if [ "$lhash" = "$uhash" ]; then
    NEW_MANIFEST["$rel"]="$uhash"
    continue
  fi

  # Seule l'amont a changé (ou miroir forcé, ou pas d'état de référence).
  if [ "$FORCE" = 1 ] || [ -z "$known" ] || [ "$lhash" = "$known" ]; then
    install_file "$ufile" "$tfile"
    if [ -n "$known" ] && [ "$lhash" = "$known" ]; then
      UPDATED+=("$rel")
    else
      OVERWRITTEN+=("$rel")
    fi
    NEW_MANIFEST["$rel"]="$uhash"
    continue
  fi

  # Seule la copie locale a changé : elle est conservée telle quelle.
  if [ "$uhash" = "$known" ]; then
    if has_conflict_markers "$tfile"; then
      CONFLICTS+=("$rel  (marqueurs de conflit non résolus)")
    else
      KEPT+=("$rel  (modifié localement)")
    fi
    NEW_MANIFEST["$rel"]="$known"
    continue
  fi

  # Les deux côtés ont changé : fusion à trois points.
  if base_content "$rel" "$WORK/base"; then
    cp "$tfile" "$WORK/ours"
    cp "$ufile" "$WORK/theirs"
    rc=0
    git merge-file -p \
      -L "copie locale" -L "dernière synchro" -L "amont" \
      "$WORK/ours" "$WORK/base" "$WORK/theirs" \
      > "$WORK/merged" 2> "$WORK/merge.err" || rc=$?
    if [ "$rc" -eq 0 ]; then
      install_file "$WORK/merged" "$tfile"
      MERGED+=("$rel")
      NEW_MANIFEST["$rel"]="$(hash_file "$WORK/merged")"
    elif [ "$rc" -lt 128 ]; then
      install_file "$WORK/merged" "$tfile"
      CONFLICTS+=("$rel  ($rc conflit(s), marqueurs « <<<<<<< » dans la page)")
      NEW_MANIFEST["$rel"]="$uhash"
    else
      CONFLICTS+=("$rel  (fusion impossible : $(tr '\n' ' ' < "$WORK/merge.err"))")
      NEW_MANIFEST["$rel"]="$uhash"
    fi
  else
    CONFLICTS+=("$rel  (modifié localement et en amont, base de fusion indisponible)")
    NEW_MANIFEST["$rel"]="$uhash"
  fi
done

# 4. Pages disparues de l'amont.
for rel in "${!BASE[@]}"; do
  [ -z "${UPSTREAM_SET[$rel]-}" ] || continue
  tfile="$DOCS/$rel"
  [ -e "$tfile" ] || continue
  if [ "$FORCE" = 1 ] || [ "$(hash_file "$tfile")" = "${BASE[$rel]}" ]; then
    [ "$DRY_RUN" = 1 ] || rm -f "$tfile"
    REMOVED+=("$rel")
  else
    CONFLICTS+=("$rel  (supprimé en amont, modifié localement : page conservée)")
  fi
done

if [ "$DRY_RUN" = 0 ]; then
  # Dossiers vidés par des suppressions, hors zones protégées.
  find "$DOCS" -mindepth 1 -depth -type d -empty \
    -not -path "$DOCS/.vitepress*" -not -path "$DOCS/public*" -delete 2>/dev/null || true

  {
    printf '%s\n' "$MANIFEST_HEADER"
    for rel in "${!NEW_MANIFEST[@]}"; do
      printf '%s\t%s\n' "${NEW_MANIFEST[$rel]}" "$rel"
    done | LC_ALL=C sort -k2
  } > "$MANIFEST.tmp"
  mv "$MANIFEST.tmp" "$MANIFEST"
fi

report() { # $1 = libellé, $2 = nom du tableau de pages
  local label="$1"
  local -n pages="$2"
  [ "${#pages[@]}" -gt 0 ] || return 0
  printf '\n%s (%d) :\n' "$label" "${#pages[@]}"
  printf '  %s\n' "${pages[@]}"
}

report "Pages ajoutées" ADDED
report "Pages mises à jour" UPDATED
report "Pages remplacées sans fusion" OVERWRITTEN
report "Pages supprimées" REMOVED
report "Pages fusionnées" MERGED
report "Pages locales conservées" KEPT
report "Conflits à résoudre" CONFLICTS

if [ "$DRY_RUN" = 1 ]; then
  printf '\nSimulation : aucune modification écrite (amont %s).\n' "$UPSTREAM_COMMIT"
else
  printf '\nDocumentation synchronisée depuis %s\n' "$UPSTREAM_COMMIT"
fi

if [ "${#CONFLICTS[@]}" -gt 0 ]; then
  warn "des conflits restent à résoudre : éditez les pages signalées, puis relancez la synchronisation"
  exit 1
fi
