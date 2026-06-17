# syntax=docker/dockerfile:1.7
#
# Build from the workspace root:
# docker build -f inority-workspace/handbook/Dockerfile -t handbook:latest .
#
# This image is self-contained: it installs site dependencies, builds the
# React app, packages Markdown sources, and serves everything from one Node
# process.
#
# Build context is the workspace root, trimmed by ../../.dockerignore and the
# markdown-packager find rules below. Do not widen COPY without updating both.

ARG BASE_IMAGE_PREFIX=
ARG NODE_BASE_IMAGE=library/node:22-bookworm-slim

FROM ${BASE_IMAGE_PREFIX}${NODE_BASE_IMAGE} AS site-builder

WORKDIR /src/handbook
ENV NODE_ENV=development
ENV npm_config_update_notifier=false
ENV npm_config_fund=false
ENV npm_config_audit=false

COPY inority-workspace/handbook/package.json ./package.json
COPY inority-workspace/handbook/package-lock.json ./package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --progress=false

COPY inority-workspace/handbook/vite.config.ts ./vite.config.ts
COPY inority-workspace/handbook/src ./src

RUN npm run build


FROM ${BASE_IMAGE_PREFIX}${NODE_BASE_IMAGE} AS markdown-packager

WORKDIR /out

RUN --mount=type=bind,source=.,target=/src/workspace,ro \
    mkdir -p /out/workspace \
    && cd /src/workspace \
    && find . \
        \( \
          -path "./.*" -o -path "*/.*" -o \
          -path "./AGENTS.md" -o -path "./.codex" -o -path "./.codex/*" -o \
          -path "./llama-cpp" -o -path "./llama-cpp/*" -o \
          -path "./k8s/canary/artifacts" -o -path "./k8s/canary/artifacts/*" -o \
          -path "./.recycle" -o -path "./.recycle/*" -o \
          -path "./tmp" -o -path "./tmp/*" -o \
          -path "*/node_modules" -o -path "*/node_modules/*" -o \
          -path "galaxy-library/galaxy-library-agent-classifier/tmp" -o -path "galaxy-library/galaxy-library-agent-classifier/tmp/*" -o \
          -path "galaxy-library/galaxy-library-api-perf/runs" -o -path "galaxy-library/galaxy-library-api-perf/runs/*" -o \
          -path "*/tmp/runs" -o -path "*/tmp/runs/*" \
        \) -prune -o \
        -type f \
        \( \
          -name "*.md" -o \
          -name "*.json" -o \
          -name "*.png" -o \
          -name "*.svg" -o \
          -name "*.jpg" -o \
          -name "*.jpeg" -o \
          -name "*.txt" \
        \) \
        -exec cp --parents {} /out/workspace \; \
    && find . \
        \( \
          -path "./.*" -o -path "*/.*" -o \
          -path "*/node_modules" -o -path "*/node_modules/*" \
        \) -prune -o \
        -type f -path "*/tests/resources/*" -name "*.jsonl" \
        -exec cp --parents {} /out/workspace \; \
    && find ./slides \
        \( -path "./slides/.*" -o -path "./slides/*/node_modules" -o -path "./slides/*/node_modules/*" \) -prune -o \
        -type f \
        -exec cp --parents {} /out/workspace \; 2>/dev/null || true


FROM ${BASE_IMAGE_PREFIX}${NODE_BASE_IMAGE} AS runtime

WORKDIR /workspace/handbook

ENV NODE_ENV=production
ENV HANDBOOK_HOST=0.0.0.0
ENV HANDBOOK_PORT=18080

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
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
