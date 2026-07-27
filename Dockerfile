FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
ENV CI=true
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build 
RUN pnpm deploy --filter=web --prod /prod/web
RUN pnpm deploy --filter=api --prod /prod/api

FROM base AS web
RUN apt-get update && apt-get install -y nginx
COPY --from=build /prod/web /var/www/web
WORKDIR /etc/nginx/conf.d
RUN cat << 'EOF' > michi-web.conf
server {
    listen 8000;
    root /var/www/web/dist;
    index index.html;

    location / {
        # This line is critical for SPAs
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:5252/api/;
        proxy_set_header Host http://api:5252;
    }

    # Optional: Cache static assets heavily
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM base AS api
COPY --from=build /prod/api /prod/api
WORKDIR /prod/api
EXPOSE 5143
CMD [ "node", "dist/api/main.js" ]

FROM base AS workers
COPY --from=build /prod/api /prod/workers
WORKDIR /prod/workers
RUN apt-get update && apt-get install -y perl xz-utils wget
RUN wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh
ENV PATH="/root/bin:$PATH"
RUN tlmgr install relsize carlisle fontaxes enumitem titlesec xcharter xstring
CMD [ "node", "dist/worker/worker.main.js" ]
