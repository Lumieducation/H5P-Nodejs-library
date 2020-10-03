#!/bin/bash
rm -rf build
npx tsc -p ./tsconfig.build.json
npx tsc -p ./tsconfig.client.json
cp -r src/schemas build/src/schemas
cp -r assets build