# UI 디자인 가이드

## 디자인 원칙
1. **따뜻한 방의 정서를 해치지 않는다.** 모던 SaaS 대시보드처럼 보이면 실패. 모든 화면이 "도트 방의 연장"이어야 한다.
2. **픽셀은 둥글지 않다.** 모서리는 0px. 테두리는 1px hard. 그림자는 1px hard drop shadow만.
3. **장식보다 기능.** 장식 요소는 방 안의 물건(곰, 램프, 창문)으로만 표현하고, 폼/리스트는 담백하게 둔다.
4. **일관성이 완성도.** 색상, 간격, 타이포 모두 이 문서의 토큰만 사용한다. 즉흥적인 값 추가 금지.

---

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` | glass morphism은 AI 템플릿의 가장 흔한 징후. 픽셀 아트와 상극 |
| gradient-text / background gradient | AI가 만든 SaaS 랜딩의 1번 특징. 픽셀 고유색을 해친다 |
| `"Powered by AI"` 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭. 하드 1px 그림자만 허용 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰. 실내 따뜻한 톤과 충돌 |
| 모든 카드에 동일한 `rounded-2xl` | 균일한 둥근 모서리는 템플릿 느낌. 본 프로젝트는 `rounded-*` 자체 금지 |
| 배경 gradient orb (`blur-3xl` 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| 부드러운 fade/slide (duration 300ms+) | 픽셀 아트는 step easing. `transition` ≤ 100ms `ease-linear` |
| Heroicons / Lucide 아이콘 | 벡터 곡선이 픽셀 아이덴티티와 충돌. SVG <rect> 조합 도트 아이콘만 사용 |
| shadcn / Radix UI 컴포넌트 | 외부 UI 라이브러리 전면 금지. 모든 컴포넌트 직접 구현 |

---

## 색상 토큰

### 배경
| 토큰(CSS 변수) | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#2a1f17` | 페이지 기본 (야간) |
| `--color-bg-card` | `#3a2a1a` | 카드 배경 |
| `--color-bg-input` | `#2a1f17` | 입력 필드 배경 |
| `--color-bg-overlay` | `rgba(0,0,0,0.6)` | 모달 오버레이 |
| `--color-wall` | `#5c3d28` | 방 벽지 |

### 테두리
| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-border` | `#1a100a` | 기본 테두리 (dark) |
| `--color-border-focus` | `#e89b5e` | 포커스 링 |
| `--color-border-error` | `#c85a54` | 에러 필드 테두리 |

### 텍스트
| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-text-primary` | `#f4e4c1` | 주 텍스트 |
| `--color-text-body` | `#d7c199` | 본문 |
| `--color-text-secondary` | `#a08866` | 보조/메타 |
| `--color-text-disabled` | `#6b5540` | 비활성 |

### 시맨틱 색상
| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-accent` | `#e89b5e` | 포인트 (램프/CTA) |
| `--color-success` | `#7ca972` | 성공 |
| `--color-error` | `#c85a54` | 에러/위험 |
| `--color-neutral` | `#8b6f4a` | 중립 |

> **규칙**: Tailwind 유틸에서 색상을 쓸 때는 `text-[#f4e4c1]`처럼 하드코드 대신
> CSS 변수로 정의한 뒤 `text-[var(--color-text-primary)]` 방식을 권장한다. 단, 개발
> 초기에는 하드코드 허용하고 리팩터링.

---

## 스페이싱 시스템

4px 기본 그리드를 따른다. Tailwind의 기본 간격 스케일(1 = 4px)을 그대로 사용.

| 용도 | 값 | Tailwind |
|---|---|---|
| 컴포넌트 내부 패딩 (소) | 8px | `p-2` |
| 컴포넌트 내부 패딩 (중) | 12px | `p-3` |
| 컴포넌트 내부 패딩 (대) | 16px | `p-4` |
| 카드 간격 | 12px~16px | `gap-3`, `gap-4` |
| 섹션 간 간격 | 24px | `space-y-6` |
| 페이지 좌우 패딩 | 16px | `px-4` |
| 페이지 상단 패딩 | 24px | `pt-6` |

---

## 반응형 브레이크포인트

| 이름 | 값 | 대상 |
|---|---|---|
| `sm` | 320px | 최소 지원 (iPhone SE) |
| `md` | 768px | 태블릿 |
| `lg` | 1280px | 데스크탑 |

- **모바일 우선**: 기본은 320px 기준으로 작성, `md:` / `lg:` 확장.
- 최대 콘텐츠 너비: `max-w-2xl` (672px). 메인 방 제외.
- **메인 방(RoomScene) 반응형 전략**: 가로모드(landscape) 전용 레터박스.
  - `aspect-ratio: 8/5` + `width: 100%`. 가로로 넓어지면 `max-width: calc((100dvh - 64px) * 1.6)` 까지 비율 유지 확대.
  - 세로로 길어지면 `max-height: calc(100dvh - 64px)` 제한 + `flex items-center`로 아트보드 가운데 정렬. 위아래 여백은 `--color-border`(#1a100a) 레터박스 배경으로 채움.
  - 스프라이트/hitbox: 컨테이너 대비 **백분율(%)** 좌표, `image-rendering: pixelated`로 픽셀 앨리어싱 보존. 64px = 하단 `BottomNav` 높이.

---

## Z-Index 스케일

| 레이어 | 값 | 용도 |
|---|---|---|
| 기본 콘텐츠 | 0 | 카드, 리스트 |
| 스티키 헤더/네비 | 10 | 상단 네비바, 하단 네비바 |
| 드롭다운/툴팁 | 20 | 선택 메뉴 |
| 모달 오버레이 | 30 | 배경 dimmer |
| 모달 컨텐츠 | 40 | 다이얼로그 박스 |
| 토스트 | 50 | 최상위 알림 |
| RoomScene Hitbox | 50 | 방 내 인터랙션 버튼 |

---

## 타이포그래피

폰트: `font-family: "Galmuri11", monospace` 전역 기본.
Galmuri11은 가변 weight 없음 — **크기로만** 위계를 표현한다.

| 용도 | Tailwind 클래스 |
|---|---|
| 페이지 제목 | `text-2xl text-[#f4e4c1]` |
| 섹션 제목 | `text-lg text-[#f4e4c1]` |
| 카드 제목 | `text-sm text-[#d7c199]` |
| 본문 | `text-sm text-[#d7c199] leading-relaxed` |
| 보조/메타 | `text-xs text-[#a08866]` |
| 에러 메시지 | `text-xs text-[#c85a54]` |
| 버튼 라벨 | `text-sm text-[#2a1f17]` (Primary) / `text-[#d7c199]` (Secondary) |

---

## 레이아웃

- 전체 너비: 리스트/폼 페이지는 `max-w-2xl mx-auto`.
- 정렬: 좌측 정렬 기본. 메인 방만 중앙 정렬 허용.
- 페이지 래퍼: `min-h-screen bg-[#2a1f17] px-4 py-6`.

---

## 컴포넌트 사양

### Button

```
Primary:   bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] px-3 py-2
           hover:bg-[#f0a96c] active:translate-y-px
           disabled: opacity-50 cursor-not-allowed

Secondary: bg-transparent border border-[#8b6f4a] text-[#d7c199] px-3 py-2
           hover:border-[#e89b5e] hover:text-[#f4e4c1]
           disabled: opacity-40 cursor-not-allowed

Danger:    bg-transparent border border-[#c85a54] text-[#c85a54] px-3 py-2
           hover:bg-[#c85a54] hover:text-[#f4e4c1]
           disabled: opacity-40 cursor-not-allowed

Text:      text-[#d7c199] hover:text-[#f4e4c1] underline-offset-2 hover:underline
```

- **크기**: 기본 `px-3 py-2`. 소형 `px-2 py-1` (삭제 버튼 등).
- `transition-colors duration-100 ease-linear` 적용.
- `rounded-*` 금지.
- `pending` 상태: 텍스트 변경 ("저장 중...") + `disabled`.

### BottomNav (Global)

```
위치: fixed bottom-0 inset-x-0 h-[64px] z-10
배경: bg-[#3a2a1a] border-t border-[#1a100a] grid-cols-5
아이템: flex flex-col items-center justify-center gap-1 text-xs
Active: text-[var(--color-accent)]
Inactive: text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
```

### PixelFrame

```tsx
<div className="outline outline-1 outline-[#1a100a] outline-offset-2">
  {children}
</div>
```

### ToggleTabs

```
테두리: border border-[#1a100a] flex
버튼: flex-1 px-3 py-2 text-sm
Selected: bg-[#e89b5e] text-[#2a1f17]
Unselected: bg-transparent text-[#d7c199] hover:text-[#f4e4c1]
```

### Card

```
bg-[#3a2a1a] border border-[#1a100a] p-4 shadow-[1px_1px_0_#1a100a]
```

- `rounded-*` 금지.
- 중첩 카드는 가능하면 피할 것.

### 입력 필드

```
bg-[#2a1f17] border border-[#1a100a] text-[#f4e4c1] px-3 py-2
focus:outline-none focus:border-[#e89b5e]
placeholder:text-[#6b5540]
```

에러 상태:
```
border-[#c85a54] focus:border-[#c85a54]
```

- `textarea`: 위와 동일 + `resize-y min-h-[80px]`.
- `select`: 위와 동일 + `appearance-none`.

### FieldError

```tsx
// 각 입력 아래에 인라인 노출
<p className="mt-1 text-xs text-[#c85a54]" role="alert">{message}</p>
```

- `role="alert"` 필수 (스크린 리더 즉시 읽기).
- 빈 문자열일 때는 렌더하지 않는다 (`message && <FieldError>`).

### Toast

```
위치: 우상단 고정. z-50.
배경: bg-[#3a2a1a] border border-[#1a100a] shadow-[1px_1px_0_#1a100a]
텍스트: text-sm text-[#d7c199]
아이콘: 성공 = #7ca972, 에러 = #c85a54 (1px 도트 아이콘)
표시 시간: 3000ms 자동 dismiss
애니메이션: 없음 (금지)
최대 동시 노출: 3개. 초과 시 가장 오래된 것 dismiss.
```

- `aria-live="polite"` 래퍼 필수.
- 에러 토스트는 `aria-live="assertive"`.
- 수동 dismiss 버튼(`×`) 제공.

### ConfirmDialog / Modal

```
오버레이: fixed inset-0 bg-black/60 z-30
컨텐츠:   bg-[#3a2a1a] border border-[#1a100a] p-6 max-w-sm w-full z-40
          shadow-[2px_2px_0_#1a100a]
위치:     화면 중앙 (fixed + transform -50%)
```

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` 필수.
- ESC 키로 닫기 (비파괴적 action만 — confirm은 ESC 시 취소).
- 포커스 트랩: 모달 열릴 때 첫 버튼으로 포커스 이동, 닫힐 때 트리거 버튼으로 복귀.
- confirm 버튼은 Danger 스타일, 취소 버튼은 Secondary.

### EmptyState

```tsx
<div className="flex flex-col items-center gap-4 py-16 text-center">
  {/* 도트 아이콘 (16x16) */}
  <p className="text-sm text-[#a08866]">{message}</p>
  {cta && <Button variant="primary">{cta.label}</Button>}
</div>
```

- 각 화면별 카피는 `docs/PRD.md` §8 빈 상태 카피 테이블 참조.
- gradient/blur 배경 금지.

### Skeleton

```
bg-[#3a2a1a] animate-pulse
```

- `animate-pulse`는 Tailwind 기본. `prefers-reduced-motion` 시 정지.
- 실제 콘텐츠와 동일한 크기·위치로 배치.
- 모양: 텍스트 라인(`h-4 w-3/4`), 카드(`h-32 w-full`), 표지(`h-36 w-24`).

### GuestBanner

```
bg-[#3a2a1a] border border-[#8b6f4a] px-4 py-3
텍스트: text-sm text-[#d7c199]
닫기 버튼: text-[#a08866] hover:text-[#f4e4c1]
```

- 카피: "이 방은 당신의 거예요. 로그인하면 어떤 기기에서도 책장을 꺼낼 수 있어요."
- `guestBannerDismissed=true`이면 렌더하지 않는다.
- 닫기 시 `updatePreferences({ guestBannerDismissed: true })`.

### UnsupportedEnvScreen

```
전체 화면 (min-h-screen) bg-[#2a1f17]
중앙 정렬, text-sm text-[#a08866]
메시지: "이 브라우저에서는 일부 기능이 지원되지 않아요."
```

- IndexedDB / `crypto.randomUUID` / `getUserMedia` 미지원 감지 시 노출.
- 로그인해서 서버 저장으로 우회하도록 로그인 버튼 제공.

---

## 포커스 스타일

모든 대화형 요소(button, a, input, textarea, select)에 적용:

```css
:focus-visible {
  outline: 1px dashed #e89b5e;
  outline-offset: 2px;
}
```

- `outline: none` + `focus:ring-*` Tailwind 조합 사용 금지 — 링이 둥글다.
- `:focus`(마우스) 대신 `:focus-visible`(키보드)만 스타일 적용.

---

## 애니메이션 규칙

- 곰 idle: 2~4 프레임 호흡, `steps(N)` easing, 2s loop.
- 램프 불빛: 2프레임 깜빡, 4s loop.
- 버튼/링크 트랜지션: `transition-colors duration-100 ease-linear`만 허용.
- 페이지 전환: 기본 Next.js 전환 사용, 커스텀 fade/slide 금지.

**금지**:
- `duration-150` 초과 transition
- `cubic-bezier` easing
- blur 애니메이션
- translate 장거리 이동 (버튼 `active:translate-y-px` 1px은 허용)

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .bear-idle,
  .lamp-flicker {
    animation: none;
  }
  * {
    transition-duration: 0.01ms !important;
  }
}
```

---

## 아이콘

- SVG 인라인, 픽셀 그리드(16×16)에 맞춘 도트 아이콘.
- **SVG `<rect>` 요소의 조합**으로 픽셀을 직접 그려 구현한다. `shape-rendering="crispEdges"` 필수.
- Heroicons / Lucide 같은 벡터 아이콘 세트 사용 전면 금지 — 벡터 곡선은 픽셀 아이덴티티와 충돌한다.
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다.
- 아이콘에는 `aria-hidden="true"` + 주변 텍스트 또는 `aria-label` 제공.

---

## 이미지

- 모든 도트 PNG: `image-rendering: pixelated; image-rendering: crisp-edges;` 전역 적용.
- 책 표지(알라딘에서 받은 실제 사진): `image-rendering: auto`, `border border-[#1a100a]`, 크기 고정(`w-24 h-36`).
- `next/image` `<Image>` 컴포넌트 사용. `alt` 필수.
- 표지 로드 실패 시 제목 이니셜 텍스트 플레이스홀더(배경 `#3a2a1a`, 텍스트 `#a08866`).

---

## 카피 톤 & 보이스

독자에게 따뜻하게 말을 건다. 기능 설명보다 정서적 공감을 우선.

| 좋음 | 나쁨 |
|---|---|
| "아직 읽은 책이 없어요" | "데이터가 없습니다" |
| "이 방은 당신의 거예요" | "로컬 저장 모드입니다" |
| "오늘은 몇 페이지 읽었나요?" | "독서 세션을 추가하세요" |
| "삭제하면 되돌릴 수 없어요" | "삭제 확인" |
| "저장했어요" | "저장 완료" |

- 물음표는 적절히 사용한다. 경고/오류 메시지에는 쓰지 않는다.
- 버튼 라벨: 동사형 짧게. "추가", "저장", "삭제", "닫기".
- 에러 메시지: 원인 + 다음 행동 제안. "네트워크 오류가 생겼어요. 잠시 후 다시 시도해 주세요."
