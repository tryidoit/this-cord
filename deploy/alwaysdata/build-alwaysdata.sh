#!/usr/bin/env bash
# Builds a small, ready-to-upload bundle for alwaysdata (or any Node host): ./alwaysdata-bundle/ and a .zip
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run build
rm -rf alwaysdata-bundle && mkdir -p alwaysdata-bundle/src/lib
cp -r dist server alwaysdata-bundle/
rm -f alwaysdata-bundle/server/test.mjs
rm -rf alwaysdata-bundle/server/schema/.DS_Store
cp src/lib/avatars.js src/lib/questDefs.js alwaysdata-bundle/src/lib/
node -e '
const p=require("./package.json");
const keep=["express","helmet","express-rate-limit"];
require("fs").writeFileSync("alwaysdata-bundle/package.json",JSON.stringify({name:"this-cord",version:"1.0.0",type:"module",private:true,
 engines:{node:">=22.13"},scripts:{start:"node --no-warnings server/index.js"},dependencies:Object.fromEntries(keep.map(k=>[k,p.dependencies[k]]))},null,2));'
(cd alwaysdata-bundle && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps >/dev/null)
rm -f this-cord-alwaysdata.zip && (cd alwaysdata-bundle && zip -qr ../this-cord-alwaysdata.zip .)
du -sh alwaysdata-bundle && ls -la this-cord-alwaysdata.zip
