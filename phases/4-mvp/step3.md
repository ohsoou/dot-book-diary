# Step 3: hitbox-affordance

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `docs/ADR.md` (ADR-025 hitbox 클릭 어포던스 결정, ADR-011 접근성)
- `docs/UI_GUIDE.md` (§포커스 스타일, §AI 슬롭 안티패턴, §RoomScene Hitbox 어포던스)
- `src/components/room/RoomScene.tsx` — `HITBOX_DEFS`, hitbox `<button>` 렌더 블록 (현재 `className="absolute bg-transparent"`)
- `src/components/room/RoomScene.test.tsx` — 기존 테스트 패턴

## 배경

현재 RoomScene의 5개 hitbox 버튼은 `bg-transparent`로 완전히 투명하다.
모바일에서는 hover가 없어 어디를 눌러야 할지 알 수 없다.

확정된 디자인:
- **항상 보이는 1px dashed outline** + **우상단 8×8px 인디케이터 점**
- 데스크탑/모바일 동일
- outline: `outline-[#e89b5e]/60` (60% alpha). hover/focus-visible 시 alpha 강조
- 인디케이터 점: `bg-[#e89b5e]`, `border border-[#1a100a]`, `aria-hidden="true"`

## 작업

### 1. `src/components/room/RoomScene.tsx` hitbox 버튼 수정

`HITBOX_DEFS.map(...)` 블록의 각 `<button>`을 아래와 같이 변경한다:

```tsx
<button
  key={def.label}
  aria-label={def.label}
  onClick={() => router.push(hrefMap[def.hrefKey] as never)}
  className="absolute bg-transparent outline outline-1 outline-dashed outline-[#e89b5e]/60 hover:outline-[#e89b5e] focus-visible:outline-[#e89b5e] transition-[outline-color] duration-100 ease-linear"
  style={{ zIndex: 50, ...def.style }}
>
  {/* 우상단 인디케이터 점 */}
  <span
    aria-hidden="true"
    className="absolute top-1 right-1 w-2 h-2 bg-[#e89b5e] border border-[#1a100a]"
  />
</button>
```

핵심 규칙:
- `outline-dashed` — dashed 스타일 (solid 금지, 인게임 느낌)
- `outline-[#e89b5e]/60` — 평상시 60% alpha, hover/focus-visible 에서 100%
- `transition-[outline-color] duration-100 ease-linear` — ≤100ms
- 인디케이터 점: `w-2 h-2`(8px), `bg-[#e89b5e]`, `border border-[#1a100a]`(1px hard)
- `aria-hidden="true"` — 스크린리더는 이미 `aria-label`로 인식

> 램프 전원 버튼(`theme === 'night'` 조건부 렌더)은 별도 시각 요소가 있으므로 어포던스 적용에서 제외한다.
> 곰 hitbox 5개(다이어리/책장/캘린더/책 등록/설정)에만 적용.

### 2. `src/components/room/RoomScene.test.tsx` 업데이트

기존 테스트 전부 유지하면서 다음 케이스 추가:

- 5개 hitbox 버튼 각각에 `outline` 관련 클래스가 존재하는지 확인
  (`button.className.includes('outline-dashed')` 또는 `toHaveClass`)
- 각 버튼 안에 `aria-hidden="true"` 요소(인디케이터 점)가 존재하는지 확인

## Acceptance Criteria

```bash
bun test src/components/room/RoomScene.test.tsx
bun build
bun lint
```

에러 없음. 기존 케이스 전부 통과 + 신규 affordance 케이스 통과.

```bash
grep -rE 'rounded-|backdrop-blur|gradient|glow' src/components/room/RoomScene.tsx
```
→ 빈 결과.

## 검증 절차

1. 위 AC 커맨드 실행.
2. 시각 검수: `bun dev` → `localhost:3000`
   - 5개 hitbox에 dashed outline 가시 확인
   - 우상단 주황 점 가시 확인
   - 데스크탑: hover 시 outline alpha 강조 확인
   - 모바일(DevTools 375×667): outline + 점이 터치 전에도 보이는지 확인
   - 키보드 Tab으로 이동 시 `focus-visible` outline 강조 확인
3. `phases/4-mvp/index.json` step 3 업데이트.
4. 코드 커밋: `feat(4-mvp): step3 — hitbox-affordance`
5. 메타 커밋: `chore(4-mvp): step3 output`

## 금지사항

- `rounded-*`, `backdrop-blur`, glow/blur shadow 사용 금지.
- `transition duration-150` 초과 금지. 이유: UI_GUIDE 애니메이션 규칙 ≤100ms.
- hitbox 좌표(`HITBOX_DEFS` style 값) 변경 금지. 이유: 이미 sprite 픽셀과 정렬되어 있음.
- 램프 전원 버튼에 어포던스 추가 금지. 이유: 해당 버튼은 Table_Lamp 스프라이트가 시각 단서.
