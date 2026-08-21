import { describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { PACKAGE_VERSION, versionOutput } from "../src/version.js";

async function runVersion(args: readonly string[]) {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

  try {
    const code = await main(args);
    const output = write.mock.calls.map(([chunk]) => String(chunk)).join("");
    return { code, output };
  } finally {
    write.mockRestore();
  }
}

describe("CLI version", () => {
  it("reads the version from package metadata", () => {
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(versionOutput()).toBe(`zero-shelter ${PACKAGE_VERSION}\n`);
  });

  it("prints the package version for --version without scanning", async () => {
    await expect(runVersion(["--version"])).resolves.toEqual({
      code: 0,
      output: versionOutput(),
    });
  });

  it("accepts version as a command", async () => {
    await expect(runVersion(["version"])).resolves.toEqual({
      code: 0,
      output: versionOutput(),
    });
  });
});
