# Step 1: room-scene-lamp-toggle

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ADR.md` (ADR-021, ADR-022, ADR-023)
- `/docs/UI_GUIDE.md` (금지 사항 확인)
- `/src/components/room/RoomScene.tsx` — 전체 구현 파악 필수
- `/src/components/room/RoomScene.test.tsx` — 기존 테스트 파악 필수
- `/src/lib/lamp-state.ts` — step 0에서 생성됨

## 배경

`RoomScene`은 현재 night 테마에서도 항상 `Background.png`와 `Table_Lamp.png`를 사용한다. 이 step에서는 night 테마 한정으로 램프 클릭 시 on/off 상태를 토글하고, off일 때 `Background_off.png`, `Table_Lamp_off.png`로 교체하며 `lamp-flicker` 애니메이션을 정지한다. 상태는 `localStorage`에 유지한다.

## 선결 조건 확인 (blocking check)

작업 시작 전 아래 파일이 존재하는지 확인한다:

- `public/sprites/night/Table_Lamp_off.png`

**파일이 없으면 즉시 step을 `blocked`로 기록하고 중단한다.**
`blocked_reason`: "`public/sprites/night/Table_Lamp_off.png` 미존재. 사용자가 파일을 배치한 뒤 재실행."

`public/sprites/night/Background_off.png`는 이미 존재하므로 별도 확인 불필요.

## 작업

### 1. `src/components/room/RoomScene.tsx` 수정

**추가할 import**:
```ts
import { readLampState, writeLampState, type LampState } from '@/lib/lamp-state'
```

**`RoomSceneProps`에 변경 없음** (외부 주입 불필요, 내부 상태로 관리).

**state 추가**:
```ts
const [lampState, setLampState] = useState<LampState>('on')
```

**마운트 시 localStorage 복원** (기존 `useEffect` 아래에 추가):
```ts
useEffect(() => {
  setLampState(readLampState())
}, [])
```

**파일명 헬퍼 함수** (컴포넌트 함수 내부에서 선언 — `SPRITE_DEFS`는 건드리지 않는다):
```ts
function resolveFilename(fileKey: string, baseFilename: string): string {
  if (theme === 'night' && lampState === 'off' && (fileKey === 'background' || fileKey === 'tableLamp')) {
    return baseFilename.replace(/\.png$/, '_off.png')
  }
  return baseFilename
}
```

**`SPRITE_DEFS.map(...)` 내 src 결정** (기존 `const filename = SPRITE_FILES[def.fileKey]![theme]` 직후):
```ts
const filename = resolveFilename(def.fileKey, SPRITE_FILES[def.fileKey]![theme])
```

**`lamp-flicker` 애니메이션 조건** (기존 `extraClass` 결정 로직):
```ts
// 기존: def.animClass && !reducedMotion ? def.animClass : ''
// 변경: lamp-flicker는 lampState === 'off'일 때도 제거
extraClass={def.animClass && !reducedMotion && !(def.animClass === 'lamp-flicker' && lampState === 'off') ? def.animClass : ''}
```

**램프 토글 버튼** (HITBOX_DEFS 렌더 직후, `</div>` 닫기 전에 추가):
```tsx
{theme === 'night' && (
  <button
    type="button"
    aria-label="램프 전원"
    aria-pressed={lampState === 'on'}
    onClick={() => {
      const next: LampState = lampState === 'on' ? 'off' : 'on'
      setLampState(next)
      writeLampState(next)
    }}
    className="absolute bg-transparent cursor-pointer"
    style={{ zIndex: 50, bottom: '19%', right: '-0.1563%', width: '19.8438%', height: '31%' }}
  />
)}
```

**주의**: `SPRITE_DEFS`, `SPRITE_FILES`, `HITBOX_DEFS` 상수 자체는 변경 금지. 렌더 함수 내에서 동적으로 처리.

### 2. `src/components/room/RoomScene.test.tsx` — 테스트 추가 (먼저 작성)

기존 테스트는 모두 유지. 새로운 케이스 추가:

1. **초기 on 상태**: `theme="night"` → `img[src="/sprites/night/Background.png"]` 존재, `img[src="/sprites/night/Table_Lamp.png"]` 존재, `.lamp-flicker` 클래스 보유 이미지 존재.
2. **토글 → off**: 램프 전원 버튼(`aria-label="램프 전원"`) 클릭 → `img[src="/sprites/night/Background_off.png"]` 존재, `img[src="/sprites/night/Table_Lamp_off.png"]` 존재, `.lamp-flicker` 클래스 이미지 없음.
3. **재토글 → on**: 한 번 더 클릭 → 다시 on 상태로 복귀 (Background.png, Table_Lamp.png).
4. **day 테마**: `theme="day"` → `aria-label="램프 전원"` 버튼 미렌더.
5. **localStorage 복원**: `localStorage.setItem('dbd:lamp_state', 'off')` 설정 후 컴포넌트 마운트 → off 상태로 초기화. `act` + `waitFor` 활용.

`reducedMotion`이 true일 때 `lamp-flicker` 클래스 없음은 기존 테스트에서 이미 검증하므로 중복 추가 불필요.

## Acceptance Criteria

```bash
bun test src/components/room/RoomScene.test.tsx
bun run build
bun lint
```

## 검증 절차

1. 선결 조건(`Table_Lamp_off.png`) 확인. 없으면 blocked 기록 후 중단.
2. AC 커맨드 실행.
3. 기존 테스트 전부 통과 확인.
4. 새 테스트 5개 통과 확인.
5. 결과에 따라 `phases/3-mvp/index.json` step 1 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "RoomScene에 lampState toggle 추가: night only 램프 버튼, Background/Table_Lamp _off 교체, lamp-flicker 조건부 제거, localStorage 복원"`
   - blocked → `"status": "blocked"`, `"blocked_reason": "Table_Lamp_off.png 미존재"`
6. 커밋 — 코드(`feat:`), 메타데이터(`chore:`) 분리.

## 금지사항

- `SPRITE_DEFS`, `SPRITE_FILES`, `HITBOX_DEFS` 상수 자체 변경 금지. 이유: 상수는 고정이며 동적 처리는 렌더 함수 내부에서만.
- `rounded-*`, `backdrop-blur`, `bg-gradient`, indigo/purple 사용 금지. 이유: UI_GUIDE 금지 사항.
- 램프 버튼에 고정 높이/너비(`h-*`, `w-*` Tailwind 유틸) 사용 금지. 이유: 퍼센트 좌표는 inline style로 관리. (단, `bg-transparent`, `cursor-pointer` 등 유틸은 허용)
- `Table_Lamp_off.png` 없이 blocked 무시하고 진행 금지. 이유: night 테마 off 상태에서 404 발생.
- 기존 테스트를 깨뜨리지 마라.