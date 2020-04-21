#!/bin/sh

# Log debug info.
echo "Linting code with ESLint."

# Use npm-ci for reproducible builds, and use the cache.
npm ci --cache .npm --prefer-offline
# Use NPM's script interface for running ESLint.
npm run lint
