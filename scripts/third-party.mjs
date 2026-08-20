#!/usr/bin/env node
/**
 * Regenerate THIRD_PARTY.md and THIRD_PARTY.ko.md from the dependencies
 * actually installed.
 *
 * Direct dependencies only, with the resolved version rather than the range —
 * that is what the 2026 오픈소스 개발자대회 SBOM guide (붙임1 / 부록1) asks for,
 * and hand-maintaining the list is exactly how it goes stale.
 *
 * Both languages are generated from the same rows, so the translation cannot
 * drift from the English: there is nothing to keep in sync by hand.
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

const table = (purpose) =>
  rows
    .map(
      (r, i) =>
        `| ${i + 1} | ${r.name} | ${r.version} | ${r.license} | ${r.repository} | ${purpose(r)} |`,
    )
    .join("\n");

// Scanners are run as separate processes and none of their code ships here, so
// they are not dependencies — but they are third-party software this tool needs
// to do anything, and leaving them off the page reads as hiding them.
const EXTERNAL = `## External executables

Called as separate processes. No code from either is bundled or vendored here.

| Tool | Required | How it is used |
|---|---|---|
| npm CLI (\`npm audit\`) | yes | Already present wherever there is a lockfile. Run as \`npm audit --json\`; only its output is read. |
| [osv-scanner](https://github.com/google/osv-scanner) | no | Used when found on \`PATH\`, skipped quietly otherwise. |
`;

const EXTERNAL_KO = `## 외부 실행 도구

별도 프로세스로 호출합니다. 두 도구 모두 코드가 이 저장소에 포함되거나 동봉되지 않습니다.

| 도구 | 필수 | 사용 방식 |
|---|---|---|
| npm CLI (\`npm audit\`) | 예 | lockfile이 있는 곳엔 이미 있습니다. \`npm audit --json\`으로 실행하고 출력만 읽습니다. |
| [osv-scanner](https://github.com/google/osv-scanner) | 아니오 | \`PATH\`에 있을 때만 사용하고, 없으면 조용히 건너뜁니다. |
`;

writeFileSync(
  join(root, "THIRD_PARTY.md"),
  `# Third-party components

[English](./THIRD_PARTY.md) · [한국어](./THIRD_PARTY.ko.md)

Direct dependencies only, with the version resolved in \`package-lock.json\`.
Regenerate with \`npm run third-party\`; CI fails if either file drifts.

Transitive dependencies and GitHub Actions are intentionally excluded.

| No. | Package | Version | License | Repository | Purpose |
|---|---|---|---|---|---|
${table((r) => (r.runtime ? "Runtime dependency" : "Development and build tooling"))}

${EXTERNAL}
This project itself is licensed under Apache-2.0. See \`LICENSE\`.
`,
);

writeFileSync(
  join(root, "THIRD_PARTY.ko.md"),
  `# 서드파티 구성요소

[English](./THIRD_PARTY.md) · [한국어](./THIRD_PARTY.ko.md)

직접 의존성만, \`package-lock.json\`에 실제로 설치된 버전으로 적습니다.
\`npm run third-party\`로 재생성하며, 둘 중 하나라도 낡으면 CI가 실패합니다.

간접(transitive) 의존성과 GitHub Actions는 의도적으로 제외했습니다.

| 번호 | 라이브러리명 | 버전 | 라이선스 | 공식 저장소 URL | 사용 목적 및 주요 기능 |
|---|---|---|---|---|---|
${table((r) => (r.runtime ? "런타임 의존성" : "개발·빌드 도구"))}

${EXTERNAL_KO}
이 프로젝트 자체는 Apache-2.0으로 배포됩니다. \`LICENSE\`를 보세요.
`,
);

console.log(`THIRD_PARTY.md · THIRD_PARTY.ko.md: ${rows.length} direct dependencies`);

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
