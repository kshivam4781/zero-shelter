# 서드파티 구성요소

[English](./THIRD_PARTY.md) · [한국어](./THIRD_PARTY.ko.md)

직접 의존성만, `package-lock.json`에 실제로 설치된 버전으로 적습니다.
`npm run third-party`로 재생성하며, 둘 중 하나라도 낡으면 CI가 실패합니다.

간접(transitive) 의존성과 GitHub Actions는 의도적으로 제외했습니다.

| 번호 | 라이브러리명 | 버전 | 라이선스 | 공식 저장소 URL | 사용 목적 및 주요 기능 |
|---|---|---|---|---|---|
| 1 | @types/node | 22.20.1 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | 개발·빌드 도구 |
| 2 | typescript | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript | 개발·빌드 도구 |
| 3 | vitest | 4.1.11 | MIT | https://github.com/vitest-dev/vitest | 개발·빌드 도구 |

## 외부 실행 도구

별도 프로세스로 호출합니다. 두 도구 모두 코드가 이 저장소에 포함되거나 동봉되지 않습니다.

| 도구 | 필수 | 사용 방식 |
|---|---|---|
| npm CLI (`npm audit`) | 예 | lockfile이 있는 곳엔 이미 있습니다. `npm audit --json`으로 실행하고 출력만 읽습니다. |
| [osv-scanner](https://github.com/google/osv-scanner) | 아니오 | `PATH`에 있을 때만 사용하고, 없으면 조용히 건너뜁니다. |

이 프로젝트 자체는 Apache-2.0으로 배포됩니다. `LICENSE`를 보세요.
