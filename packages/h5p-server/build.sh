#!/bin/bash
rm -rf build
npx tsc -p ./tsconfig.build.json
cp -r src/schemas build/src/schemas
cp -r assets build