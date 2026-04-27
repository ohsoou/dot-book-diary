# Step 3: docs-and-release-hardening

## 읽어야 할 파일

- `docs/UI_GUIDE.md` — §BearSpeechBubble, §LastReadNote, §RoomScene Hitbox 어포던스
- `docs/ARCHITECTURE.md` — §22.7.3 BearSpeechBubble 배치, §22.7.4 hitbox 어포던스
- `docs/ADR.md` — 마지막 ADR 번호(현재 ADR-026) 확인
- `phases/4-mvp-polish/index.json` — step 0~2 summary 확인
- `phases/4-mvp-polish/step{0..2}.md` — 각 step의 AC 재확인

## 배경

step 0~2가 완료됐다. 이 step에서는:

1. **docs 업데이트**: 4-mvp-polish에서 변경된 내용을 반영한다. 특히 BearSpeechBubble이 최근 커밋(`feat: 말풍선을 상단 전체너비 대화박스로 교체`)으로 RoomScene 내부 absolute → 상단 full-width 블록으로 변경됐는데, docs는 이전 상태로 남아있다. 이 불일치를 수정한다.
2. **릴리스 검증**: build/lint/test 0 에러 확인.
3. **phase 완료 처리**: `phases/4-mvp-polish/index.json` 완료 마킹.

## 작업

### 1. `docs/UI_GUIDE.md` 업데이트

**§BearSpeechBubble (L377-399) 수정**: 현재 doc는 "RoomScene 캔버스 내 absolute, z-index 35"로 기술하지만, 실제 구현은 `page.tsx`의 `<main>` 내 별도 full-width 블록이다. 실제 구현에 맞게 수정:

```
### BearSpeechBubble (MVP4, `/` 상단 전체너비 박스)

위치: `page.tsx` <main> flex-col 내 RoomScene 위 별도 full-width 블록. absolute 오버레이 아님.

```
박스 (full-width):
  w-full px-4 py-4
  내부: bg-[#3a2a1a] border-2 border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-4 py-3 w-full
  헤더: text-sm font-bold text-[#f4e4c1] (닉네임)
  본문: text-sm text-[#d7c199] (곰 상태 라벨)
```

접근성: role="status" aria-live="polite" aria-atomic="true".
bearLabel null → unmount(빈 공간 없음).
```

**§LastReadNote (L400-416) 수정**: 위치 설명에 "BottomNav 위, flex-col 마지막" 명시.

**§RoomScene Hitbox 어포던스 (L435-455)** 뒤에 설정 sprite 내용 추가:

```
### RoomScene Settings Sprite (4-mvp-polish)

설정 hitbox와 동일 좌표(`top:2%, right:1.25%, width:6.25%, height:10%`)에 sprite 추가.

SPRITE_DEFS: `{ fileKey: 'setting', label: '설정', z: 35, style: { top:'2%', right:'1.25%', width:'6.25%', height:'10%' } }`
파일: `public/sprites/day/Setting.png`, `public/sprites/night/Setting.png` (day/night 동일 이미지)
z-index 35 — hitbox(50)보다 낮아야 클릭이 통함.
```

**§ThemeSelector** 새 섹션 추가 (§포커스 스타일 이전):

```
### ThemeSelector (MVP1 / 4-mvp-polish)

위치: `/settings` 페이지 테마 섹션.

회원: `ToggleTabs`(자동/낮/밤) 렌더. 변경 시 `updateThemePreferenceAction()` → Supabase 저장.
비회원(4-mvp-polish~): 토글 대신 안내 블록 + 로그인 링크 렌더. IndexedDB 저장 없음.

비회원 비활성 이유: 비회원 테마 저장은 IndexedDB에 가능하나 server component(SSR)가 IndexedDB를 읽을 수 없어 새로고침 시 UI와 실제 상태가 불일치함. 차후 phase에서 SSR↔IndexedDB 동기화로 개선 예정(ADR-027).

금지: 회원 분기에서 `rounded-*`, `backdrop-blur`, `gradient` 사용 금지.
```

### 2. `docs/ARCHITECTURE.md` 업데이트

**§22.7.3 BearSpeechBubble 배치** 수정: "RoomScene 내 absolute" → "page.tsx 상단 full-width 블록"으로 수정.

**§22.8 4-mvp-polish** 새 섹션 추가:

```
## 22.8 4-mvp-polish — 메인 페이지 정비

### 22.8.1 레이아웃 수정 (step0)
- `<main>`의 `inset-0` → `top-0 inset-x-0 bottom-[64px]` 변경으로 BottomNav(fixed bottom-0, 64px)와의 겹침 제거.
- RoomScene `SCENE_STYLE`의 `maxHeight: calc(100dvh - 64px)` 제거 → `height:'100%', maxHeight:'100%', maxWidth:'100%'`로 교체. 부모 flex-1 컨테이너에 위임.

### 22.8.2 설정 sprite (step1)
- `SPRITE_FILES`에 `setting: { day: 'Setting.png', night: 'Setting.png' }` 추가.
- `SPRITE_DEFS`에 `{ fileKey:'setting', z:35, style: { top:'2%', right:'1.25%', width:'6.25%', height:'10%' } }` 추가. 좌표는 HITBOX_DEFS[설정]과 동일.

### 22.8.3 비회원 테마 토글 비활성 (step2, ADR-027)
- `ThemeSelector`에서 `!isLoggedIn`이면 ToggleTabs 대신 로그인 유도 안내 렌더.
- 근거: SSR server component가 비회원 IndexedDB를 읽을 수 없어 새로고침 시 상태 불일치. 차후 SSR↔IndexedDB 동기화로 해결.
```

### 3. `docs/ADR.md` 업데이트

**ADR-027 추가** (ADR-026 뒤):

```
## ADR-027: 비회원 테마 토글 비활성 — SSR/IndexedDB 불일치 회피 (4-mvp-polish)
- **상태**: Accepted
- **날짜**: 2026-04-27
- **컨텍스트**: 비회원이 `/settings`에서 테마를 변경하면 IndexedDB에 저장되지만, `settings/page.tsx`와 `page.tsx`는 server component이므로 IndexedDB를 읽을 수 없다. 새로고침 시 ThemeSelector 토글은 `'system'`으로 리셋되고, RoomScene sprite 경로도 사용자 선택과 무관한 시간 기반 테마로 결정된다. "저장된 것처럼 보이지만 반영 안 됨" UX 혼란 발생.
- **결정**: `ThemeSelector`에서 `!isLoggedIn`이면 ToggleTabs를 렌더하지 않고 "로그인하면 테마를 저장할 수 있어요." 안내 + 로그인 링크를 표시한다.
- **대안**:
  - SSR에서 쿠키로 테마 선호 전달: 비회원 테마를 쿠키에 저장하면 SSR이 읽을 수 있음. 하지만 현재 기존 `updatePreferences(IndexedDB)` 흐름을 쿠키로 전환하는 작업량이 크고, `dbd:preferences` 스토어와 이중 관리 위험.
  - ThemeHydrator client-side 동기화로 RoomScene theme prop 우회: Client에서 IndexedDB를 읽어 RoomScene에 다시 렌더. 하지만 SSR → CSR 교체로 CLS(Layout Shift) 발생, sprite 이미지 이중 로드 가능성.
  - 현 상태 유지(기능은 작동, UI 불일치만 허용): UX 혼란이 크고 사용자 보고 이슈.
- **결과/제약**:
  - 비회원은 테마를 변경할 수 없다. 로그인 유도 UI 제공.
  - `updatePreferences()` 함수는 삭제하지 않는다 — 닉네임 등 다른 preference 저장에도 사용되며, 차후 SSR↔IndexedDB 동기화 phase에서 테마도 포함할 수 있다.
  - ADR-022(Letterbox HUD)의 "비회원 초기 SSR: null이면 렌더 생략" 원칙과 일관성 유지.
```

### 4. 릴리스 검증

```bash
bun build && bun lint && bun test
```
0 에러, 전체 통과.

```bash
grep -rE '(rounded-|backdrop-blur|gradient|indigo-|purple-)' src/
```
빈 결과.

### 5. Phase 완료 처리

`phases/4-mvp-polish/index.json`의 모든 step `"completed"` 확인 후 `"completed_at"` 추가.
`phases/index.json`의 `4-mvp-polish` 항목 상태를 `"completed"`, `"completed_at"` 업데이트.

## Acceptance Criteria

```bash
bun build && bun lint && bun test
```
0 에러, 전체 통과.

```bash
grep -rE '(rounded-|backdrop-blur|gradient|indigo-|purple-)' src/
```
빈 결과.

`docs/ADR.md`에 ADR-027 존재 확인.
`phases/4-mvp-polish/index.json`에 `"completed_at"` 존재 확인.
`phases/index.json`에 `4-mvp-polish`가 `"completed"` 상태로 존재 확인.

## 검증 절차

1. AC 커맨드 순서대로 실행.
2. docs 파일 열어서 수정된 섹션 내용이 실제 코드와 일치하는지 검토.
3. phase 완료 커밋:
   - `docs(4-mvp-polish): step3 — docs-and-release-hardening`
   - `chore(4-mvp-polish): mark phase completed`

## 금지사항

- 테스트를 삭제하거나 skip하여 통과율을 인위적으로 높이지 마라.
- 이 step에서 새 기능(코드 변경)을 추가하지 마라. 문서 + 검증 + 완료 처리만.
- `--force` 또는 `--no-verify` 옵션으로 git 훅을 우회하지 마라.
