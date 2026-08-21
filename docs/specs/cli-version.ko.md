# 기능 명세: CLI version

## Issue와 lifecycle metadata

- Issue/Discussion: [Discussion #41](https://github.com/zero-shelter/zero-shelter/discussions/41)
- 대상 layer: Entry / CLI
- 관련 PR: 추가 예정

## 문제

현재 설치된 zero-shelter package의 버전을 사용자가 확인할 방법이 없습니다. 따라서 버그 신고·지원 요청·package smoke test의 재현성이 떨어집니다.

## 목표

scanner를 실행하거나 프로젝트 baseline을 읽지 않고 현재 설치된 package version을 확인할 수 있게 합니다.

## 범위

### 포함

- `zero-shelter --version` 지원
- `zero-shelter version` 지원
- 설치된 CLI가 사용하는 package metadata에서 version 읽기
- `zero-shelter <version>`과 newline 출력
- exit code `0` 반환
- `judge`, `hook`, `--help`, unknown command 동작 유지
- unit test와 README option 문서 추가

### 명시적 제외

- package version 자체 변경
- npm install·init 동작 변경
- 판정·ranking·baseline·hook output 변경
- network·telemetry 추가
- 개인정보·prompt control 추가

## Interface

| 실행 | 출력 | Exit code |
|---|---|---:|
| `zero-shelter --version` | `zero-shelter <package version>` | `0` |
| `zero-shelter version` | `zero-shelter <package version>` | `0` |
| `zero-shelter --help` | 기존 help | `0` |
| `zero-shelter unknown` | 기존 오류와 usage | `2` |

package metadata를 단일 source of truth로 사용합니다. 저장소 build와 publish package layout 모두에서 동작해야 합니다.

## 아키텍처

- `src/version.ts`: package version 읽기와 format 담당
- `src/cli.ts`: argument 인식과 dispatch 담당
- `test/version.test.ts`: public CLI 동작 검증
- scanner·baseline·network·agent layer는 변경하지 않음

## 보안과 개인정보

- local package metadata만 읽음
- 대상 프로젝트를 읽거나 subprocess·prompt·network를 사용하지 않음
- secret·개인정보를 출력하지 않음

## QA 승인 기준

| 시나리오 | 기대 결과 | 근거 |
|---|---|---|
| `--version` | 정확한 package version과 exit `0` | unit test + 수동 실행 |
| `version` | `--version`과 같은 출력 | unit test + 수동 실행 |
| `--help` | 기존 usage 유지 | 기존/수동 확인 |
| `judge` | scanner·baseline 경로 불변 | 기존 test suite |
| `hook` | context와 exit `0` 불변 | 기존 hook test |
| unknown command | 기존 오류와 exit `2` | 기존/수동 확인 |
| build package | `node dist/bin.js --version` 동작 | build smoke test |

## Agent 참고사항

CLI에 version literal을 중복 작성하지 않습니다. version 처리를 judgement나 scanner layer로 옮기지 않습니다. 버그 신고와 release smoke test에 복사될 수 있으므로 출력 형식을 안정적으로 유지합니다.

## 결정 기록

| 결정 | 검토한 대안 | 이유 |
|---|---|---|
| runtime package metadata 사용 | TypeScript에 version hard-code | package.json 변경 시 source 중복 방지 |
| flag와 command 모두 지원 | `--version`만 지원 | subcommand를 선호하는 사용자도 쉽게 발견 |
