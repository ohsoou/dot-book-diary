# Step 2: docs-update

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PRD.md` — F1 기능 표, §10 MVP 범위 확인
- `/docs/ARCHITECTURE.md` — §22 이후 끝부분 확인 (MVP2 내용 파악)
- `/docs/ADR.md` — ADR-022 이후 끝 확인 (마지막 ADR 번호 파악)
- `/docs/UI_GUIDE.md` — 애니메이션 섹션 확인
- `/phases/3-mvp/index.json` — step 0, 1 summary 참조

## 배경

step 0(lamp-state.ts)과 step 1(RoomScene 램프 토글)에서 구현한 내용을 문서에 반영한다. 신규 코드는 추가하지 않는다.

## 작업

### 1. `docs/PRD.md` 수정

**§5 기능 요구사항 F1 표** 또는 MVP 기능 목록에 아래 항목 추가:

> 밤 테마에서 램프 클릭 시 on/off 토글. off 상태에서는 `Background_off.png`, `Table_Lamp_off.png` 교체 및 `lamp-flicker` 애니메이션 정지. 상태는 localStorage 유지.

적절한 MVP 단계(MVP2 또는 MVP3)에 명시. 이 기능은 3-mvp phase에서 구현되었으므로 MVP3로 분류.

### 2. `docs/ARCHITECTURE.md` 수정

기존 §22(MVP2 곰 상태·Letterbox HUD) 뒤에 **§22.6 야간 램프 on/off 토글** 절 추가:

내용:
- night 테마 한정 기능.
- 스프라이트 파일명 규칙: `*` = on, `*_off` = off. 대상: `Background.png`/`Background_off.png`, `Table_Lamp.png`/`Table_Lamp_off.png`.
- 상태 저장: `localStorage`, 키 `dbd:lamp_state` (`'on' | 'off'`). `src/lib/lamp-state.ts`의 `readLampState`/`writeLampState` 사용.
- 마운트 시 `useEffect`로 1회 hydrate. SSR에서는 `'on'`으로 초기 렌더.
- 램프 버튼: `theme === 'night'`일 때만 렌더. `aria-label="램프 전원"`, `aria-pressed`.
- `lamp-flicker` 애니메이션: off 상태이거나 `prefers-reduced-motion: reduce`일 때 정지.

### 3. `docs/ADR.md` 수정

마지막 ADR 다음에 **ADR-023** 추가:

```markdown
## ADR-023: 야간 램프 on/off 토글 — localStorage 상태 저장, night 한정
- **상태**: Accepted
- **날짜**: 2026-04-22
- **컨텍스트**: 밤 방의 램프를 클릭해 끄고 켤 수 있다. 상태를 어디에 저장하고 어느 테마에 적용할지 결정 필요.
- **결정**:
  - 저장소: `localStorage` (`dbd:lamp_state`). 재방문 시 복원.
  - 테마 범위: night 전용. day에서는 버튼 미렌더.
  - 파일명 규칙: `*_off.png` suffix. `SPRITE_FILES` 상수 변경 없이 렌더 함수 내 `resolveFilename` 헬퍼로 처리.
  - 애니메이션: off 상태에서 `lamp-flicker` 제거 (`reducedMotion` 조건과 병렬).
- **대안**:
  - IndexedDB preferences: 비동기 + hydrator 컴포넌트 추가 필요. 과도한 복잡도.
  - in-memory only (useState): 새로고침 시 항상 on으로 초기화. "나의 방" 정서와 맞지 않음.
- **결과/제약**:
  - `Table_Lamp_off.png`, `Background_off.png` 에셋 필요 (`public/sprites/night/`).
  - SSR hydration mismatch 방지: `useState('on')` 초기값 고정, 마운트 후 localStorage 읽기.
```

### 4. `docs/UI_GUIDE.md` 수정

애니메이션 관련 섹션(bear-idle, lamp-flicker 언급 부분)에 아래 1줄 추가:

> `lamp-flicker`: 램프 off 상태(`lampState === 'off'`)에서도 비적용. `prefers-reduced-motion` 규칙과 동일하게 처리.

## Acceptance Criteria

```bash
bun run build
bun lint
```

(문서 전용 step이므로 테스트 추가 없음)

## 검증 절차

1. AC 커맨드 실행.
2. ADR-023 추가 확인.
3. ARCHITECTURE.md §22.6 추가 확인.
4. PRD.md F1 또는 MVP3 항목에 램프 토글 언급 확인.
5. UI_GUIDE.md 애니메이션 섹션에 lamp-flicker off 조건 언급 확인.
6. 결과에 따라 `phases/3-mvp/index.json` step 2 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "docs 업데이트: ADR-023, ARCHITECTURE §22.6, PRD MVP3 항목, UI_GUIDE 애니메이션 섹션"`
7. 커밋 — `docs:` 커밋과 메타데이터 `chore:` 분리.

## 금지사항

- 신규 코드 추가 금지. 이유: 이 step은 문서 업데이트 전용.
- 기존 ADR 내용 변경 금지. 이유: ADR은 불변 기록. 새 ADR로만 내용 추가.
- 기존 테스트를 깨뜨리지 마라.