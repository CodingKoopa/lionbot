#!/bin/sh

# shellcheck source=CI/common.sh
. CI/common.sh

tag=$(get_tag)
tag_full=$(get_tag_full)
tag_full_latest=$(get_tag_full_latest)
image_path=Build/$tag.tar

_echo "Making artifact directory."
mkdir Build

_echo "Logging into GitLab Container Registry."
login

_echo "Pulling latest image \"$tag_full_latest\" to use as cache."
docker pull "$tag_full_latest" || true

_echo "Building image for $TARGET_ARCH as \"$tag_full\"."
docker build --build-arg TARGET_ARCH="$TARGET_ARCH" --cache-from "$tag_full_latest" -t "$tag_full" .

_echo "Saving image to \"$image_path\"."
docker save --output "$image_path" "$tag_full"
