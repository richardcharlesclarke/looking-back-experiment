#!/bin/sh
set -eu
./node_modules/.bin/tsc --module commonjs --target ES2021 --moduleResolution node --esModuleInterop --resolveJsonModule --skipLibCheck --strict --outDir .local/brufest-tests tests/brufest.test.ts tests/brufest-pair-flow.test.ts tests/brufest-festival-flow.test.ts tests/brufest-continuous.test.ts tests/brufest-perspectives.test.ts
DATABASE_URL='' node --test .local/brufest-tests/tests/brufest*.test.js
