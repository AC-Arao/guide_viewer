#!/usr/bin/env bash
set -euo pipefail

# Electron-based always-on-top launcher (macOS) for Guide Viewer
# Requires: node + npm (first run will download Electron)

PORT=8123
PREVIEW=1
MARKDOWN=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]
  -p, --port <port>     Port to serve on (default: 8123)
  -m, --markdown <path> Markdown file to view (creates ./guide.md symlink)
      --no-preview      Do not append ?preview=1 to the URL
  -h, --help            Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      PORT="${2:-}"
      shift 2 ;;
    -m|--markdown)
      MARKDOWN="${2:-}"
      shift 2 ;;
    --no-preview)
      PREVIEW=0
      shift ;;
    -h|--help)
      usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1 ; then
  echo "Node.js/npm が必要です。https://nodejs.org/ からインストールしてください。" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1 ; then
  echo "python3 が見つかりません。インストールしてください。" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure ./guide.md exists; if not, interactively select from ./input/*.md
if [[ ! -e "./guide.md" ]]; then
  if [[ -z "$MARKDOWN" ]]; then
    shopt -s nullglob
    CANDIDATES=(./input/*.md)
    shopt -u nullglob
    if (( ${#CANDIDATES[@]} == 0 )); then
      echo "./input 配下に .md ファイルがありません。\ninput/ フォルダに Markdown を配置してから再実行してください。" >&2
      exit 1
    fi
    if [[ -t 0 && -t 1 ]]; then
      echo "利用可能な Markdown ファイル:" >&2
      i=1
      for f in "${CANDIDATES[@]}"; do
        printf '  [%d] %s\n' "$i" "$f" >&2
        ((i++))
      done
      while :; do
        read -r -p "番号を選択してください: " ans
        [[ "$ans" =~ ^[0-9]+$ ]] || { echo "数字を入力してください" >&2; continue; }
        if (( ans >= 1 && ans <= ${#CANDIDATES[@]} )); then
          MARKDOWN="${CANDIDATES[ans-1]}"
          break
        else
          echo "範囲外の番号です" >&2
        fi
      done
    else
      echo "./guide.md が無く、対話選択もできません。-m/--markdown で ./input 配下の .md を指定してください。" >&2
      exit 1
    fi
  fi

  if [[ ! -f "$MARKDOWN" ]]; then
    echo "指定された Markdown が存在しません: $MARKDOWN" >&2
    exit 1
  fi

  ABS_MD="$(python3 -c 'import os,sys;print(os.path.abspath(sys.argv[1]))' "$MARKDOWN")"
  ln -s "$ABS_MD" ./guide.md || { echo "シンボリックリンク作成に失敗しました: $ABS_MD -> guide.md" >&2; exit 1; }
  echo "Linked ./guide.md -> $ABS_MD"
fi

URL="http://localhost:${PORT}"
if [[ "$PREVIEW" -eq 1 ]]; then URL="${URL}?preview=1"; fi

echo "Starting server on http://localhost:${PORT} ..."
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
cleanup() { trap - EXIT; kill "$SERVER_PID" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

# Wait until server responds (max ~5s)
for i in {1..25}; do
  if curl -s "http://localhost:${PORT}" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

echo "Launching Electron (always on top) ..."
cd "$SCRIPT_DIR/electron"

# Install deps on first run
if [[ ! -d node_modules ]]; then
  echo "Installing Electron with lockfile (初回のみ)"
  npm ci --silent
fi

DEMO_URL="$URL" npm start --silent
