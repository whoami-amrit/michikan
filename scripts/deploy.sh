#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# 1. Load or Install NVM
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"

# Source nvm if it exists
if [ -s "$NVM_DIR/nvm.sh" ]; then
  \. "$NVM_DIR/nvm.sh"
fi

if ! command -v nvm >/dev/null 2>&1; then
  echo "Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install v22
  nvm use v22
  npm i -g pnpm
else
  nvm use v22
fi

# 2. Install & Setup LaTeX packages
if ! command -v tlmgr >/dev/null 2>&1; then
  echo "Installing TinyTeX..."
  wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh
  export PATH="$HOME/.TinyTeX/bin/$(uname -m)-linux:$PATH"
  tlmgr install relsize carlisle fontaxes enumitem titlesec xcharter xstring
fi

# 3. Install Nginx
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt update && sudo apt install -y nginx
fi

# 4. Clone or update repo
if [ ! -d "michikan" ]; then
  git clone https://github.com/whoami-amrit/michikan.git
  cd michikan
else
  cd michikan
  git switch main
  git pull
fi

pnpm i --frozen-lockfile
pnpm run build

# 5. Setup logging permissions
sudo mkdir -p /var/log/michikan
sudo chown -R "$USER:$USER" /var/log/michikan

#### CREATE SYSTEMD SERVICES
cat << 'EOF' | sudo tee /etc/systemd/system/michikan-api.service > /dev/null
[Unit]
Description=Michikan API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/michikan
# Absolute path to node + app entrypoint
ExecStart=/home/ubuntu/.nvm/versions/node/v22.23.2/bin/node apps/api/dist/api/main.js

# Automatically restart if it crashes
Restart=always
RestartSec=5

# Load environment variables (optional, if you use a .env file)
EnvironmentFile=/home/ubuntu/michikan/.env

# Standardizing logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=michikan-api

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' | sudo tee /etc/systemd/system/michikan-worker.service > /dev/null
[Unit]
Description=Michikan web Service
After=network.target michikan-api.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/michikan
ExecStart=/home/ubuntu/.nvm/versions/node/v22.23.2/bin/node apps/api/dist/worker/worker.main.js

# Automatically restart if it crashes
Restart=always
RestartSec=5

# Load environment variables (optional, if you use a .env file)
EnvironmentFile=/home/ubuntu/michikan/.env

# Standardizing logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=michikan-worker

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now michikan-api
sudo systemctl enable --now michikan-worker

#### START WEB
sudo mkdir -p /var/www/web
sudo cp -r apps/web/dist /var/www/web

# Deploy Nginx config directly to Nginx configuration path
cat << 'EOF' | sudo tee /etc/nginx/conf.d/michi-web.conf > /dev/null
server {
    listen 80;
    listen 443;
    root /var/www/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5252/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Test configuration and start/restart Nginx service
sudo nginx -t
sudo systemctl restart nginx
