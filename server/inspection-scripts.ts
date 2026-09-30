// Paths are passed as Bash positional arguments, never interpolated into scripts.
export const directoryScript = `set -uo pipefail
[ -d "$1" ] || { printf 'Not a directory' >&2; exit 1; }
find -- "$1" -mindepth 1 -maxdepth 1 -printf '%y\\0%f\\0%s\\0' | head -z -n 1503
result=\${PIPESTATUS[0]}
[ "$result" -eq 0 ] || [ "$result" -eq 141 ]`;
export const fileScript = `set -euo pipefail
[ -f "$1" ] && [ ! -L "$1" ] || { printf 'Only regular files may be viewed' >&2; exit 1; }
size=$(stat -c %s -- "$1")
[ "$size" -le 1048576 ] || { printf 'File exceeds the 1 MiB viewer limit' >&2; exit 1; }
head -c 1048577 -- "$1" | base64 -w 0`;
export const diskScript = `set -u
[ -d "$1" ] || { printf 'Not a directory' >&2; exit 1; }
du -x -B1 --max-depth=1 --null -- "$1" 2>/dev/null | sort -z -nr | head -z -n 21
result=\${PIPESTATUS[0]}
printf '\\0%s\\0' "$result"
df -B1 --output=size,used,avail,pcent,target -- "$1"`;
