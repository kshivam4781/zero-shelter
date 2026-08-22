/**
 * Strings for the HTML report.
 *
 * The terminal stays English: its output is advisory identifiers, package names
 * and exit codes, and a translated CLI would only add a place for the two to
 * disagree. The HTML report is different — it is opened by people who did not
 * run the command, in several countries, and reading it is the whole point.
 *
 * Catalogues are complete by construction: `Messages` is a type, so a missing
 * key fails the build rather than rendering an English string into a Korean
 * page.
 */

export interface Messages {
  readonly documentTitle: string;
  readonly heading: string;
  readonly subheading: string;

  readonly themeLabel: string;

  readonly summaryReported: string;
  readonly summaryMerged: string;
  readonly summaryOutstanding: string;
  readonly summaryAccepted: string;
  readonly summaryShown: string;
  readonly sourcesUsed: string;
  readonly sourcesNone: string;

  readonly actNow: string;
  readonly actNowEmpty: string;
  readonly clears: (count: number) => string;
  readonly copy: string;
  readonly copied: string;
  readonly workspaceCaveat: string;

  readonly transitive: (findings: number, packages: number) => string;
  readonly transitiveHow: string;
  readonly transitiveRisk: string;

  readonly ledger: string;
  readonly colSeverity: string;
  readonly colPackage: string;
  readonly colAdvisory: string;
  readonly colFixedIn: string;
  readonly colScore: string;
  readonly colSources: string;
  readonly noFix: string;
  readonly direct: string;
  readonly indirect: string;
  readonly whyThisScore: string;
  readonly range: string;
  readonly alsoKnownAs: string;
  readonly maybeDuplicate: string;
  readonly disagreedFix: (versions: string, chosen: string) => string;

  readonly accepted: string;
  readonly acceptedBody: (count: number) => string;
  readonly resolved: string;
  readonly resolvedBody: (count: number) => string;
  readonly resolvedDoubt: (sources: string) => string;

  readonly nothingOutstanding: string;
  readonly nothingScanned: string;

  readonly history: string;
  readonly historyOutstanding: string;
  readonly historyAppeared: string;
  readonly historyGone: string;
  readonly historyNote: string;

  readonly reproduce: string;
  readonly reproduceBody: string;
  readonly deterministic: string;
  readonly severityRank: string;
}

const EN: Messages = {
  documentTitle: "zero-shelter judgement",
  heading: "Dependency judgement",
  subheading: "What to fix now, and what was left out on purpose.",

  themeLabel: "Dark",

  summaryReported: "reported",
  summaryMerged: "after merge",
  summaryOutstanding: "outstanding",
  summaryAccepted: "already accepted",
  summaryShown: "shown here",
  sourcesUsed: "Sources",
  sourcesNone: "No scanner produced a report.",

  actNow: "Run this",
  actNowEmpty: "No published fix applies to a direct dependency yet.",
  clears: (count) => `clears ${count}`,
  copy: "Copy",
  copied: "Copied",
  workspaceCaveat:
    "Workspace root: add -w <workspace> so the version lands in the package that declares it. Hoisting hides which one from the scanners.",

  transitive: (findings, packages) =>
    `${findings} finding(s) in ${packages} package(s) have a published fix but arrive through another dependency.`,
  transitiveHow: "Forcing them looks like this:",
  transitiveRisk: "This overrides what a parent package pinned, which can break it.",

  ledger: "Every finding",
  colSeverity: "Severity",
  colPackage: "Package",
  colAdvisory: "Advisory",
  colFixedIn: "Fixed in",
  colScore: "Score",
  colSources: "Reported by",
  noFix: "none published",
  direct: "direct",
  indirect: "indirect",
  whyThisScore: "Why this score",
  range: "Affected range",
  alsoKnownAs: "Also known as",
  maybeDuplicate: "May duplicate",
  disagreedFix: (versions, chosen) =>
    `Sources named different fixes (${versions}). ${chosen} satisfies all of them.`,

  accepted: "Already accepted",
  acceptedBody: (count) =>
    `${count} finding(s) are recorded in the baseline and deliberately not listed above.`,
  resolved: "No longer reported",
  resolvedBody: (count) =>
    `${count} accepted finding(s) produced nothing this run. Re-record with --update-baseline to drop them.`,
  resolvedDoubt: (sources) =>
    `${sources} contributed when the baseline was recorded and did not run this time, so some of those may simply not have been looked for.`,

  nothingOutstanding: "Nothing new to fix.",
  nothingScanned:
    "Nothing was scanned, so this is not a pass. The notes above say what stopped each source.",

  history: "Recorded runs",
  historyOutstanding: "outstanding",
  historyAppeared: "appeared",
  historyGone: "no longer reported",
  historyNote:
    "Recorded when the run was asked to (--record). A finding leaves this list when it is fixed, when it is accepted into the baseline, or when the scanner that found it did not run.",

  reproduce: "Reproducing this",
  reproduceBody: "This page was written by:",
  deterministic:
    "The same judgement and the same recorded runs produce a byte-identical page. Nothing here is read from a clock while rendering; the dates above come from the history file.",
  severityRank: "Rank",
};

const KO: Messages = {
  documentTitle: "zero-shelter 판정",
  heading: "의존성 판정",
  subheading: "지금 고칠 것과, 의도적으로 빼 둔 것.",

  themeLabel: "어둡게",

  summaryReported: "원시 보고",
  summaryMerged: "병합 후",
  summaryOutstanding: "미해결",
  summaryAccepted: "이미 수용",
  summaryShown: "여기 표시",
  sourcesUsed: "사용된 소스",
  sourcesNone: "리포트를 낸 스캐너가 없습니다.",

  actNow: "이걸 실행하세요",
  actNowEmpty: "직접 의존성에 적용되는 공개된 수정 버전이 아직 없습니다.",
  clears: (count) => `${count}건 해결`,
  copy: "복사",
  copied: "복사됨",
  workspaceCaveat:
    "워크스페이스 루트입니다. 취약 범위를 선언한 패키지에 버전이 들어가도록 -w <workspace>를 붙이세요. hoisting 때문에 어느 워크스페이스인지는 스캐너가 알려주지 못합니다.",

  transitive: (findings, packages) =>
    `${findings}건(${packages}개 패키지)은 수정 버전이 있지만 다른 의존성을 통해 들어옵니다.`,
  transitiveHow: "강제하려면 이렇게 합니다:",
  transitiveRisk: "상위 패키지가 고정한 버전을 덮어쓰므로 그쪽이 깨질 수 있습니다.",

  ledger: "전체 판정 내역",
  colSeverity: "심각도",
  colPackage: "패키지",
  colAdvisory: "권고",
  colFixedIn: "수정 버전",
  colScore: "점수",
  colSources: "보고한 소스",
  noFix: "없음",
  direct: "직접",
  indirect: "간접",
  whyThisScore: "이 점수의 근거",
  range: "영향 범위",
  alsoKnownAs: "다른 식별자",
  maybeDuplicate: "중복 가능성",
  disagreedFix: (versions, chosen) =>
    `소스마다 다른 수정 버전을 말했습니다(${versions}). ${chosen}이 전부를 충족합니다.`,

  accepted: "이미 수용한 것",
  acceptedBody: (count) => `${count}건이 baseline에 기록되어 위 목록에서 의도적으로 빠졌습니다.`,
  resolved: "더 이상 보고되지 않음",
  resolvedBody: (count) =>
    `수용했던 ${count}건이 이번 실행에서 나오지 않았습니다. --update-baseline로 다시 기록하면 목록에서 빠집니다.`,
  resolvedDoubt: (sources) =>
    `baseline을 기록할 때 기여했던 ${sources}이(가) 이번엔 실행되지 않았습니다. 그중 일부는 고쳐진 게 아니라 아무도 찾아보지 않은 것일 수 있습니다.`,

  nothingOutstanding: "새로 고칠 것이 없습니다.",
  nothingScanned:
    "아무것도 스캔하지 못했으므로 통과가 아닙니다. 각 소스가 왜 멈췄는지는 위 메모에 있습니다.",

  history: "기록된 실행",
  historyOutstanding: "미해결",
  historyAppeared: "새로 나타남",
  historyGone: "더 이상 보고되지 않음",
  historyNote:
    "--record로 요청한 실행만 기록됩니다. 항목이 이 목록에서 빠지는 경우는 셋입니다 — 고쳤거나, baseline에 수용했거나, 그걸 찾아낸 스캐너가 이번엔 돌지 않았거나.",

  reproduce: "이 페이지 재현하기",
  reproduceBody: "이 페이지를 만든 명령:",
  deterministic:
    "같은 판정과 같은 기록이면 바이트 단위로 같은 페이지가 나옵니다. 렌더링 중에 시계를 읽지 않으며, 위의 날짜는 기록 파일에서 온 것입니다.",
  severityRank: "순위",
};

export const LANGUAGES = { en: EN, ko: KO } as const;

export type Language = keyof typeof LANGUAGES;

export function isLanguage(value: string): value is Language {
  return Object.hasOwn(LANGUAGES, value);
}

export function messagesFor(language: Language): Messages {
  return LANGUAGES[language];
}
