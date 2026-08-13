#!/bin/bash

if ! command -v nvm; then
  # Install NVM
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash

  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

  nvm install v22
  nvm use v22
  npm i -g pnpm
elif
  nvm use v22
fi

# Install & Setup latex packages
if ! command -v tlmgr; then
  wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh
  tlmgr install relsize carlisle fontaxes enumitem titlesec xcharter xstring
fi

if ! command -v nginx; then
  sudo apt install nginx
fi

git clone https://github.com/whoami-amrit/michikan.git

cd michikan

pnpm i --frozen-lockfile

pnpm run build

# setup logging
if ! ls /var/log/michikan; then
  mkdir -p /var/log/michikan
fi

#### START WORKER
nohup node apps/api/dist/worker/worker.main.js > /var/log/michikan/worker.log 2>&1 & 
#### START API
nohup node apps/api/dist/api/main.js > /var/log/michikan/api.log 2>&1 & 

#### START WEB
mkdir -p /var/www/web/dist
cp -r apps/web/dist /var/www/web/dist
cat << 'EOF' > michi-web.conf
server {
    listen 8000;
    root /var/www/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:5252/api/;
        proxy_set_header Host http://api:5252;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF
nohup nginx -g daemon off > /var/log/michikan/web.log 2>&1 &

