# Step 5: bear-idle-animation

## 읽어야 할 파일

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` ("애니메이션 규칙", "구현 스펙 (globals.css)")
- `/src/app/globals.css` (step0 결과)
- `/src/components/room/RoomScene.tsx` (step3 결과)

## 작업

곰 idle / 램프 flicker 애니메이션을 실제로 구현한다.

### 1. `src/app/globals.css`

UI_GUIDE §"구현 스펙 (globals.css)"의 코드 그대로 추가:

```css
@keyframes bear-idle {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(1px); }
}
@keyframes lamp-flicker {
  0%, 45%, 55%, 100% { opacity: 1; }
  50%                { opacity: 0.92; }
}

.bear-idle    { animation: bear-idle 2s steps(2) infinite; }
.lamp-flicker { animation: lamp-flicker 4s steps(2) infinite; }
```

- 파일 내 배치: `:focus-visible` 블록 뒤, `prefers-reduced-motion` 블록 앞.
- `prefers-reduced-motion` 블록은 이미 `.bear-idle`, `.lamp-flicker`를 `animation: none` 처리하므로 그대로 유지.

### 2. `RoomScene.tsx` 확인

- 기존 코드에서 `bear-idle`, `lamp-flicker` className이 해당 스프라이트에 적용되고 있다. 이 step에서는 **코드 변경 없음**, CSS만 추가.
- 만약 step3에서 className 적용이 누락되었다면 이 step에서 복구.

### 3. 테스트

- `RoomScene.test.tsx`에 최소 검증 추가:
  - 곰 sprite에 `bear-idle` class가 포함되는지(`reducedMotion=false`).
  - 램프 sprite에 `lamp-flicker` class가 포함되는지.
  - `prefers-reduced-motion` 매칭 시 class가 비어 있는지(기존 테스트 유지).
- `@keyframes` 규칙 자체는 JSDOM이 지원하지 않으므로 CSS 규칙 파싱 테스트는 작성하지 마라. 존재 확인은 `globals.css`의 문자열 포함 여부로 얕게 확인해도 되고, 생략해도 된다.

## Acceptance Criteria

```bash
bun lint
bun test
bun run build
```

## 검증 절차

1. AC 커맨드 통과.
2. 체크리스트:
   - `transform: translateY(1px)` 1px 경계를 초과하지 않는가?
   - `steps(2)` easing을 사용하는가(UI_GUIDE 규칙)?
   - `duration-150` 초과 transition이 없는가?
   - `prefers-reduced-motion` 대응이 유지되는가?
3. `phases/1-mvp/index.json` step 5 업데이트.
4. 커밋 분리.

## 금지사항

- `cubic-bezier`, `ease-in-out` 등 부드러운 easing 사용 금지. 이유: UI_GUIDE.
- `animation-duration < 1s` 사용 금지(깜빡임 강해짐). 이유: 야간 정서 훼손.
- `translateY` 2px 이상 이동 금지. 이유: 레이아웃 시프트 우려.
- JSDOM에서 `@keyframes`를 assert하는 테스트를 작성하지 마라. 이유: 지원 안 됨, 위양성.
- 기존 테스트를 깨뜨리지 마라.