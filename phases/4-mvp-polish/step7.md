# Step 7: bear-as-settings-entry

## 읽어야 할 파일

- `src/components/room/RoomScene.tsx` — `HITBOX_DEFS` (L141~), `SPRITE_DEFS`의 bear 엔트리 좌표, `RoomSceneProps`, `HrefKey`
- `src/components/room/RoomScene.test.tsx` — step 6 이후 상태 (4개 hitbox 기준)
- `docs/UI_GUIDE.md` — §RoomScene Hitbox 어포던스(L434~), §BearSpeechBubble(L377~), §LastReadNote(L397~), §Settings Sprite(L473~)
- `docs/PRD.md` — 메인 화면 인터랙션/내비게이션 항목
- `docs/ADR.md` — ADR-027까지 완료, ADR-028 신규 작성

이전 step에서 완료된 내용:
- step 5: `<main>` → CSS grid 3-row, 두 박스 수직 중앙 정렬
- step 6: `setting` sprite/hitbox/애니메이션 제거, Setting.png 삭제, 테스트 4개 기준으로 업데이트

## 배경

설정 진입점을 우상단 톱니바퀴(step 6에서 제거)에서 **곰 캐릭터**로 변경한다. 곰 sprite와 동일한 좌표에 투명 hitbox 버튼을 추가해 클릭 시 `/settings`로 이동한다.

### 곰 sprite 좌표 (SPRITE_DEFS 기준)
```
bottom: '1.25%', left: '42.0313%', width: '32.8125%', height: '42.25%'
```
hitbox는 이 좌표와 완전히 동일하게 설정한다.

### Tab 순서
다이어리 → 책장 → 캘린더 → 책 등록 → **곰(설정)**

HITBOX_DEFS 배열 끝에 추가하면 현재 Tab 순서(다이어리 첫 번째)가 그대로 유지된다.

### aria-label
`"설정"` — 기존 테스트가 '설정' label을 기대하고 있으며, 행동(설정 진입)을 가장 명확하게 표현.

## 작업

### 1. `src/components/room/RoomScene.tsx`

`HITBOX_DEFS` 배열 끝에 곰 hitbox 추가:

```ts
{
  label: '설정',
  hrefKey: 'settingsHref',
  style: { bottom: '1.25%', left: '42.0313%', width: '32.8125%', height: '42.25%' },
},
```

다른 코드는 수정하지 않는다. `hrefMap`에 이미 `settingsHref: '/settings'`가 있으므로 별도 추가 불필요.

### 2. `src/components/room/RoomScene.test.tsx`

step 6에서 4개 기준으로 수정된 테스트를 5개 기준으로 되돌리되, `'설정'` 버튼이 이제 곰 위치에 있음을 반영한다.

#### 2-1. `'renders 4 hitbox buttons'` → `'renders 5 hitbox buttons'`로 수정

```ts
it('renders 5 hitbox buttons with correct aria-labels', () => {
  render(<RoomScene theme="day" />)
  expect(screen.getByRole('button', { name: '다이어리' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '책장' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '캘린더' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '책 등록' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '설정' })).toBeInTheDocument()
})
```

#### 2-2. `'navigates to correct href on each hitbox click'`에 `'설정'` 클릭 복원

```ts
fireEvent.click(screen.getByRole('button', { name: '설정' }))
expect(mockPush).toHaveBeenCalledWith('/settings')
```

#### 2-3. `'hitbox buttons have no dashed outline'`에 `'설정'` 복원

```ts
for (const label of ['다이어리', '책장', '캘린더', '책 등록', '설정']) {
```

#### 2-4. 곰 hitbox 좌표 테스트 추가

```ts
it('bear hitbox has same coordinates as bear sprite', () => {
  render(<RoomScene theme="day" />)
  const btn = screen.getByRole('button', { name: '설정' })
  expect(btn.style.bottom).toBe('1.25%')
  expect(btn.style.left).toBe('42.0313%')
})
```

### 3. `docs/UI_GUIDE.md`

#### 3-1. §BearSpeechBubble (L377~) — 위치 설명 업데이트

"위치: `page.tsx` `<main>` flex-col 내 RoomScene **위** 별도 full-width 블록." 를 아래로 교체:

```
위치: `page.tsx` `<main>` CSS grid(grid-rows: 1fr auto 1fr)의 **row 1**. `div.flex.flex-col.items-stretch.justify-center`로 감싸
수직 중앙 정렬. GuestBanner가 있을 경우 위에 쌓임.
```

외부 래퍼 className 항목 업데이트:
```
외부 래퍼: div.flex.flex-col.items-stretch.justify-center (row 1 wrapper)
BearSpeechBubble 자체: w-full px-4 py-2
```

#### 3-2. §LastReadNote (L397~) — 위치 설명 업데이트

"위치: `page.tsx` `<main>` flex-col 내 RoomScene 아래 마지막 요소." 를 아래로 교체:

```
위치: `page.tsx` `<main>` CSS grid의 **row 3**. `div.flex.items-center.justify-center`로 감싸 수직 중앙 정렬.
BottomNav(fixed, 64px) 위에 표시되도록 `<main>`은 `bottom-[64px]`로 설정(4-mvp-polish step 0~).
```

#### 3-3. §RoomScene Hitbox 어포던스 → Sprite 매핑 표 (L438~446)

본문 "5개 hitbox(다이어리/책장/캘린더/책 등록/설정)" 를 유지하되 내용 변경:

| Hitbox | SPRITE fileKey | 좌표 (640×400 기준 %) |
|---|---|---|
| 다이어리 | `diary`     | `bottom:4.25%, left:35.3438%, w:14.0625%, h:18%` |
| 책장     | `wallShelf` | `top:17.25%, right:3.125%, w:21.5625%, h:17.25%` |
| 캘린더   | `window`    | `top:17.5%, left:32.8125%, w:35.1563%, h:33.75%` |
| 책 등록  | `bookstack` | `bottom:6.25%, right:14.0625%, w:17.5%, h:19%` |
| 곰(설정) | `bear`      | `bottom:1.25%, left:42.0313%, w:32.8125%, h:42.25%` |

#### 3-4. §애니메이션 규격 — delay-4 제거

`.hitbox-bob.delay-4 { animation-delay: 1.2s; }` 줄 삭제.

곰 hitbox는 `bear-idle` 애니메이션을 SPRITE 이미지에서 유지하므로 `hitbox-bob`을 별도 적용하지 않는다고 명시:

> 곰(설정) hitbox: `bear` sprite에 이미 `bear-idle` 애니메이션이 적용되어 있어 `hitbox-bob`을 추가 적용하지 않는다. 클릭 어포던스는 `bear-idle` 모션이 담당.

#### 3-5. §Settings Sprite (4-mvp-polish) 섹션 교체

기존 내용을 아래로 대체:

```
### Settings Sprite (4-mvp-polish → 제거됨, 4-mvp-polish step 6)

4-mvp-polish step 1에서 `Setting.png` sprite를 추가하고 우상단(`top:2%, right:1.25%`)에 배치했으나,
step 6에서 제거됨. 설정 진입점은 step 7에서 곰 캐릭터 hitbox로 대체.
```

### 4. `docs/PRD.md`

메인 화면 인터랙션/내비게이션 항목에서 설정 진입 경로를 갱신한다. "톱니바퀴" 또는 "⚙" 언급이 있으면 "곰 캐릭터를 클릭하면 `/settings`로 이동" 으로 교체. 기술이 없으면 해당 항목에 한 줄 추가:

> - 곰 캐릭터 클릭 → `/settings` 설정 페이지 이동

### 5. `docs/ADR.md`

파일 끝에 ADR-028 추가:

```markdown
## ADR-028: 설정 진입점을 톱니바퀴 sprite에서 곰 캐릭터로 변경 (4-mvp-polish)

- **상태**: Accepted
- **날짜**: 2026-04-29
- **컨텍스트**: 4-mvp-polish step 1에서 추가한 톱니바퀴 이미지(Setting.png)가 방 화면 우상단에 위치하며 설정 진입 역할을 했으나, 시각적으로 곰 캐릭터와 분리되어 화면 위계가 산만해졌다. 곰이 메인 화면의 중심 캐릭터인 만큼, 설정 진입점을 곰에 통합해 인터랙션을 단순화한다.
- **결정**: Setting.png sprite와 해당 hitbox를 제거하고, 곰 sprite(bear)와 동일 좌표에 `aria-label="설정"` hitbox를 추가한다. 기존 `settingsHref` prop과 `/settings` 라우팅은 그대로 유지한다.
- **대안**:
  - 톱니바퀴 유지 + 곰에도 hitbox 추가: 진입점 중복으로 오히려 혼란.
  - BottomNav "설정" 탭만 사용: 탭이 이미 존재하지만 곰 인터랙션 결여로 캐릭터 존재감 약화.
- **결과/제약**:
  - Tab 순서 마지막이 곰(설정) — 키보드 사용자에게 자연스러운 흐름.
  - `bear-idle` 애니메이션이 클릭 어포던스 역할을 겸함 (`hitbox-bob` 미적용).
  - Setting.png day/night 자산 삭제. SPRITE_DEFS에서 `setting` 항목 제거.
  - ADR-025(hitbox 어포던스)의 sprite 매핑 표가 갱신됨.
```

## Acceptance Criteria

```bash
bun build   # 0 에러
bun lint    # 0 에러
bun run test    # 전체 통과
```

## 검증 절차

1. AC 커맨드 순서대로 실행.
2. `bun dev` 후 `/`에서 수동 확인:
   - 곰 캐릭터 클릭 시 `/settings`로 이동
   - 다이어리/책장/캘린더/책 등록 hitbox도 정상 동작 (기존 기능 회귀 없음)
   - Tab 순회: 다이어리 → 책장 → 캘린더 → 책 등록 → 곰(설정) 순서
3. `phases/4-mvp-polish/index.json`의 step 7 상태를 `"completed"`로, `summary`와 `completed_at` 기록.
4. `phases/index.json`의 `4-mvp-polish`를 `"status": "completed"`, `"completed_at"` 기록.
5. 커밋:
   - `feat(4-mvp-polish): step7 — bear-as-settings-entry`
   - `chore(4-mvp-polish): step 7 output`

## 금지사항

- 곰 hitbox에 `hitbox-bob` animClass를 추가하지 마라 — bear sprite는 이미 `bear-idle`이 적용되어 있어 중복.
- SPRITE_DEFS의 `bear` 엔트리를 수정하지 마라 — hitbox와 sprite는 독립적으로 존재.
- `RoomSceneProps`에서 `settingsHref`를 제거하지 마라 — 테스트에서 커스텀 href 주입에 사용됨.
- `docs/ADR.md`의 기존 ADR-001~027을 수정하지 마라 — ADR-028만 추가.