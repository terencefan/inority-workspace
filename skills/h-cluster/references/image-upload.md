# H Registry Image Upload

Use this reference when pushing images to the H cluster registry, especially for idle service deployment.

## Registry Address

H registry host:

```bash
registry.h.pjlab.org.cn
```

Project shared image format:

```bash
registry.h.pjlab.org.cn/{project_name}/{image_version_name}
```

Example:

```bash
registry.h.pjlab.org.cn/ailab-sciversealign/model-service:smoke-20260629
```

Some H image repositories are exposed with a project-prefixed repository namespace. If the user gives a repository name such as `sciversealign_gpu` under project `ailab-sciversealign`, the writable path can be:

```bash
registry.h.pjlab.org.cn/ailab-sciversealign-sciversealign_gpu/mineru-html-fastapi:smoke-20260629
```

Do not assume `registry.h.pjlab.org.cn/sciversealign_gpu/...` is writable. If that form returns a registry-auth 404, try the project-prefixed form from the H console/CCR page, such as `{project_name}-{repo_name}/{image}:{tag}`.

Use the exact project/image path shown by the H console or CCR "client upload" page when available. A 401 usually means Docker is not logged in or the credentials are wrong. A 404 or `insufficient_scope` usually means the repository path is wrong, the image entry has not been created/shared, or the current account lacks permission.

## Login

Use credentials from the H console/CCR client upload page, not an AD password unless the platform explicitly says so.

```bash
docker login registry.h.pjlab.org.cn
```

Do not store registry usernames, passwords, AK/SK, or tokens in skill files, repo files, or chat summaries. If Docker stores credentials in `~/.docker/config.json`, mention that fact without printing the credential value.

## Normal Push

Tag the local image and push:

```bash
PROJECT=ailab-sciversealign
IMAGE=model-service
TAG=smoke-20260629

docker tag model-service:smoke registry.h.pjlab.org.cn/${PROJECT}/${IMAGE}:${TAG}
docker push registry.h.pjlab.org.cn/${PROJECT}/${IMAGE}:${TAG}
```

Verify remotely:

```bash
docker buildx imagetools inspect registry.h.pjlab.org.cn/${PROJECT}/${IMAGE}:${TAG}
```

## OCI Manifest Failure

The H registry can reject OCI manifests during quota handling:

```text
unsupported content type for manifest: application/vnd.oci.image.manifest.v1+json
```

If layers upload but the final manifest fails with that error, push a Docker v2 schema 2 manifest instead of an OCI manifest.

Build and push with Docker media types:

```bash
PROJECT=ailab-sciversealign
IMAGE=model-service
TAG=smoke-20260629

docker buildx build \
  --builder default \
  --push \
  --provenance=false \
  --sbom=false \
  --output type=image,name=registry.h.pjlab.org.cn/${PROJECT}/${IMAGE}:${TAG},push=true,oci-mediatypes=false \
  -f Dockerfile \
  .
```

Expected remote media type:

```text
application/vnd.docker.distribution.manifest.v2+json
```

## Manifest List Failure

The H registry can also reject manifest lists:

```text
Manifest.list is not supported.
```

This can happen when using `docker buildx imagetools create` to copy or retag an existing remote image. If the target path is authorized but the final PUT fails with `415 Unsupported Media Type` and `Manifest.list is not supported`, push a single Docker v2 manifest instead:

```bash
PROJECT_REPO=ailab-sciversealign-sciversealign_gpu
IMAGE=mineru-html-fastapi
TAG=smoke-20260629

docker buildx build \
  --builder default \
  --push \
  --provenance=false \
  --sbom=false \
  --output type=image,name=registry.h.pjlab.org.cn/${PROJECT_REPO}/${IMAGE}:${TAG},push=true,oci-mediatypes=false \
  -f Dockerfile \
  .
```

Verify the remote media type is exactly:

```text
application/vnd.docker.distribution.manifest.v2+json
```

## Repack an Existing Local Smoke Image

When the existing local image is already correct and only the manifest media type is the problem, avoid rebuilding large dependencies. Repack it through a tiny wrapper Dockerfile:

```Dockerfile
FROM model-service:smoke
LABEL org.opencontainers.image.description="Registry-compatible wrapper for H cluster"
```

Then push with Docker media types:

```bash
PROJECT_REPO=ailab-sciversealign
IMAGE=model-service
TAG=smoke-20260629
CONTEXT=/tmp/model-service-empty-context
WRAPPER=/tmp/model-service-registry-wrapper.Dockerfile

mkdir -p "${CONTEXT}"
docker buildx build \
  --builder default \
  --push \
  --provenance=false \
  --sbom=false \
  --output type=image,name=registry.h.pjlab.org.cn/${PROJECT_REPO}/${IMAGE}:${TAG},push=true,oci-mediatypes=false \
  -f "${WRAPPER}" \
  "${CONTEXT}"
```

Verify:

```bash
docker buildx imagetools inspect registry.h.pjlab.org.cn/${PROJECT_REPO}/${IMAGE}:${TAG}
```

## Idle Service Image Notes

- For H inference/idle service deployment, mark the image as usable for inference in the H console if the UI requires it.
- If creating the deployment for the first time, use a simple health endpoint such as `/healthz` and port `8000` when the service supports it.
- If the image contains lazy-loaded model dependencies, keep readiness separate from liveness so startup does not fail before model load.

## Deployment Image Visibility

The deployment create page filters images by system labels, commonly `system:inference`, even for normal deployment workflows. A successfully pushed image can exist in the project registry but still be absent from the deployment image selector.

Check unfiltered and filtered image lists separately:

```text
GET /kapis/registry.brainpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/images/project_images?page=1&pageSize=100
GET /kapis/registry.brainpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/images/project_images?label=system%3Ainference&page=1&pageSize=100
```

If the image is present only in the unfiltered list, bind the `system:inference` label through the H console image repository UI. When using the same browser-session API path as the console, first resolve the label id with:

```text
GET /kapis/registry.brainpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/labels/list?tag={tag}
```

Then bind labels with the frontend-compatible payload:

```text
POST /kapis/registry.brainpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/images/labelbindings
```

```json
{
  "images": [
    {
      "repository": "{project}/{image}",
      "tag": "{tag}"
    }
  ],
  "existed_ids": ["{system_inference_label_id}"],
  "create_names": [],
  "project_name": "{project}"
}
```

Do not hard-code label id `8`; it is an observed `system:inference` id and must be resolved per environment. The `repository` value may need the project prefix, for example `ailab-sciversealign/nginx-reverse-proxy`, even when the visible image name is only `nginx-reverse-proxy:{tag}`.
