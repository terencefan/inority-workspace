SHELL := /bin/bash

APP_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
WORKSPACE_ROOT := $(abspath $(APP_ROOT)/../..)

IMAGE_REPOSITORY ?= handbook
ifeq ($(origin TAG), undefined)
TAG := $(shell date +%Y-%m-%d-%H%M%S)
endif
IMAGE ?= $(IMAGE_REPOSITORY):$(TAG)

.PHONY: help build client-build test validate-markdown-links validate-clean-worktree install-git-hooks image-build image-push print-image

help:
	@printf '%s\n' \
	'Targets:' \
	'  make build                       Build handbook site assets' \
	'  make client-build                Legacy alias for make build' \
	'  make test                        Run backend regression tests' \
	'  make validate-markdown-links     Validate handbook Markdown internal links' \
	'  make validate-clean-worktree     Fail if the handbook git worktree is not clean' \
	'  make install-git-hooks           Configure repo-local git hooksPath to .githooks' \
	'  make image-build                 Build the integrated handbook image as $(IMAGE)' \
	'  make image-push                  Push $(IMAGE) to the registry' \
	'' \
	'Variables:' \
	'  TAG=2026-03-19-1                 Override the image tag' \
	'  IMAGE_REPOSITORY=ghcr.io/acme/handbook'

build:
	cd $(APP_ROOT) && npm run build

client-build: build

test:
	cd $(APP_ROOT) && npm run test

validate-markdown-links:
	cd $(APP_ROOT) && npm run validate:markdown-links -- --all

validate-clean-worktree:
	@status="$$(git -C $(APP_ROOT) status --short --untracked-files=all)"; \
		if [ "$${ALLOW_DIRTY_WORKTREE:-0}" = "1" ]; then \
			printf '%s\n' '[handbook] skipping clean-worktree validation because ALLOW_DIRTY_WORKTREE=1'; \
			exit 0; \
		fi; \
		if [ -n "$$status" ]; then \
			printf '%s\n' '[handbook] worktree is not clean; commit, stash, or remove local changes before publishing an image or release artifact' >&2; \
			printf '%s\n' "$$status" >&2; \
			exit 1; \
		fi

install-git-hooks:
	cd $(APP_ROOT) && npm run install-hooks

image-build:
	docker build -f $(APP_ROOT)/Dockerfile -t $(IMAGE) $(WORKSPACE_ROOT)

image-push:
	docker push $(IMAGE)

print-image:
	@printf '%s\n' $(IMAGE)
