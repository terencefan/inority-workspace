# Build from the workspace root:
# docker build -f inority-workspace/handbook/Dockerfile -t handbook:latest .
#
# This image is self-contained: it installs site dependencies, builds the
# React app, packages Markdown sources, and serves everything from one Node
# process.

FROM node:22-bookworm-slim AS site-builder

WORKDIR /src/handbook

COPY inority-workspace/handbook/package.json ./package.json
COPY inority-workspace/handbook/package-lock.json ./package-lock.json

RUN npm ci

COPY inority-workspace/handbook/vite.config.ts ./vite.config.ts
COPY inority-workspace/handbook/src ./src

RUN npm run build


FROM node:22-bookworm-slim AS markdown-packager

WORKDIR /src/workspace

COPY . ./

RUN mkdir -p /out/workspace \
    && find . \
        \( -path "./.*" -o -path "*/.*" -o -path "./AGENTS.md" -o -path "./.codex" -o -path "./.codex/*" -o -path "*/node_modules" \) -prune -o \
        -type f -name "*.md" \
        -exec cp --parents {} /out/workspace \; \
    && find ./slides \
        \( -path "./slides/.*" -o -path "./slides/*/node_modules" -o -path "./slides/*/node_modules/*" \) -prune -o \
        -type f \
        -exec cp --parents {} /out/workspace \; 2>/dev/null || true


FROM node:22-bookworm-slim AS runtime

WORKDIR /workspace/handbook

ENV NODE_ENV=production
ENV HANDBOOK_HOST=0.0.0.0
ENV HANDBOOK_PORT=18080

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-noto-cjk \
        graphviz \
        ripgrep \
    && rm -rf /var/lib/apt/lists/*

COPY inority-workspace/handbook/package.json ./package.json
COPY inority-workspace/handbook/src ./src
COPY --from=site-builder /src/handbook/src/dist ./src/dist
COPY --from=site-builder /src/handbook/node_modules/@viz-js ./node_modules/@viz-js
COPY --from=markdown-packager /out/workspace /workspace

EXPOSE 18080

CMD ["node", "src/index.ts"]
