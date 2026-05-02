#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${PM2_APP_NAME:-businessplan}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

read_env() {
  local key="$1"
  if [ ! -f .env ]; then
    return 0
  fi
  grep -E "^[[:space:]]*${key}[[:space:]]*=" .env | tail -n 1 | sed -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//; s/^['\"]//; s/['\"]$//"
}

DATABASE_URL_VALUE="${DATABASE_URL:-$(read_env DATABASE_URL)}"
UPLOAD_DIR_VALUE="${UPLOAD_DIR:-$(read_env UPLOAD_DIR)}"

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.production.example to .env and edit it first."
  exit 1
fi

if [[ ! "$DATABASE_URL_VALUE" =~ ^mysql:// ]]; then
  echo "DATABASE_URL must be MySQL for VPS deploy."
  exit 1
fi

mkdir -p public/uploads public/pdfs
if [ -n "$UPLOAD_DIR_VALUE" ]; then
  mkdir -p "$UPLOAD_DIR_VALUE"
fi

npm ci
npm run db:migrate:deploy:mysql
npm run build

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start npm --name "$APP_NAME" -- start
fi

pm2 save
