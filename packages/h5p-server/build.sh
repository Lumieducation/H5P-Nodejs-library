#!/bin/bash
rm -rf build
npx tsc -p ./tsconfig.cjs.json
npx tsc -p ./tsconfig.esm+types.json
cp -r src/schemas build/esm/src/schemas
cp -r src/schemas build/cjs/src/schemas
cp -r assets build/cjs
cp -r assets build/esm
npx tsc-esm-fix --src='./build/esm/src/**/*.js' --ext='.js' --tsconfig='./tsconfig.esm+types.json'
echo '{"type": "commonjs"}' > ./build/cjs/package.json && echo '{"type": "module"}' > ./build/esm/package.json