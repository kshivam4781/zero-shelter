#!/usr/bin/env node
/**
 * The install-and-first-run QA, run against the packaged artifact.
 *
 * Not the working copy. That distinction is not pedantry: this exact check
 * caught a merge that silently deleted a shipped feature while every test and
 * all three CI matrices stayed green, because the tests for the deleted code
 * were deleted with it. `npm test` cannot see what is missing from the tarball;
 * this can.
 *
 * Usage: node scripts/qa-install.mjs [--keep]
 *   --keep   leave the temporary project behind for poking at
 */

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");

// Old enough to have advisories that will not be revoked, pinned so the
// expected counts do not drift when a new one is published.
const VULNERABLE = { lodash: "4.17.11" };

const results = [];
const check = async (name, expectation, fn) => {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? expectation });
  } catch (error) {
    results.push({ name, ok: false, detail: (error instanceof Error ? error.message : String(error)).split("\n")[0] });
  }
};

/** Run the installed CLI and return { code, stdout, stderr } without throwing. */
const cli = async (cwd, args) => {
  const bin = join(project, "node_modules", ".bin", "zero-shelter");
  try {
    const { stdout, stderr } = await run(bin, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log("packing…");
const { stdout: packed } = await run("npm", ["pack", "--silent"], { cwd: root });
const tarball = join(root, packed.trim().split("\n").pop());

const workspace = await mkdtemp(join(tmpdir(), "zero-shelter-qa-"));
const project = join(workspace, "project");
const empty = join(workspace, "empty");

await run("mkdir", ["-p", project, empty]);
await writeFile(
  join(project, "package.json"),
  `${JSON.stringify({ name: "qa-project", version: "1.0.0", dependencies: VULNERABLE }, null, 2)}\n`,
);

console.log("installing the tarball into a throwaway project…");
await run("npm", ["install", "--package-lock-only", "--no-audit", "--no-fund", "--ignore-scripts"], { cwd: project });
await run("npm", ["install", "--no-save", "--no-audit", "--no-fund", tarball], { cwd: project });

await check("2. --version prints a version", "matches package.json", async () => {
  const { stdout, code } = await cli(project, ["--version"]);
  const { version } = JSON.parse(await run("node", ["-p", "JSON.stringify(require('./package.json'))"], { cwd: root }).then((r) => r.stdout));
  expect(code === 0, `exit ${code}`);
  expect(stdout.includes(version), `printed ${stdout.trim()}, package.json says ${version}`);
  return stdout.trim();
});

await check("5. --help covers judge and hook", "both commands documented", async () => {
  const { stdout } = await cli(project, ["--help"]);
  expect(/npx zero-shelter judge/.test(stdout), "judge missing from help");
  expect(/npx zero-shelter hook/.test(stdout), "hook missing from help");
  return "judge + hook";
});

await check("8. only formats we parse are named", "no yarn v1 claim", async () => {
  const { stdout } = await cli(project, ["--help"]);
  expect(!/yarn/i.test(stdout), "help still claims yarn support");
  return "no yarn";
});

await check("9. no subcommand behaves like judge", "same exit code", async () => {
  const bare = await cli(project, []);
  const judge = await cli(project, ["judge"]);
  expect(bare.code === judge.code, `bare ${bare.code} vs judge ${judge.code}`);
  return `exit ${bare.code}`;
});

await check("findings are reported at all", "exit 1 with a known-vulnerable dep", async () => {
  const { code, stdout } = await cli(project, ["judge"]);
  expect(code === 1, `exit ${code}`);
  expect(/fix these/.test(stdout), "no findings reported");
  return `exit 1, ${(stdout.match(/fix these (\d+)/) ?? [])[1]} finding(s)`;
});

await check("the report says what to run", "an npm i command appears", async () => {
  const { stdout } = await cli(project, ["judge"]);
  expect(/npm i lodash@/.test(stdout), "no upgrade command in the report");
  return (stdout.match(/npm i \S+/) ?? [])[0];
});

await check("1. nothing scanned is not a pass", "exit 2, never 0", async () => {
  const { code, stderr } = await cli(empty, ["judge"]);
  expect(code === 2, `exit ${code} — a directory with no lockfile must not pass`);
  expect(/lockfile/i.test(stderr), "the message does not mention the lockfile");
  return "exit 2 + npm's explanation";
});

await check("3. an old Node is explained", "exit 2 with both versions named", async () => {
  const bin = join(project, "node_modules", "zero-shelter", "dist", "bin.js");
  const { code, stderr } = await run(
    "node",
    ["--input-type=module", "-e", `Object.defineProperty(process.versions,"node",{value:"18.19.0",configurable:true});await import(${JSON.stringify(bin)});`],
    { cwd: project },
  ).then(() => ({ code: 0, stderr: "" }), (error) => ({ code: error.code, stderr: error.stderr ?? "" }));

  expect(code === 2, `exit ${code}`);
  expect(/Node 20 or later/.test(stderr) && /18\.19\.0/.test(stderr), `said: ${stderr.trim()}`);
  return "exit 2";
});

await check("10. baseline silences, then the loop closes", "exit 0, then credit for a fix", async () => {
  const recorded = await cli(project, ["judge", "--update-baseline"]);
  expect(recorded.code === 0, `--update-baseline exited ${recorded.code}`);

  const after = await cli(project, ["judge"]);
  expect(after.code === 0, `re-run exited ${after.code}`);
  expect(/nothing new to fix/.test(after.stdout), "did not go quiet after recording");

  // Now actually fix it, and check the run says so.
  await run("npm", ["install", "--package-lock-only", "--no-audit", "--no-fund", "--ignore-scripts", "lodash@4.18.1"], { cwd: project });
  const fixed = await cli(project, ["judge"]);
  expect(/no longer reported/.test(fixed.stdout), "a fix produced no acknowledgement");
  return "recorded → quiet → fix acknowledged";
});

await check("a workspace root says the command needs -w", "caveat only in workspaces", async () => {
  const root = join(workspace, "monorepo");
  await run("mkdir", ["-p", join(root, "packages", "app")]);
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name: "root", private: true, workspaces: ["packages/*"] })}\n`,
  );
  await writeFile(
    join(root, "packages", "app", "package.json"),
    `${JSON.stringify({ name: "app", version: "1.0.0", dependencies: VULNERABLE })}\n`,
  );
  await run("npm", ["install", "--package-lock-only", "--no-audit", "--no-fund", "--ignore-scripts"], { cwd: root });

  const { stdout } = await cli(root, ["judge"]);
  expect(/npm i lodash@/.test(stdout), "no upgrade command in a workspace");
  // Run at the root, that command adds a root dependency and leaves the
  // workspace declaring the vulnerable range.
  expect(/-w <workspace>/.test(stdout), "no workspace caveat next to the command");

  const plain = await cli(project, ["judge"]);
  expect(!/-w <workspace>/.test(plain.stdout), "workspace caveat leaked into an ordinary project");
  return "caveat present in workspace, absent outside";
});

await check("both sources reconcile when osv-scanner is present", "cross-source path exercised", async () => {
  const osv = process.env["OSV_SCANNER"] ?? "osv-scanner";
  const available = await run(osv, ["--version"]).then(() => true, () => false);
  if (!available) {
    // Skipped rather than failed: this is the one check that needs a tool we
    // do not ship. CI installs it (pinned and checksummed) so the path is
    // covered there on every pull request.
    return "skipped — osv-scanner not on PATH (CI covers it)";
  }

  const { stdout } = await cli(project, ["judge", "--json"]);
  const parsed = JSON.parse(stdout);
  const complaint = parsed.skipped.find((note) => note.startsWith("osv-scanner"));
  expect(complaint === undefined, `osv-scanner did not contribute: ${complaint}`);
  return "npm audit + osv-scanner";
});

await check("7. nothing but dist ships", "no runtime dependencies", async () => {
  const manifest = JSON.parse(
    (await run("node", ["-p", "JSON.stringify(require('zero-shelter/package.json'))"], { cwd: project })).stdout,
  );
  expect(Object.keys(manifest.dependencies ?? {}).length === 0, "runtime dependencies appeared");
  expect(JSON.stringify(manifest.files) === JSON.stringify(["dist"]), `files: ${JSON.stringify(manifest.files)}`);
  return "0 runtime deps, files: [dist]";
});

await rm(tarball, { force: true });
if (!keep) await rm(workspace, { recursive: true, force: true });

const failed = results.filter((result) => !result.ok);
console.log("");
for (const { name, ok, detail } of results) {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (keep) console.log(`workspace kept at ${workspace}`);

// 4 and 6 are covered elsewhere and named here so the list is not silently
// shorter than the spec: osv-scanner absence is exercised by every case above
// (it is not installed), and the three-OS matrix is CI's job.
console.log("\n4 (osv-scanner absent) is implicit above; 6 (three OSes) is the CI matrix.");

process.exitCode = failed.length === 0 ? 0 : 1;
