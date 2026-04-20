# Step 0: theme-docs-and-tokens

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PRD.md` (§5, §10.4, §12)
- `/docs/ARCHITECTURE.md` (§2, §10.1, §22.1~§22.3)
- `/docs/ADR.md` (ADR-017 Superseded, ADR-018~020 신설 항목)
- `/docs/UI_GUIDE.md` (낮 테마 팔레트, 애니메이션 구현 스펙)
- `/src/app/globals.css`
- `/src/app/layout.tsx`

docs는 이미 MVP1 범위로 갱신되어 있다. 이 step은 **코드(globals.css) 한 파일만** 바꾼다.

## 작업

`src/app/globals.css`에 낮/밤 테마별 CSS 변수 블록을 도입한다.

### 요구사항

1. 기존 `:root` 블록의 CSS 변수 값은 **야간 팔레트**다. 이를 `[data-theme="night"]` 선택자로 옮긴다. `:root` 자체에는 폰트 등 테마 무관 변수만 남긴다.
2. `[data-theme="day"]` 선택자에 낮 팔레트를 정의한다. UI_GUIDE.md의 "낮 테마 팔레트" 표의 값을 그대로 사용한다.
3. `html` 엘리먼트에 `data-theme` 속성이 없으면 기본적으로 야간 값이 적용되도록 `:root`에도 야간 값을 **복제 폴백**한다. (SSR 초기 렌더 안전성)
4. `body`의 `background-color`, `color`는 변수 참조만 유지하고 값은 변경하지 않는다.
5. 기존 `@keyframes bear-idle`, `@keyframes lamp-flicker`는 **이 step에서 추가하지 않는다** (step5에서).
6. `prefers-reduced-motion` 블록은 그대로 유지.

### 금지

- 이 step에서 `layout.tsx`, `page.tsx`, 컴포넌트, 타입, 스키마 파일 수정 금지. CSS 변수 정의만 담당한다.
- 새 컬러 값 임의 추가 금지. UI_GUIDE 표의 값만 쓴다.
- `transition: background-color`, `transition: all` 같은 전역 트랜지션 추가 금지.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `globals.css`를 열어 세 블록(`:root`, `[data-theme="night"]`, `[data-theme="day"]`)이 모두 존재하고 야간 팔레트가 `:root`와 `[data-theme="night"]`에서 동일한지 확인한다.
3. 결과에 따라 `phases/1-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 3회 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."`
4. 커밋 — 코드 변경과 메타데이터(`chore`) 분리 커밋.

## 금지사항

- 기존 테스트를 깨뜨리지 마라.
- 하드코드 색상(`text-[#d7c199]`)을 일괄 치환하지 마라. 이유: 범위가 step 밖이고 리뷰 부담이 커진다. 신규 코드에만 변수를 강제한다.