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

### 낮 테마 팔레트 (`[data-theme="day"]`, MVP1)

야간 토큰과 동일 키를 오버라이드한다. `<html data-theme="day">` 상태에서만 적용. 신규 컴포넌트는 반드시 CSS 변수를 통해 색을 읽는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#f4e3c1` | 페이지 기본 (주간 크림) |
| `--color-bg-card` | `#e8d0a3` | 카드 배경 |
| `--color-bg-input` | `#f4e3c1` | 입력 필드 배경 |
| `--color-bg-overlay` | `rgba(0,0,0,0.4)` | 모달 오버레이 |
| `--color-wall` | `#d4a574` | 방 벽지 (주간 나무결) |
| `--color-border` | `#5c3d28` | 기본 테두리 |
| `--color-border-focus` | `#c25e1d` | 포커스 링 |
| `--color-border-error` | `#a63d38` | 에러 필드 테두리 |
| `--color-text-primary` | `#2a1f17` | 주 텍스트 |
| `--color-text-body` | `#4a3828` | 본문 |
| `--color-text-secondary` | `#6b5540` | 보조/메타 |
| `--color-text-disabled` | `#a08866` | 비활성 |
| `--color-accent` | `#c25e1d` | 포인트 (CTA) |
| `--color-success` | `#4a7a3f` | 성공 |
| `--color-error` | `#a63d38` | 에러/위험 |
| `--color-neutral` | `#8b6f4a` | 중립 |

- 전환 애니메이션 없음(즉시 스왑). `transition: background-color` 전역 추가 금지.
- 테마가 바뀌어도 버튼/카드/입력 등 컴포넌트의 className은 동일해야 한다(변수만 교체).
- 기존 하드코드 `text-[#d7c199]` 류는 MVP1 범위에서 점진적 치환. 신규 코드는 `text-[var(--color-text-body)]` 필수.

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

> 컴포넌트 사양 세부: `docs/details/ui-components.md`