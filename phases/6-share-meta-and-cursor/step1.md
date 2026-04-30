# Step 1: room-pointer-cursor

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/components/room/RoomScene.tsx` — HITBOX_DEFS 및 hitbox button 렌더링 (L316-323), 램프 버튼 (L327-339)
- `src/app/globals.css` — 기존 CSS 유틸 클래스 패턴 (hitbox-bob, delay-* 등 애니메이션 클래스)
- `docs/UI_GUIDE.md` — ADR-031 (Cursor 섹션이 step0에서 추가됐어야 함)
- `src/components/room/RoomScene.test.tsx` — 기존 hitbox 테스트 패턴 파악

## 배경

`RoomScene` 내 클릭 가능한 영역(hitbox)은 투명 `<button>` 요소로 구현된다.
현재 이 버튼들은 기본 커서를 사용한다 (`cursor: auto`).

사용자가 클릭 가능한 영역에 호버했을 때 픽셀 아트 스타일의 커스텀 포인터(`public/Pointer.svg`)가 표시되도록 한다.

**에셋 위치**: `public/Pointer.svg` (이미 존재 확인됨)
**공개 URL**: `/Pointer.svg`

**적용 대상**:
1. `HITBOX_DEFS`의 모든 hitbox `<button>` (다이어리, 책장, 캘린더, 책 등록, 설정 — 5개)
2. 야간 테마의 램프 `<button>` (L327-339)

**적용 방법**: `globals.css`에 `.cursor-pixel` 유틸 클래스 추가 후, 해당 버튼에 className으로 적용.
Tailwind 임의값 문법(`cursor-[url(...)]`)은 사용하지 않는다 — CSS 파일이 더 안정적.

**TDD**: 테스트를 먼저 작성하고, 테스트가 통과하도록 구현하라.

## 작업

### 1. `src/app/globals.css` — 커스텀 커서 클래스 추가

`@layer utilities` 또는 적절한 위치에 아래를 추가하라 (기존 패턴 확인 후 동일 위치에):

```css
.cursor-pixel {
  cursor: url('/Pointer.svg') 0 0, pointer;
}
```

- hotspot `0 0`: 포인터 이미지의 좌상단이 클릭 지점이 됨. `Pointer.svg`가 화살표 형태이면 적절.
- fallback `pointer`: 커스텀 이미지 로드 실패 시 기본 손가락 커서.

### 2. `docs/UI_GUIDE.md` — Cursor 섹션 추가 (없는 경우에만)

이미 추가되어 있다면 건너뛴다. 없으면 파일 끝에 추가:

```
### 커스텀 커서

클릭 가능한 sprite 영역(hitbox button)에 `cursor-pixel` 클래스를 적용한다.

- 에셋: `public/Pointer.png`
- CSS: `cursor: url('/Pointer.svg') 0 0, pointer`
- 적용 대상: RoomScene의 모든 hitbox button, 램프 button
- 비인터랙티브 영역(배경 이미지, 장식 sprite)에는 적용하지 않는다
```

### 3. `src/components/room/RoomScene.tsx` — hitbox button에 클래스 적용

**HITBOX_DEFS button** (L317-323):
```tsx
className="absolute bg-transparent focus-visible:outline focus-visible:outline-[#e89b5e] cursor-pixel"
```

**램프 button** (L336):
```tsx
className="absolute bg-transparent cursor-pixel"
```

현재 램프 버튼의 `cursor-pointer`를 `cursor-pixel`로 교체한다.

### 4. `src/components/room/RoomScene.test.tsx` 업데이트 (TDD 우선)

기존 hitbox 관련 테스트에 아래를 추가하라:

- HITBOX_DEFS의 첫 번째 hitbox button에 `cursor-pixel` 클래스가 있는지 확인
- 램프 button에 `cursor-pixel` 클래스가 있는지 확인 (야간 테마로 렌더 시)

기존 hitbox 테스트(개수, 각 hitbox의 aria-label 등)는 그대로 유지한다.

## Acceptance Criteria

```bash
bun build
```
0 에러.

```bash
bun lint
```
0 에러.

```bash
bun test src/components/room/RoomScene
```
통과.

```bash
bun test
```
전체 통과 (기존 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `bun dev` 후 `/`에서 수동 확인:
   - 곰, 다이어리, 책장, 창문, 책더미 영역에 마우스 올렸을 때 `Pointer.svg` 커서 표시됨.
   - 배경 이미지 영역은 기본 커서 유지.
3. `phases/6-share-meta-and-cursor/index.json`의 step 1을 업데이트한다.
4. 커밋:
   - `feat(6-share-meta-and-cursor): step 1 — room-pointer-cursor`
   - `chore(6-share-meta-and-cursor): step 1 output`

## 금지사항

- `SpriteImage` 컴포넌트에 cursor 스타일을 적용하지 마라 — 이미지는 `aria-hidden`이고 클릭을 받지 않는다. hitbox button에만 적용한다.
- `cursor-[url('/Pointer.svg')_0_0,_pointer]` 형태의 Tailwind 임의값 문법을 사용하지 마라 — globals.css 클래스를 사용한다.
- 기존 hitbox button의 `focus-visible:outline` 스타일을 제거하지 마라 — 접근성 포커스 표시기다.
- 기존 테스트를 삭제하거나 skip하지 마라.
