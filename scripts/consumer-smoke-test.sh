#!/usr/bin/env bash
# Consumer smoke test: installs the *packed* publishable packages into a
# scratch project outside the monorepo and checks that they work for a real
# consumer, which our in-repo CI never verifies:
#
#   - every server-side package can be loaded with CommonJS require()
#     (on Node 22.12 this is the require(esm) boundary; a newer Node would
#     not reveal an ERR_REQUIRE_ESM regression),
#   - @lumieducation/h5p-react type-checks in a React 19 + TypeScript app,
#     including the `declare module 'react'` JSX augmentation.
#
# Usage (after `npm run build`):
#   EXPECT_NODE=22.12.0 scripts/consumer-smoke-test.sh
#
# EXPECT_NODE (optional): fail unless `node -v` matches exactly. CI sets this
# to the minimum supported version.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [[ -n "${EXPECT_NODE:-}" && "$(node -v)" != "v${EXPECT_NODE}" ]]; then
    echo "Expected Node ${EXPECT_NODE}, got $(node -v)" >&2
    exit 1
fi
echo "Running on Node $(node -v)"

# Packages the consumer loads on the server with require().
SERVER_PACKAGES=(
    h5p-server
    h5p-express
    h5p-html-exporter
    h5p-mongos3
    h5p-redis-lock
    h5p-svg-sanitizer
    h5p-clamav-scanner
)
BROWSER_PACKAGES=(h5p-react h5p-webcomponents)

mkdir -p "$WORK/tarballs" "$WORK/app"
for pkg in "${SERVER_PACKAGES[@]}" "${BROWSER_PACKAGES[@]}"; do
    (cd "$ROOT/packages/$pkg" && npm pack --silent --pack-destination "$WORK/tarballs" >/dev/null)
done

cd "$WORK/app"
# Resolve every cross-dependency between our own packages to the local
# tarballs instead of whatever is currently on the registry.
node - "$WORK/tarballs" <<'EOF'
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const overrides = {};
for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^lumieducation-(h5p-[a-z0-9-]+?)-\d+\.\d+\.\d+.*\.tgz$/);
    if (m) {
        overrides[`@lumieducation/${m[1]}`] = `file:${path.join(dir, f)}`;
    }
}
fs.writeFileSync(
    'package.json',
    JSON.stringify(
        { name: 'consumer-smoke-test', private: true, version: '0.0.0', overrides, dependencies: overrides },
        null,
        2
    )
);
EOF
npm install --silent --no-audit --no-fund
npm install --silent --no-audit --no-fund \
    react@19 react-dom@19 @types/react@19 @types/node@22 typescript@5 express@5

echo "== CommonJS require() of server packages"
for pkg in "${SERVER_PACKAGES[@]}"; do
    node -e "const m = require('@lumieducation/$pkg'); if (!m || Object.keys(m).length === 0) { throw new Error('$pkg exported nothing'); } console.log('ok  $pkg', Object.keys(m).length, 'exports')"
done

echo "== TypeScript consumer of h5p-react (React 19)"
cat > consumer.tsx <<'EOF'
import * as React from 'react';
import { H5PEditorUI, H5PPlayerUI } from '@lumieducation/h5p-react';

// Uses the JSX augmentation shipped by h5p-react (`declare module 'react'`).
export const raw = (
    <>
        <h5p-editor content-id="1" h5p-url="/h5p" />
        <h5p-player content-id="1" />
    </>
);

export const player = (
    <H5PPlayerUI
        contentId="1"
        loadContentCallback={async () => {
            throw new Error('not needed');
        }}
    />
);

export const editor = (
    <H5PEditorUI
        contentId="1"
        loadContentCallback={async () => {
            throw new Error('not needed');
        }}
        saveContentCallback={async () => {
            throw new Error('not needed');
        }}
    />
);
EOF
npx tsc --noEmit --jsx react-jsx --module commonjs --moduleResolution node \
    --esModuleInterop --strict --skipLibCheck false consumer.tsx

echo "Consumer smoke test passed."
