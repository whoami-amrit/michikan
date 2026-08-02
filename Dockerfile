# ==========================================
# 1. Base Build Environment
# ==========================================
FROM node:24-slim AS base-node
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base-node AS build
WORKDIR /usr/src/app
ENV CI=true
COPY pnpm-lock.yaml package.json .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline --ignore-scripts
COPY . .
RUN pnpm build 
RUN pnpm deploy --filter=web --prod /prod/web
RUN pnpm deploy --filter=api --prod /prod/api

# ==========================================
# 2. Web / Frontend Target
# ==========================================
FROM nginx:alpine AS web
COPY --from=build /prod/web/dist /var/www/web/dist
WORKDIR /etc/nginx/conf.d
RUN cat << 'EOF' > michi-web.conf
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
EXPOSE 8000
CMD ["nginx", "-g", "daemon off;"]

# ==========================================
# 3. API Target
# ==========================================
FROM node:24-slim AS api
WORKDIR /prod/api
COPY --from=build /prod/api/dist/api /prod/api
EXPOSE 5143
CMD [ "node", "main.js" ]

# ==========================================
# 4. Workers Target
# ==========================================
FROM node:24-slim AS workers
WORKDIR /prod/workers
COPY --from=build /prod/api/dist/worker /prod/workers

RUN apt-get update && apt-get install -y --no-install-recommends \
    perl \
    xz-utils \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh
ENV PATH="/root/bin:$PATH"

RUN tlmgr install relsize carlisle fontaxes enumitem titlesec xcharter xstring

CMD [ "node", "worker.main.js" ]
