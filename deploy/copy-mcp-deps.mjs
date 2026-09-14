// Inject the externalized Strands SDK runtime closure into the Next standalone
// output.
//
// Strands is listed in serverExternalPackages, so Next's tracer doesn't follow
// its imports into .next/standalone. Strands also imports many integrations that
// it declares as *peerDependencies* (the Bedrock client, MCP, @opentelemetry/api,
// etc.); pnpm installs the satisfiable ones into the store, which is why local dev
// works — but they're absent from the traced standalone, so the agent route 500s
// with ERR_MODULE_NOT_FOUND at runtime.
//
// We compute the closure by *resolving* packages from the real (pnpm) node_modules
// starting at the Strands SDK, following dependencies + optionalDependencies +
// peerDependencies. Peers that aren't installed simply don't resolve and are
// skipped (they aren't on any loadable path locally either, so our Bedrock path
// never touches them). Each resolved package's real directory is copied into the
// standalone's flattened node_modules. This stays lean (no unused @aws-sdk/@google
// /openai trees) while guaranteeing every eagerly-imported module is present.
//
// Usage: node deploy/copy-mcp-deps.mjs   (run after `pnpm build`)

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const projectRoot = process.cwd();
const dest = path.join(projectRoot, ".next/standalone/node_modules");

if (!fs.existsSync(dest)) {
  console.error(`copy-mcp-deps: standalone node_modules not found: ${dest} (run \`pnpm build\` first)`);
  process.exit(1);
}

const readPkgJson = (dir) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
};

// Walk up from `startDir` to the package ROOT — the dir whose package.json `name`
// matches. Needed because a package's "./package.json" export (or a resolved entry)
// can point at a nested dist/{cjs,esm}/package.json type-marker that has no `name`
// or `dependencies`.
const packageRoot = (startDir, name) => {
  let d = startDir;
  while (d !== path.dirname(d)) {
    const pj = readPkgJson(d);
    if (pj && pj.name === name) return d;
    d = path.dirname(d);
  }
  return null;
};

// Resolve the on-disk root directory of package `name` as seen from `fromDir`.
const resolvePkgDir = (fromDir, name) => {
  const req = createRequire(path.join(fromDir, "package.json"));
  let start;
  try {
    start = path.dirname(req.resolve(name + "/package.json"));
  } catch {
    // "./package.json" blocked by exports — fall back to the entry point.
    try {
      start = path.dirname(req.resolve(name));
    } catch {
      return null; // not installed / not resolvable from here
    }
  }
  return packageRoot(start, name);
};

const roots = [
  "@strands-agents/sdk",
  "@modelcontextprotocol/sdk",
  "@aws-sdk/client-bedrock-runtime",
];

const seen = new Map(); // name -> real dir
const queue = roots.map((name) => ({ name, from: projectRoot }));
while (queue.length) {
  const { name, from } = queue.shift();
  if (seen.has(name)) continue;
  const dir = resolvePkgDir(from, name);
  if (!dir) continue; // peer/optional not installed — not on any loadable path
  seen.set(name, dir);
  const pj = readPkgJson(dir);
  if (!pj) continue;
  const deps = {
    ...(pj.dependencies ?? {}),
    ...(pj.optionalDependencies ?? {}),
    ...(pj.peerDependencies ?? {}),
  };
  for (const dep of Object.keys(deps)) queue.push({ name: dep, from: dir });
}

let copied = 0;
for (const [name, dir] of seen) {
  const out = path.join(dest, name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.cpSync(dir, out, { recursive: true, dereference: true, force: true });
  copied++;
}
console.log(`copy-mcp-deps: injected ${copied} Strands-closure packages into .next/standalone`);
