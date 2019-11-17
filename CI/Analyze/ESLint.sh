#!/bin/sh

# Log debug info.
echo "Linting code with ESLint."

# Install ESLint and the naming convention plugin specifically, because the rest of the app
# dependencies aren't needed.
npm i eslint eslint-plugin-more-naming-conventions
# Use NPM's script interface for running ESLint.
npm run lint