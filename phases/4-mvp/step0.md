# Step 0: nickname-label-injection

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` (§22.4 곰 상태 파생, §10 Store 인터페이스)
- `docs/ADR.md` (ADR-016 닉네임/프로필 저장, ADR-021 곰 상태 판정)
- `docs/UI_GUIDE.md` (§카피 톤 & 보이스)
- `src/lib/bear-state.ts` — `computeBearState`, `BearStateResult`, `BearAsset` 타입 + 현행 라벨 문자열
- `src/types/index.ts` — `GuestPreferences.nickname?: string`
- `src/lib/storage/preferences.ts` — `getPreferences()` API

## 배경

MVP4에서 곰 상태 라벨을 K.K. 스타일 말풍선의 **본문**에, 사용자 닉네임을 **헤더**에 표시한다.
이 step의 역할은 닉네임 헬퍼 함수를 격리된 유틸로 추출하는 것이다. `bear-state.ts` 시그니처는 변경하지 않는다.

## 작업

### 1. `src/lib/nickname.ts` 신규 생성

```ts
export function getDisplayNickname(nickname?: string | null): string
```

- `null`, `undefined`, 빈 문자열, 공백만 있는 문자열 → `'책곰이'` 반환
- `nickname.trim()`이 1자 이상이면 그대로 반환 (30자 이내는 DB/preference에서 이미 보장됨)
- 이 파일에 폴백 상수(`DEFAULT_NICKNAME = '책곰이'`)를 정의해 단일 진실원으로 관리

### 2. `src/lib/nickname.test.ts` 신규 생성

다음 케이스를 모두 커버한다:
- `undefined` → `'책곰이'`
- `null` → `'책곰이'`
- `''` → `'책곰이'`
- `'   '` (공백만) → `'책곰이'`
- `'독서왕'` → `'독서왕'`
- `'  곰  '` (앞뒤 공백) → `'곰'` (trim 확인)

### 3. `src/lib/bear-state.ts` — 시그니처 유지, 라벨 일관성 점검

- `computeBearState` 시그니처 **변경하지 않는다**.
- 현행 라벨 문자열이 `docs/ADR.md ADR-026` 에서 정한 톤과 맞는지 확인하고, 필요 시 1~2건 이내 소폭 다듬기(외부 시그니처 영향 없음). 다듬는다면 `bear-state.test.ts` 회귀 테스트를 함께 수정한다.
- 변경 없으면 그대로 둔다.

## Acceptance Criteria

```bash
bun test src/lib/bear-state.test.ts src/lib/nickname.test.ts
bun build
```

에러 없음. `nickname.test.ts` 전체 통과.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `src/lib/nickname.ts`가 UI·컴포넌트를 import하지 않는가?
   - 폴백 상수가 `'책곰이'`로 단일화되었는가?
   - `bear-state.ts` 시그니처가 변경되지 않았는가?
3. 결과에 따라 `phases/4-mvp/index.json`의 step 0을 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러"`
4. 코드 커밋: `feat(4-mvp): step0 — nickname-label-injection`
5. 메타 커밋: `chore(4-mvp): step0 output`

## 금지사항

- UI 컴포넌트(`src/components/`) 수정 금지. 이유: 다음 step에서 순서대로 처리함.
- `RoomScene.tsx`, `BearStateHydrator.tsx`, `src/app/page.tsx` 수정 금지.
- `computeBearState` 시그니처(파라미터·반환 타입) 변경 금지. 이유: 기존 테스트와 호출부 전체에 영향.
- 기존 테스트를 삭제하거나 통과 기준을 완화하지 마라.
