# Step 2: room-scene-bear-asset

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§22.4 곰 상태 파생)
- `/docs/ADR.md` (ADR-021 night 테마 대응)
- `/src/components/room/RoomScene.tsx` — 현재 구현 전체 파악 필수
- `/src/components/room/RoomScene.test.tsx` — 기존 테스트 파악 필수
- `/src/lib/bear-state.ts` — step 0에서 생성됨. BearAsset 타입 참조.

## 배경

`RoomScene`은 현재 `bear` sprite를 `SPRITE_FILES.bear[theme]` 파일명(`'Bear.png'`)으로만 로드한다. 2-mvp에서는 외부에서 주입된 `bearAsset` prop이 있으면 해당 파일명을 override하여 `Bear_sleeping.png`, `Bear_playing.png` 등 variant를 렌더해야 한다.

Night 테마 대응: `public/sprites/night/`에 `Bear_*.png` 6종 에셋이 사용자에 의해 배치된다. 코드 로직은 day/night 무관하게 동일 파일명을 `/sprites/{theme}/` 하위에서 찾으므로, 에셋만 존재하면 자동으로 동작한다. **이 step에서는 night 에셋 파일 존재를 검증(파일 시스템 확인)하고, 없으면 step을 `blocked`로 기록한다.**

## 작업

### 1. `RoomScene.tsx` — bearAsset prop 추가

`RoomSceneProps`에 선택 prop 추가:

```ts
interface RoomSceneProps {
  // ... 기존 props ...
  bearAsset?: string  // 'Bear.png' | 'Bear_sleeping.png' | ...
                      // 제공 시 SPRITE_FILES.bear[theme] 대신 사용
}
```

`SPRITE_DEFS` 중 `fileKey === 'bear'`인 항목의 파일명 결정 로직:
- `bearAsset`이 제공되면 → `bearAsset`
- 제공되지 않으면 → 기존 `SPRITE_FILES.bear[theme]` (= `'Bear.png'`)

구현 방식: `SPRITE_DEFS.map(...)` 에서 src 결정 시 fileKey가 `'bear'`면 조건부로 override. 또는 `bearAsset` prop을 `RoomScene` 함수 내에서 참조하여 적용. **`SPRITE_DEFS`는 컴포넌트 외부 상수이므로 변경하지 말 것. 함수 내에서 동적으로 처리.**

`SPRITE_FILES` 맵에는 변경 없음. Bear variant들은 모두 day/night 동일 파일명을 사용하므로 `SPRITE_FILES`에 추가할 필요 없음.

### 2. `RoomScene.test.tsx` — 테스트 추가

기존 테스트는 모두 유지. 새로운 테스트 케이스 추가:

1. `bearAsset="Bear_sleeping.png"` prop으로 렌더 시 `img[src="/sprites/day/Bear_sleeping.png"]` 존재 확인
2. `bearAsset="Bear_playing.png"`, `theme="night"` → `img[src="/sprites/night/Bear_playing.png"]` 존재 확인
3. `bearAsset` 미제공 시 기존과 동일하게 `Bear.png` 사용

### 3. Night 에셋 존재 확인 (blocking check)

step 시작 시 아래 파일들이 `public/sprites/night/`에 존재하는지 확인:
- `Bear_drinking.png`
- `Bear_eating.png`
- `Bear_healing.png`
- `Bear_playing.png`
- `Bear_sleeping.png`
- `Bear_working.png`

**6종 중 하나라도 없으면 즉시 step을 `blocked`로 기록하고 작업을 중단한다.** `blocked_reason`: "night 에셋 N종 미존재: {파일명 목록}. public/sprites/night/에 배치 후 재실행."

## Acceptance Criteria

```bash
bun test src/components/room/RoomScene.test.tsx
bun run build
bun lint
```

## 검증 절차

1. Night 에셋 존재 여부 먼저 확인. 없으면 blocked 기록 후 중단.
2. AC 커맨드 실행.
3. `RoomScene.tsx`의 `RoomSceneProps` 인터페이스에 `bearAsset?` 추가 확인.
4. 새 테스트 케이스 3개가 통과하는지 확인.
5. 기존 11개 테스트가 모두 유지되는지 확인.
6. 결과에 따라 `phases/2-mvp/index.json`의 step 2 업데이트.
7. 커밋 — 코드 변경(`feat:`)과 메타데이터(`chore:`) 분리 커밋

## 금지사항

- `SPRITE_FILES` 맵에 Bear variant 6종을 추가 금지. 이유: `bearAsset` prop이 파일명을 직접 주입하므로 맵 변경 불필요, 불필요한 복잡도 추가.
- `bearAsset`을 `SPRITE_DEFS` 배열 상수에 반영 금지. 이유: `SPRITE_DEFS`는 고정 상수이며 테마에 따른 동적 파일명 결정은 렌더 함수 내부에서만 수행.
- 기존 11개 테스트를 깨뜨리지 마라.
- Night 에셋 없이 blocked 상태를 무시하고 계속 진행 금지. 이유: night 테마에서 variant 이미지 404가 발생함.
