#!/bin/sh

# shellcheck source=CI/common.sh
. CI/common.sh

image=$CI_REGISTRY_IMAGE/$TARGET_ARCH
tag=$(get_tag)
tag_full=$(get_tag_full)
tag_full_latest=$(get_tag_full_latest)
tag_full_stable=$(get_tag_full_stable)
image_path=Build/$tag.tar

_echo "Logging into GitLab Container Registry."
login

_echo "Loading image from \"$image_path\"."
docker load --input "$image_path"

_echo "Tagging image as \"latest\", \"$tag_full_latest\"."
docker tag "$tag_full" "$tag_full_latest"

# If a Git tag is present.
if [ -n "$CI_COMMIT_TAG" ]; then
  _echo "Tagging image as \"stable\", \"$tag_full_stable\"."
  docker tag "$tag_full" "$tag_full_stable"
fi

_echo "Pushing all tags for \"$TARGET_ARCH\" to \"$image\"."
docker push "$image"
