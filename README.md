# zero-shelter

> **⚠️ 한 줄 소개는 아직 확정 전입니다.** 팀 논의 후 채웁니다.
> 후보와 근거는 [Discussion #1](https://github.com/zero-shelter/zero-shelter/discussions) 참고.

Local-first, deterministic security tooling for AI-assisted development.
No LLM at runtime, no network egress, no telemetry.

2026 오픈소스 개발자대회 출품작 · Apache-2.0

---

## Status

이 저장소는 이제 막 시작했습니다. 지금 있는 것은 결정론 게이트(`src/normalize.ts`)와
지문 계산(`src/fingerprint.ts`)뿐입니다.

진행 상황은 [Issues](https://github.com/zero-shelter/zero-shelter/issues)를 보세요.

## Design invariants

바뀌면 안 되는 것들입니다. 새 코드가 이 중 하나를 어기면 리뷰에서 막습니다.

| | 왜 |
|---|---|
| 런타임에 LLM을 쓰지 않는다 | 같은 입력이면 항상 같은 결과여야 합니다. 그리고 코드를 밖으로 보내지 않습니다 |
| 네트워크로 나가지 않는다 | 로컬에서 완결되어야 오프라인·폐쇄망에서 검증할 수 있습니다 |
| 부동소수점 점수를 쓰지 않는다 | 정수만 씁니다. 반올림이 플랫폼마다 다르면 순위가 흔들립니다 |
| 시크릿 원본을 보관하지 않는다 | 파서 안에서 즉시 sha256하고 버립니다 |
| 지문에 들어가는 문자열은 `normalize.ts`를 거친다 | 정규화 경로가 둘이면 지문도 둘이 됩니다 |

CI는 ubuntu·macOS·Windows × Node 20·22에서 같은 지문이 나오는지 검사합니다.
한 곳이라도 다르면 우리가 발표할 모든 숫자가 그 기계에서만 참인 숫자가 됩니다.

## Development

```bash
npm ci
npm test
npm run typecheck
npm run third-party   # THIRD_PARTY.md 재생성
```

Node 20 이상이 필요합니다.

## Contributing

리뷰 통과 조건이 일반적인 프로젝트와 다릅니다.

> **이 코드를 깨뜨리는 입력을 하나 제시하지 못하면 승인하지 않습니다.**

코멘트 개수로는 통과시키지 않습니다. 에이전트가 400줄을 3분에 쓰면 사람도 3분에
승인하게 되는데, 그러면 코드와 테스트가 같은 오해를 공유한 채로 머지됩니다.
반례를 만들어보는 것이 실제로 읽었다는 유일한 증거입니다.

자세한 내용은 [CONTRIBUTING](https://github.com/zero-shelter/.github/blob/main/CONTRIBUTING.md)에 있습니다.

## License

[Apache-2.0](./LICENSE)
