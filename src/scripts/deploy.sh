#!/usr/bin/env sh
set -eu

if [ -z "${IMAGE_TAG:-}" ]; then
  echo "deploy: set IMAGE_TAG to the release tag for localhost:5104/sunfade-1971" >&2
  exit 2
fi
case "$IMAGE_TAG" in
  *[!A-Za-z0-9_.-]*|'')
    echo "deploy: IMAGE_TAG may contain only letters, digits, '.', '_' and '-'" >&2
    exit 2
    ;;
esac

repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
image="localhost:5104/sunfade-1971:$IMAGE_TAG"

command -v pnpm >/dev/null 2>&1 || { echo "deploy: pnpm is required" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "deploy: docker is required" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "deploy: kubectl is required" >&2; exit 1; }

cd "$repo_root"
pnpm build
docker build -f deploy/Dockerfile -t "$image" .
docker push "$image"
sed -E "s#image: localhost:5104/sunfade-1971:[^[:space:]]+#image: $image#" \
  deploy/k3s/sunfade.yaml | kubectl apply -f -
