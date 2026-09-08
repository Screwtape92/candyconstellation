// server/tsconfig.json compiles api/shared/*.ts (nested under api/, which has
// no "type" field and so defaults to CommonJS) into server/dist/api/shared/.
// That output directory inherits the repo root's "type": "module" at
// runtime since it has no package.json of its own, so Node parses the
// CommonJS syntax tsc emitted as ESM and finds zero exports. Node's own
// dual-package fix: drop a package.json into the output subtree overriding
// its module kind back to "commonjs", matching what tsc actually emitted
// there.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const dir = path.join(import.meta.dirname, '..', 'server', 'dist', 'api')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'package.json'), '{"type":"commonjs"}\n')
