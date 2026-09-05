/**
 * An interrupted `--record` write leaves history.jsonl without a trailing
 * newline. Left alone, the next `--record` welds its entry onto that torn
 * line instead of starting a new one — corrupting the line further and
 * silently losing the run that just happened. See Issue #196.
 */

import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { parseHistory } from "../src/history.js";

const fixture = fileURLToPath(new URL("./fixtures/npm-audit.json", import.meta.url));

async function record(cwd: string): Promise<number> {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    return await main(["judge", "--input", fixture, "--cwd", cwd, "--record"]);
  } finally {
    write.mockRestore();
  }
}

describe("recording after an interrupted write", () => {
  it("starts a new line instead of extending a torn one", async () => {
    const dir = await mkdtemp(join(tmpdir(), "zs-history-"));

    expect(await record(dir)).toBe(1);
    expect(await record(dir)).toBe(1);

    const historyPath = join(dir, ".zero-shelter", "history.jsonl");
    const before = await readFile(historyPath, "utf8");
    expect(before.endsWith("\n")).toBe(true);

    // Simulate a write that was interrupted mid-line: no trailing newline.
    const torn = before + '{"v":"1","at":"2026-01-01T00:00:00.000Z","raw":1,"merg';
    await writeFile(historyPath, torn, "utf8");

    expect(await record(dir)).toBe(1);

    const after = await readFile(historyPath, "utf8");
    const { entries, unreadable } = parseHistory(after);

    // The two good runs plus the third one, which must land on its own line
    // rather than being swallowed into the torn one.
    expect(entries).toHaveLength(3);
    expect(unreadable).toBe(1);
  });

  it("still appends cleanly when the file does not exist yet", async () => {
    const dir = await mkdtemp(join(tmpdir(), "zs-history-"));

    expect(await record(dir)).toBe(1);

    const historyPath = join(dir, ".zero-shelter", "history.jsonl");
    const { entries, unreadable } = parseHistory(await readFile(historyPath, "utf8"));

    expect(entries).toHaveLength(1);
    expect(unreadable).toBe(0);
  });

  it("still appends cleanly onto a properly terminated file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "zs-history-"));
    await mkdir(join(dir, ".zero-shelter"), { recursive: true });

    expect(await record(dir)).toBe(1);
    expect(await record(dir)).toBe(1);

    const historyPath = join(dir, ".zero-shelter", "history.jsonl");
    const { entries, unreadable } = parseHistory(await readFile(historyPath, "utf8"));

    expect(entries).toHaveLength(2);
    expect(unreadable).toBe(0);
  });
});
