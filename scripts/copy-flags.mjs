// Copies the flag-icons SVGs (MIT) into public/flags so country flags load as plain images.
// Run after upgrading flag-icons: node scripts/copy-flags.mjs
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const src = path.join("node_modules", "flag-icons", "flags", "4x3");
const out = path.join("public", "flags");
await mkdir(out, { recursive: true });
const files = (await readdir(src)).filter((f) => /^[a-z]{2}\.svg$/.test(f));
await Promise.all(files.map((f) => copyFile(path.join(src, f), path.join(out, f))));
await copyFile(path.join("node_modules", "flag-icons", "LICENSE"), path.join(out, "LICENSE.txt"));
console.log(`Copied ${files.length} flags to ${out}`);
