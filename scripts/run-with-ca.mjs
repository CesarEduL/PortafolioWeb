import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const caFile = join(root, "certs", "avast-root.pem");

if (existsSync(caFile)) {
  process.env.NODE_EXTRA_CA_CERTS = caFile;
}

const astroArgs = process.argv.slice(2);
const result = spawnSync("npx", ["astro", ...astroArgs], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
