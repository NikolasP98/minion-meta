#!/usr/bin/env bash
# Build and push all shell images.
#
# Requires: docker buildx, docker login (for the registry you publish to),
# and SHELLS_BRIDGE_VERSION matching the version in packages/shells-bridge.
#
# Usage:
#   ./build-all.sh              # build only, no push
#   ./build-all.sh --push       # build and push to registry
#   ./build-all.sh --push --registry=ghcr.io/nikolasp98
#
# The base image must build first; harness images FROM it.

set -euo pipefail

REGISTRY="${REGISTRY:-minionstack}"
SHELLS_BRIDGE_VERSION="${SHELLS_BRIDGE_VERSION:-0.1.4}"
PUSH=0
PLATFORM="${PLATFORM:-linux/amd64}"

for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    --registry=*) REGISTRY="${arg#*=}" ;;
    --platform=*) PLATFORM="${arg#*=}" ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

build_args=(
  --platform "$PLATFORM"
  --build-arg "SHELLS_BRIDGE_VERSION=$SHELLS_BRIDGE_VERSION"
)
if [[ "$PUSH" == "1" ]]; then
  build_args+=(--push)
else
  build_args+=(--load)
fi

cd "$(dirname "$0")"

echo "=== building $REGISTRY/shells-bridge-base:v1 ==="
docker buildx build "${build_args[@]}" \
  -f Dockerfile.base -t "$REGISTRY/shells-bridge-base:v1" .

echo "=== building $REGISTRY/minion-workstation:v1 ==="
docker buildx build "${build_args[@]}" \
  -f Dockerfile.workstation -t "$REGISTRY/minion-workstation:v1" .

for harness in hermes claude-code codex; do
  echo "=== building $REGISTRY/${harness}-shell:v1 ==="
  docker buildx build "${build_args[@]}" \
    -f "Dockerfile.${harness}" -t "$REGISTRY/${harness}-shell:v1" .
done

echo ""
echo "Done. Tags:"
echo "  $REGISTRY/shells-bridge-base:v1"
echo "  $REGISTRY/minion-workstation:v1"
echo "  $REGISTRY/hermes-shell:v1"
echo "  $REGISTRY/claude-code-shell:v1"
echo "  $REGISTRY/codex-shell:v1"
if [[ "$PUSH" == "0" ]]; then
  echo ""
  echo "(local build only — re-run with --push to publish)"
fi
