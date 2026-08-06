# Third-party components

Direct dependencies only, with the version resolved in `package-lock.json`.
Regenerate with `npm run third-party`; CI fails if this file drifts.

Transitive dependencies and GitHub Actions are intentionally excluded.

| 번호 | 라이브러리명 | 버전 | 라이선스 | 공식 저장소 URL | 사용 목적 및 주요 기능 |
|---|---|---|---|---|---|
| 1 | @types/node | 22.20.1 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | 개발·빌드 도구 / 라이브러리로 불러 씀 |
| 2 | typescript | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript | 개발·빌드 도구 / 라이브러리로 불러 씀 |
| 3 | vitest | 2.1.9 | MIT | https://github.com/vitest-dev/vitest | 개발·빌드 도구 / 라이브러리로 불러 씀 |

This project itself is licensed under Apache-2.0. See `LICENSE`.
