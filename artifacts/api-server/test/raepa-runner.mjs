import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import os from "node:os";

const root = process.cwd();
const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "raepa-regressions-"));
const outputFile = path.join(outputDirectory, "raepa-regressions.test.cjs");

try {
  await build({
    entryPoints: [path.join(root, "test/raepa-regressions.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    packages: "external",
    outfile: outputFile,
    sourcemap: "inline",
    alias: {
      "@workspace/db/schema": path.join(root, "test/support/db-schema-stub.ts"),
      "@workspace/db": path.join(root, "test/support/db-stub.ts"),
      "@workspace/integrations-gemini-ai": path.join(root, "test/support/gemini-stub.ts"),
    },
  });

  const child = spawn(process.execPath, ["--test", outputFile], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_PATH: [path.join(root, "node_modules"), process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
    },
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  process.exitCode = exitCode;
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}