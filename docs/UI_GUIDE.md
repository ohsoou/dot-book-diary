# UI 디자인 가이드

## 디자인 원칙
1. **따뜻한 방의 정서를 해치지 않는다.** 모던 SaaS 대시보드처럼 보이면 실패. 모든 화면이 "도트 방의 연장"이어야 한다.
2. **픽셀은 둥글지 않다.** 모서리는 0px. 테두리는 1px hard. 그림자는 1px hard drop shadow만.
3. **장식보다 기능.** 장식 요소는 방 안의 물건(곰, 램프, 창문)으로만 표현하고, 폼/리스트는 담백하게 둔다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후. 픽셀 아트와 상극 |
| gradient-text / background gradient | AI가 만든 SaaS 랜딩의 1번 특징. 픽셀 고유색을 해친다 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭. 하드 1px 그림자만 허용 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰. 실내 따뜻한 톤과 충돌 |
| 모든 카드에 동일한 `rounded-2xl` | 균일한 둥근 모서리는 템플릿 느낌. 본 프로젝트는 rounded 자체 금지 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| 부드러운 fade/slide (duration 300ms+) | 픽셀 아트는 step easing. transition ≤ 100ms ease-linear |

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 (야간 기본) | `#2a1f17` |
| 페이지 (주간) | `#f4e4c1` |
| 카드 | `#3a2a1a` (야간) / `#ead6b0` (주간) |
| 방 벽지(메인) | `#5c3d28` |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 (야간) | `#f4e4c1` |
| 주 텍스트 (주간) | `#3a2a1a` |
| 본문 | `#d7c199` / `#5a4430` |
| 보조 | `#a08866` / `#8b6f4a` |
| 비활성 | `#6b5540` / `#b8a074` |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 포인트 (램프/CTA) | `#e89b5e` |
| 긍정/성공 | `#7ca972` |
| 부정/에러 | `#c85a54` |
| 중립/기본 | `#8b6f4a` |

## 컴포넌트
### 카드
```
bg-[#3a2a1a] border border-[#1a100a] p-4   /* rounded 금지, shadow-[1px_1px_0_#1a100a] 허용 */
```

### 버튼
```
Primary: border border-[#1a100a] bg-[#e89b5e] text-[#2a1f17] px-3 py-2 hover:bg-[#f0a96c] active:translate-y-px
Text:    text-[#d7c199] hover:text-[#f4e4c1] underline-offset-2 hover:underline
```

### 입력 필드
```
bg-[#2a1f17] border border-[#1a100a] text-[#f4e4c1] px-3 py-2 focus:outline-none focus:border-[#e89b5e]
```

## 레이아웃
- 전체 너비: 페이지에 따라 다름. 메인 도트 방은 고정 `w-[640px] h-[400px]` 아트 기준 `scale` 조정. 리스트/폼 페이지는 `max-w-2xl`.
- 정렬: 좌측 정렬 기본. 메인 방만 중앙 정렬 허용.
- 간격: `gap-3`~`gap-4`, 섹션 간 `space-y-6`.

## 타이포그래피
폰트: `font-family: "Galmuri11", monospace` 전역 기본.
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | `text-2xl text-[#f4e4c1]` (Galmuri11은 가변 weight 없음 — 크기로만 위계) |
| 섹션 제목 | `text-lg text-[#f4e4c1]` |
| 카드 제목 | `text-sm text-[#d7c199]` |
| 본문 | `text-sm text-[#d7c199] leading-relaxed` |
| 보조/메타 | `text-xs text-[#a08866]` |

## 애니메이션
- 곰 idle: 2~4 프레임 호흡, `steps(N)` easing, 2s loop.
- 램프 불빛: 2프레임 깜빡, 4s loop.
- 버튼/링크 트랜지션: `transition-colors duration-100 ease-linear`만 허용.
- 페이지 전환: 기본 Next.js 전환 사용, 커스텀 fade/slide 금지.
- **금지**: duration 150ms 초과의 transition, cubic-bezier easing, blur 애니메이션, translate 장거리 이동.

## 아이콘
- SVG 인라인, 픽셀 그리드(16x16 또는 8x8)에 맞춘 도트 아이콘. strokeWidth 1.
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다.
- Heroicons/Lucide 같은 벡터 아이콘 세트는 사용하지 않는다 — 벡터 곡선이 픽셀 아이덴티티와 충돌.

## 이미지
- 모든 도트 PNG: `image-rendering: pixelated; image-rendering: crisp-edges;` 전역 적용.
- 책 표지(알라딘에서 받은 실제 사진): 1px hard border, 크기 고정(예: `w-24 h-36`), `image-rendering: auto` (사진은 pixelated 적용 제외).
