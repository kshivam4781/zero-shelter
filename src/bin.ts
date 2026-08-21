#!/usr/bin/env node
// Entry point only. main() lives in cli.ts so tests can call it without a
// module that runs on import.
import { unsupportedNode } from "./node-support.js";

const tooOld = unsupportedNode(process.versions.node);
if (tooOld !== undefined) {
  process.stderr.write(tooOld);
  process.exit(2);
}

// Imported after the check, and dynamically: a static import is hoisted, so on
// a Node too old to parse what cli.ts pulls in, the crash would happen before
// we got a chance to explain why.
const { main } = await import("./cli.js");

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${(error as Error).stack ?? String(error)}\n`);
    process.exitCode = 2;
  },
);
