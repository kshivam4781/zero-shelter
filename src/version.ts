import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

interface PackageMetadata {
  readonly version?: unknown;
}

const metadata = require("../package.json") as PackageMetadata;

if (typeof metadata.version !== "string") {
  throw new Error("package.json does not contain a version");
}

export const PACKAGE_VERSION = metadata.version;

export function versionOutput(): string {
  return `zero-shelter ${PACKAGE_VERSION}\n`;
}
