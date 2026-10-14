# Build from the workspace root:
# docker build -f inority-workspace/handbook/Dockerfile -t handbook:latest .
#
# The image packages host-built artifacts: run `npm run build` and
# `npm ci --omit=dev` in inority-workspace/handbook first (the canary
# Makefile handbook-deploy target does both), then build. The image build
# itself performs no network access.

ARG BASE_IMAGE_PREFIX=
ARG NODE_BASE_IMAGE=library/node:22-bookworm-slim

FROM --platform=$BUILDPLATFORM ${BASE_IMAGE_PREFIX}${NODE_BASE_IMAGE} AS markdown-packager

WORKDIR /src/workspace

COPY . ./

RUN mkdir -p /out/workspace \
    && find . \
        \( -path "./.*" -o -path "*/.*" -o -path "./AGENTS.md" -o -path "./.codex" -o -path "./.codex/*" -o -path "*/node_modules" \) -prune -o \
        -type f \
        \( \
          -name "*.md" -o \
          -name "*.json" -o \
          -name "*.jsonl" -o \
          -name "*.png" -o \
          -name "*.svg" -o \
          -name "*.jpg" -o \
          -name "*.jpeg" -o \
          -name "*.txt" \
        \) \
        -exec cp --parents {} /out/workspace \; \
    && find ./slides \
        \( -path "./slides/.*" -o -path "./slides/*/node_modules" -o -path "./slides/*/node_modules/*" \) -prune -o \
        -type f \
        -exec cp --parents {} /out/workspace \; 2>/dev/null || true


FROM ${BASE_IMAGE_PREFIX}${NODE_BASE_IMAGE} AS runtime

ARG DEBIAN_MIRROR=http://mirrors.tuna.tsinghua.edu.cn

WORKDIR /workspace/handbook

ENV NODE_ENV=production
ENV HANDBOOK_HOST=0.0.0.0
ENV HANDBOOK_PORT=18080

RUN sed -i "s|https\?://deb.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-noto-cjk \
        graphviz \
        ripgrep \
    && rm -rf /var/lib/apt/lists/*

COPY inority-workspace/handbook/package.json ./package.json
COPY inority-workspace/handbook/src ./src
COPY inority-workspace/handbook/src/dist ./src/dist
COPY inority-workspace/handbook/node_modules/@viz-js ./node_modules/@viz-js
COPY --from=markdown-packager /out/workspace /workspace

EXPOSE 18080

CMD ["node", "src/index.ts"]
