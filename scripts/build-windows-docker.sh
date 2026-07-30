#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_uid="$(id -u)"
output_gid="$(id -g)"

docker run --rm \
  -e OUTPUT_UID="$output_uid" \
  -e OUTPUT_GID="$output_gid" \
  -v "$project_dir:/project" \
  -w /project \
  electronuserland/builder:wine \
  bash -lc 'npm run dist:windows; build_result=$?; chown -R "$OUTPUT_UID:$OUTPUT_GID" /project/release; exit "$build_result"'
