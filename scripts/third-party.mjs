#!/usr/bin/env node
/**
 * Regenerate THIRD_PARTY.md from the dependencies actually installed.
 *
 * Direct dependencies only, with the resolved version rather than the range —
 * that is what the 2026 오픈소스 개발자대회 SBOM guide (붙임1 / 부록1) asks for,
 * and hand-maintaining the list is exactly how it goes stale.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const manifest = readJson(join(root, "package.json"));
const direct = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
].sort();

const rows = direct.map((name) => {
  const installed = readJson(join(root, "node_modules", name, "package.json"));
  return {
    name,
    version: installed.version ?? "UNKNOWN",
    license: normalizeLicense(installed.license),
    repository: repositoryUrl(installed.repository),
    runtime: Object.hasOwn(manifest.dependencies ?? {}, name),
  };
});

const table = rows
  .map(
    (r, i) =>
      `| ${i + 1} | ${r.name} | ${r.version} | ${r.license} | ${r.repository} | ${
        r.runtime ? "런타임 의존성" : "개발·빌드 도구"
      } / 라이브러리로 불러 씀 |`,
  )
  .join("\n");

writeFileSync(
  join(root, "THIRD_PARTY.md"),
  `# Third-party components

Direct dependencies only, with the version resolved in \`package-lock.json\`.
Regenerate with \`npm run third-party\`; CI fails if this file drifts.

Transitive dependencies and GitHub Actions are intentionally excluded.

| 번호 | 라이브러리명 | 버전 | 라이선스 | 공식 저장소 URL | 사용 목적 및 주요 기능 |
|---|---|---|---|---|---|
${table}

This project itself is licensed under Apache-2.0. See \`LICENSE\`.
`,
);

console.log(`THIRD_PARTY.md: ${rows.length} direct dependencies`);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalizeLicense(license) {
  // ponytail: `license` is an SPDX string in every package we depend on. The
  // deprecated object/array forms only need handling if one ever shows up.
  if (typeof license === "string") return license;
  return "UNKNOWN — verify manually";
}

function repositoryUrl(repository) {
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (!raw) return "UNKNOWN — verify manually";

  return raw
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^github:(.+)$/, "https://github.com/$1");
}
