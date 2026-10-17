// Paketi npm'e gidecek haliyle (pnpm pack) workspace dışındaki geçici bir
// klasöre kurar ve hem ESM hem CJS olarak yükleyip bir hesap yapar.
// "Sadece monorepo içinde çalışıyor" türü hataları yakalar.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "enflasyon-core-smoke-"));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit" });

try {
  run("pnpm", ["pack", "--pack-destination", work], packageDir);
  const tarball = readdirSync(work).find((f) => f.endsWith(".tgz"));
  if (!tarball) throw new Error("pnpm pack tarball üretmedi");

  writeFileSync(join(work, "package.json"), JSON.stringify({ name: "smoke", private: true }));
  run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", join(work, tarball)], work);

  const input = `{
    basket: { mode: "amount", items: { konut: 30000, gida: 20000 } },
    indices: { konut: { "2025-09": 100, "2026-09": 150 }, gida: { "2025-09": 100, "2026-09": 125 } },
    at: "2026-09",
  }`;
  const check = `if (Math.abs(rate - 0.4) > 1e-12) { console.error("beklenmeyen oran", rate); process.exit(1); }`;

  writeFileSync(
    join(work, "esm.mjs"),
    `import { annual } from "enflasyon-core";\nconst { rate } = annual(${input});\n${check}\nconsole.log("ESM ok", rate);\n`,
  );
  writeFileSync(
    join(work, "cjs.cjs"),
    `const { annual } = require("enflasyon-core");\nconst { rate } = annual(${input});\n${check}\nconsole.log("CJS ok", rate);\n`,
  );
  run("node", ["esm.mjs"], work);
  run("node", ["cjs.cjs"], work);
} finally {
  rmSync(work, { recursive: true, force: true });
}
