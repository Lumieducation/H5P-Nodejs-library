#!/bin/sh
# Prepares a fresh checkout or git worktree for development and testing:
# installs dependencies, builds all packages, and downloads the H5P core files,
# the content type cache and the Hub example content used by the tests.
# Each step is skipped if its result is already present, so it is cheap to run
# repeatedly (it is called by the Claude Code SessionStart hook).
set -e
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
    npm ci
fi

if [ ! -d packages/h5p-server/build ] || [ ! -d test/data/content-type-cache ]; then
    npm run setup
fi

if [ ! -d test/data/hub-content ]; then
    npm run download:content
fi
