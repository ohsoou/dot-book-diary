# Step 3: release-hardening-mvp3

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` (금지 사항 목록)
- `/phases/3-mvp/index.json` (step 0~2 summary)

## 작업

3-mvp 출시 기준을 검증하고 릴리스 가드레일을 통과시킨다. 신규 기능 코드는 추가하지 않는다.

### 1. 자동 게이트

```bash
bun run build
bun lint
bun test
```

위 세 커맨드가 **0 에러**여야 한다.
실패 시 근본 원인을 찾아 수정. 회피 목적의 타입 단언(`as any`), `eslint-disable`, `vitest skip` 사용 금지.

### 2. Grep 가드 (UI_GUIDE 금지 사항)

```bash
git diff main..HEAD -- src/ | grep -E "(\+.*rounded-|\+.*backdrop-blur|\+.*bg-gradient|\+.*indigo|\+.*purple)"
```

빈 결과여야 한다.

### 3. 수동 체크리스트 (코드 변경 없이 시나리오 검증)

**night 테마 램프 토글**:
- night 테마로 진입 → 램프 클릭 → `Background_off.png`, `Table_Lamp_off.png` 로드 확인 (Network 탭)
- off 상태에서 `.lamp-flicker` 클래스 없음 (DevTools Elements 탭)
- 한 번 더 클릭 → on 복귀, `lamp-flicker` 재적용
- 새로고침 → off 상태 유지 (localStorage `dbd:lamp_state = "off"`)

**day 테마 격리**:
- day 테마에서 `aria-label="램프 전원"` 버튼 미존재 확인 (DevTools)

**기존 기능 회귀 없음**:
- 다이어리/책장/캘린더/책등록/설정 hitbox 정상 동작
- bear-idle 애니메이션 정상 (on 상태에서)
- `prefers-reduced-motion: reduce` 에서 애니메이션 전부 없음

### 4. 테스트 커버리지 확인

다음 파일에 테스트가 있는지 확인:
- `src/lib/lamp-state.ts` → `src/lib/lamp-state.test.ts` (step 0)
- `src/components/room/RoomScene.tsx` → `src/components/room/RoomScene.test.tsx` (step 1)

누락 시 최소 smoke 1건 추가.

### 5. 에셋 확인

`public/sprites/night/`에 아래 파일 존재 확인:
- `Background_off.png`
- `Table_Lamp_off.png`

누락 시 blocked 기록 후 중단.

## Acceptance Criteria

```bash
bun run build
bun lint
bun test
```

모두 0 에러. 그리고:

```bash
git diff main..HEAD -- src/ | grep -E "(\+.*rounded-|\+.*backdrop-blur|\+.*bg-gradient|\+.*indigo|\+.*purple)"
```

빈 결과여야 한다.

## 검증 절차

1. AC 커맨드 전부 통과.
2. 위 수동 체크리스트를 수행한 결과를 `phases/3-mvp/index.json` step3 summary에 한 줄 요약으로 기록.
3. 결과에 따라 status 업데이트.
4. 커밋 분리: 실제 버그 수정이 있다면 `fix:`로, 없다면 이 step은 메타(`chore:`) 커밋만.

## 금지사항

- 새 기능 추가 금지. 이유: 이 step은 하드닝 전용.
- `eslint-disable-next-line`, `// @ts-ignore`, `vi.mock` 남용으로 실패를 회피하지 마라. 이유: 품질 가드의 의미 상실.
- 수동 체크리스트 문서를 별도 .md 파일로 만들지 마라. 이유: 인덱스 summary 한 줄로 충분.
- 기존 테스트를 깨뜨리지 마라.