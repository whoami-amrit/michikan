#!/usr/bin/env bash
# Deploy Michikan to a Linode (Ubuntu) box. Run from your laptop:
#
#   ./scripts/deploy.sh
#
# Build happens LOCALLY. The server only clones the repo (for manifests + lockfile),
# receives the compiled output via rsync, and runs `pnpm install --prod`.
# Idempotent: the first run provisions the box, later runs just update it.
#
# Prereqs on your laptop: git, pnpm, ssh, rsync, and a gitignored `.env.prod`
# (copied to the server as .env; must contain API_PORT=5252, VALKEY_HOST=localhost, ENV=production).
#
# Overrides: DEPLOY_HOST=root@1.2.3.4 ./scripts/deploy.sh
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-root@45.56.69.83}"
APP_USER="michikan"
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/michikan"
REPO_URL="https://github.com/whoami-amrit/michikan.git"
WEB_ROOT="/var/www/michikan/web"
NODE_MAJOR=22
API_PORT=5252

cd "$(git rev-parse --show-toplevel)"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
remote() { ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"; }

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. local checks
log "Checking local state"
git diff --quiet && git diff --cached --quiet \
  || die "Uncommitted changes to tracked files. Commit them first, so the server clone matches what you build."
SHA="$(git rev-parse HEAD)"
git fetch -q origin
[ -n "$(git branch -r --contains "$SHA" 2>/dev/null)" ] \
  || die "Commit ${SHA:0:8} is not pushed to origin. Run: git push"
[ -f .env.prod ] || die ".env.prod not found in repo root. Create it (see header of this script)."
grep -q "^API_PORT=${API_PORT}\s*$" .env.prod \
  || die ".env.prod must set API_PORT=${API_PORT} (nginx proxies /api/ to 127.0.0.1:${API_PORT})."
PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")"

# ---------------------------------------------------------------- 2. local build
log "Building locally (commit ${SHA:0:8})"
pnpm install --frozen-lockfile
pnpm build
for d in apps/api/dist/api apps/api/dist/worker apps/web/dist \
         packages/database/dist packages/database/generated packages/shared/dist; do
  [ -d "$d" ] || die "Build output missing: $d"
done

# ---------------------------------------------------------------- 3. SSH key access
log "Checking SSH key access to ${DEPLOY_HOST}"
if ! ssh "${SSH_OPTS[@]}" -o BatchMode=yes "$DEPLOY_HOST" true 2>/dev/null; then
  echo "Key login not set up yet. ssh-copy-id will ask for the root password once."
  ssh-copy-id "${SSH_OPTS[@]}" "$DEPLOY_HOST"
fi

# ---------------------------------------------------------------- 4. provision (root, idempotent)
log "Provisioning server"
remote "APP_USER=${APP_USER} NODE_MAJOR=${NODE_MAJOR} PNPM_VERSION=${PNPM_VERSION} API_PORT=${API_PORT} WEB_ROOT=${WEB_ROOT} bash -s" <<'PROVISION'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/michikan"

# Base packages
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git rsync nginx ufw redis-server perl wget xz-utils

# Node (system-wide, from NodeSource)
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" != "${NODE_MAJOR}" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
corepack enable
corepack prepare "pnpm@${PNPM_VERSION}" --activate

# App user
id "${APP_USER}" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "${APP_USER}"

# Redis: localhost only, BullMQ-safe eviction policy, capped memory
if ! grep -q '# michikan-managed' /etc/redis/redis.conf; then
  cat >> /etc/redis/redis.conf <<'EOF'

# michikan-managed
bind 127.0.0.1 -::1
protected-mode yes
maxmemory 128mb
maxmemory-policy noeviction
EOF
fi
systemctl enable redis-server
systemctl restart redis-server

# TinyTeX for LaTeX resume rendering (as the app user)
if [ ! -d "${APP_HOME}/.TinyTeX" ]; then
  runuser -u "${APP_USER}" -- bash -c 'cd ~ && wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh'
fi
TEX_BIN="${APP_HOME}/.TinyTeX/bin/$(uname -m)-linux"
runuser -u "${APP_USER}" -- "${TEX_BIN}/tlmgr" install relsize carlisle fontaxes enumitem titlesec xcharter xstring

# Systemd units
cat > /etc/systemd/system/michikan-api.service <<EOF
[Unit]
Description=Michikan API
After=network.target redis-server.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node apps/api/dist/api/main.js
EnvironmentFile=${APP_DIR}/.env
Restart=always
RestartSec=5
SyslogIdentifier=michikan-api

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/michikan-worker.service <<EOF
[Unit]
Description=Michikan Worker
After=network.target redis-server.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=PATH=${TEX_BIN}:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/node apps/api/dist/worker/worker.main.js
EnvironmentFile=${APP_DIR}/.env
Restart=always
RestartSec=5
SyslogIdentifier=michikan-worker

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable michikan-api michikan-worker >/dev/null

# Nginx: serve the SPA, proxy /api/ (HTTP only for now)
mkdir -p "${WEB_ROOT}"
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/conf.d/michikan.conf <<EOF
server {
    listen 80 default_server;
    server_name _;
    root ${WEB_ROOT};
    index index.html;
    client_max_body_size 10m;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

# Firewall: SSH + HTTP only (SSH allowed first so we never lock ourselves out)
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw --force enable >/dev/null
PROVISION

# ---------------------------------------------------------------- 5. clone / checkout exact commit
log "Cloning/updating repo at ${SHA:0:8}"
remote "runuser -u ${APP_USER} -- bash -s" <<CLONE
set -euo pipefail
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}"
fi
cd "${APP_DIR}"
git fetch -q origin
git checkout -q --detach "${SHA}"
CLONE

# ---------------------------------------------------------------- 6. ship build output + env
log "Uploading build output"
RSYNC=(rsync -az --delete --chown="${APP_USER}:${APP_USER}" -e "ssh ${SSH_OPTS[*]}")
"${RSYNC[@]}" apps/api/dist/                "${DEPLOY_HOST}:${APP_DIR}/apps/api/dist/"
"${RSYNC[@]}" apps/web/dist/                "${DEPLOY_HOST}:${APP_DIR}/apps/web/dist/"
"${RSYNC[@]}" packages/database/dist/       "${DEPLOY_HOST}:${APP_DIR}/packages/database/dist/"
"${RSYNC[@]}" packages/database/generated/  "${DEPLOY_HOST}:${APP_DIR}/packages/database/generated/"
"${RSYNC[@]}" packages/shared/dist/         "${DEPLOY_HOST}:${APP_DIR}/packages/shared/dist/"

log "Uploading .env"
scp "${SSH_OPTS[@]}" -q .env.prod "${DEPLOY_HOST}:${APP_DIR}/.env"
remote "chown ${APP_USER}:${APP_USER} ${APP_DIR}/.env && chmod 600 ${APP_DIR}/.env"

# ---------------------------------------------------------------- 7. install prod deps + restart
log "Installing production dependencies"
remote "runuser -u ${APP_USER} -- bash -s" <<INSTALL
set -euo pipefail
cd "${APP_DIR}"
pnpm install --frozen-lockfile --prod --ignore-scripts --filter 'api...'
INSTALL

log "Publishing web build and restarting services"
remote "rsync -a --delete ${APP_DIR}/apps/web/dist/ ${WEB_ROOT}/ && systemctl restart michikan-api michikan-worker && sleep 3 && systemctl is-active michikan-api michikan-worker redis-server nginx"

log "Done. Deployed ${SHA:0:8} -> http://${DEPLOY_HOST#*@}/"
echo "Logs:  ssh ${DEPLOY_HOST} journalctl -u michikan-api -u michikan-worker -f"
