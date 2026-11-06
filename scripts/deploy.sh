#!/usr/bin/env bash
# Deploy Michikan to a Linode running Alpine Linux (OpenRC, musl). Run from your laptop:
#
#   ./scripts/deploy.sh
#
# Build happens LOCALLY. The server only clones the repo (for manifests + lockfile),
# receives the compiled output via rsync, and runs `pnpm install --prod`.
# Idempotent: the first run provisions the box, later runs just update it.
#
# Prereqs on your laptop: git, pnpm, node, ssh, rsync, and a gitignored `.env.prod`
# (copied to the server as .env; must contain API_PORT=5252, VALKEY_HOST=localhost, ENV=production).
# Root SSH key access must already work (ssh-copy-id root@HOST).
#
# Overrides: DEPLOY_HOST=root@1.2.3.4 DEPLOY_SSH_KEY=~/.ssh/other ./scripts/deploy.sh
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-root@45.56.69.83}"
HOST_ADDR="${DEPLOY_HOST#*@}"
APP_USER="michikan"
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/michikan"
REPO_URL="https://github.com/whoami-amrit/michikan.git"
WEB_ROOT="/var/www/michikan/web"
API_PORT=5252

cd "$(git rev-parse --show-toplevel)"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_whoami}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -f "$SSH_KEY" ]; then SSH_OPTS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes); fi
remote()     { ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"; }
remote_app() { ssh "${SSH_OPTS[@]}" "${APP_USER}@${HOST_ADDR}" "$@"; }

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
grep -q "^API_PORT=${API_PORT}[[:space:]]*$" .env.prod \
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
  die "Key login failed. Run: ssh-copy-id -i ${SSH_KEY}.pub ${DEPLOY_HOST}"
fi
remote 'grep -qi "^ID=alpine" /etc/os-release' || die "Target is not Alpine Linux; this script is Alpine-specific."

# ---------------------------------------------------------------- 4. provision (root, idempotent)
log "Provisioning server"
# Alpine ships only busybox sh; bring in bash first so the provisioning script can use it.
remote 'command -v bash >/dev/null || apk add --no-cache bash'
remote "APP_USER=${APP_USER} PNPM_VERSION=${PNPM_VERSION} API_PORT=${API_PORT} WEB_ROOT=${WEB_ROOT} bash -s" <<'PROVISION'
set -euo pipefail
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/michikan"

apk update -q
apk add --no-cache \
  bash ca-certificates curl wget git rsync openssh-client \
  nodejs npm nginx redis ufw iptables \
  perl xz tar shadow

# pnpm, pinned to the repo's packageManager version
if [ "$(pnpm --version 2>/dev/null || true)" != "${PNPM_VERSION}" ]; then
  npm install -g "pnpm@${PNPM_VERSION}"
fi

# App user: key-only login (shadow '*' = no password, but not locked, so sshd accepts keys)
if ! id "${APP_USER}" >/dev/null 2>&1; then
  adduser -D -s /bin/bash "${APP_USER}"
fi
sed -i "s/^${APP_USER}:!:/${APP_USER}:*:/" /etc/shadow
install -d -m 700 -o "${APP_USER}" -g "${APP_USER}" "${APP_HOME}/.ssh"
cp /root/.ssh/authorized_keys "${APP_HOME}/.ssh/authorized_keys"
chown "${APP_USER}:${APP_USER}" "${APP_HOME}/.ssh/authorized_keys"
chmod 600 "${APP_HOME}/.ssh/authorized_keys"

# Redis: localhost only, BullMQ-safe eviction policy, capped memory
REDIS_CONF=/etc/redis.conf
[ -f "$REDIS_CONF" ] || REDIS_CONF=/etc/redis/redis.conf
if ! grep -q '# michikan-managed' "$REDIS_CONF"; then
  cat >> "$REDIS_CONF" <<'EOF'

# michikan-managed (last directive wins)
bind 127.0.0.1 -::1
protected-mode yes
maxmemory 128mb
maxmemory-policy noeviction
EOF
fi
rc-update add redis default >/dev/null
rc-service redis restart

# TinyTeX for LaTeX resume rendering (as the app user)
if [ ! -d "${APP_HOME}/.TinyTeX" ]; then
  su -s /bin/bash "${APP_USER}" -c 'cd ~ && wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh'
fi
TEX_BIN="$(ls -d "${APP_HOME}"/.TinyTeX/bin/* | head -1)"
# tlmgr refuses to install until it has updated itself (the TinyTeX bundle lags the repo)
su -s /bin/bash "${APP_USER}" -c "cd ~ && '${TEX_BIN}/tlmgr' update --self && '${TEX_BIN}/tlmgr' install relsize carlisle fontaxes enumitem titlesec xcharter xstring"

# Launcher: loads .env then execs node (OpenRC has no EnvironmentFile)
cat > /usr/local/bin/michikan-run <<EOF
#!/bin/sh
cd "${APP_DIR}" || exit 1
set -a
. "${APP_DIR}/.env"
set +a
export PATH="${TEX_BIN}:\$PATH"
exec node "\$@"
EOF
chmod 755 /usr/local/bin/michikan-run

mkdir -p /var/log/michikan
chown "${APP_USER}:${APP_USER}" /var/log/michikan

# OpenRC services
for svc in api worker; do
  if [ "$svc" = api ]; then entry="apps/api/dist/api/main.js"; else entry="apps/api/dist/worker/worker.main.js"; fi
  cat > "/etc/init.d/michikan-${svc}" <<EOF
#!/sbin/openrc-run
name="michikan-${svc}"
description="Michikan ${svc}"
supervisor="supervise-daemon"
command="/usr/local/bin/michikan-run"
command_args="${entry}"
command_user="${APP_USER}:${APP_USER}"
output_log="/var/log/michikan/${svc}.log"
error_log="/var/log/michikan/${svc}.log"
respawn_delay=5
respawn_max=0

depend() {
  need net redis
}
EOF
  chmod 755 "/etc/init.d/michikan-${svc}"
  rc-update add "michikan-${svc}" default >/dev/null
done

# Log rotation for the app logs
cat > /etc/logrotate.d/michikan <<'EOF'
/var/log/michikan/*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}
EOF

# Nginx: serve the SPA, proxy /api/ (HTTP only for now)
mkdir -p "${WEB_ROOT}"
rm -f /etc/nginx/http.d/default.conf
cat > /etc/nginx/http.d/michikan.conf <<EOF
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
rc-update add nginx default >/dev/null
rc-service nginx restart

# Firewall: SSH + HTTP only. Rules are added before enabling so we never lock ourselves out.
# Non-fatal: the Linode kernel may lack netfilter modules; then use Linode Cloud Firewall instead.
if ufw allow 22/tcp >/dev/null && ufw allow 80/tcp >/dev/null && ufw --force enable >/dev/null 2>&1; then
  rc-update add ufw default >/dev/null 2>&1 || true
  echo "ufw enabled (22, 80)"
else
  echo "WARNING: could not enable ufw; use a Linode Cloud Firewall to restrict ports." >&2
fi
PROVISION

# ---------------------------------------------------------------- 5. clone / checkout exact commit
log "Cloning/updating repo at ${SHA:0:8}"
remote_app bash -s <<CLONE
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
RSYNC=(rsync -az --delete -e "ssh ${SSH_OPTS[*]}")
"${RSYNC[@]}" apps/api/dist/                "${APP_USER}@${HOST_ADDR}:${APP_DIR}/apps/api/dist/"
"${RSYNC[@]}" apps/web/dist/                "${APP_USER}@${HOST_ADDR}:${APP_DIR}/apps/web/dist/"
"${RSYNC[@]}" packages/database/dist/       "${APP_USER}@${HOST_ADDR}:${APP_DIR}/packages/database/dist/"
"${RSYNC[@]}" packages/database/generated/  "${APP_USER}@${HOST_ADDR}:${APP_DIR}/packages/database/generated/"
"${RSYNC[@]}" packages/shared/dist/         "${APP_USER}@${HOST_ADDR}:${APP_DIR}/packages/shared/dist/"

log "Uploading .env"
scp "${SSH_OPTS[@]}" -q .env.prod "${APP_USER}@${HOST_ADDR}:${APP_DIR}/.env"
remote_app "chmod 600 ${APP_DIR}/.env"

# ---------------------------------------------------------------- 7. install prod deps + restart
log "Installing production dependencies"
remote_app bash -s <<INSTALL
set -euo pipefail
cd "${APP_DIR}"
pnpm install --frozen-lockfile --prod --ignore-scripts --filter 'api...'
INSTALL

log "Publishing web build and restarting services"
remote "rsync -a --delete ${APP_DIR}/apps/web/dist/ ${WEB_ROOT}/ \
  && rc-service michikan-api restart && rc-service michikan-worker restart"

# ---------------------------------------------------------------- 8. smoke tests
log "Smoke tests"
sleep 5
FAIL=0
check() { # name, command...
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "  ok    $name"; else echo "  FAIL  $name"; FAIL=1; fi
}
check "redis ping + noeviction" remote "redis-cli ping | grep -q PONG && redis-cli config get maxmemory-policy | grep -q noeviction"
check "api service running"     remote "rc-service michikan-api status | grep -q started"
check "worker service running"  remote "rc-service michikan-worker status | grep -q started"
check "bcrypt loads (musl)"     remote_app "cd ${APP_DIR}/apps/api && node -e \"require('bcrypt')\""
check "pdflatex test compile"   remote_app "bash -c 'set -e; export PATH=\$(ls -d ~/.TinyTeX/bin/* | head -1):\$PATH; d=\$(mktemp -d); cd \$d; printf \"\\\\documentclass{article}\\\\usepackage{enumitem,titlesec,XCharter,relsize,xstring}\\\\begin{document}ok\\\\end{document}\" > t.tex; pdflatex -interaction=nonstopmode t.tex >/dev/null; test -s t.pdf'"
check "GET / (nginx, SPA)"      curl -fsS --max-time 10 "http://${HOST_ADDR}/"
check "GET /api/health (proxy)" curl -fsS --max-time 10 "http://${HOST_ADDR}/api/health"

echo
if [ "$FAIL" -eq 0 ]; then
  log "Done. Deployed ${SHA:0:8} -> http://${HOST_ADDR}/"
else
  log "Deployed ${SHA:0:8}, but some checks failed (see above)."
fi
echo "Logs:  ssh ${DEPLOY_HOST} tail -f /var/log/michikan/api.log /var/log/michikan/worker.log"
exit "$FAIL"
