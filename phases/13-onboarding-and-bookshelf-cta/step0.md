# Step 0: docs-and-policy

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/PRD.md` — §8.1 첫 방문 온보딩 단락("튜토리얼 툴팁 없음" 부분) 확인
- `docs/UI_GUIDE.md` — §컴포넌트 사양, §Z-Index 스케일, §카피 톤 확인
- `docs/ADR.md` — 마지막 ADR 번호 확인 (현재 ADR-031)
- `CLAUDE.md` — CRITICAL 3가지 규칙 숙지

## 배경

현행 PRD §8.1은 "튜토리얼 툴팁 없음(원칙 1: 정서 우선, 과도한 가이드 금지)"을 명시한다. 이번 phase는 홈 화면의 5개 hitbox 진입점에 한해 첫 방문 시 1회 모달 가이드를 추가하는 결정으로, 기존 정책을 변경한다.

이 step은 코드를 전혀 건드리지 않고 정책 문서만 갱신한다. execute.py는 이후 step의 가드레일 프롬프트에 `docs/*.md`를 주입하므로, 코드 step이 시작되기 전에 정책을 정렬해야 한다.

## 작업

### 1. `docs/PRD.md` §8.1 갱신

`§8.1 첫 방문 온보딩` 섹션을 아래 내용으로 교체한다:

**현재:**
```
- 방문 시 방 상단에 배너 1회:
  - 카피: "이 방은 당신의 거예요. 책을 담고 문장을 남겨 보세요. 로그인하면 어디서든 이어갈 수 있어요."
  - 닫기 버튼 → `dbd:preferences.guestBannerDismissed = true`.
- 튜토리얼 툴팁 없음(원칙 1: 정서 우선, 과도한 가이드 금지).
```

**변경 후:**
```
- 방문 시 방 상단에 배너 1회 (GuestBanner):
  - 비회원에게만 노출.
  - 카피: "이 방은 당신의 거예요. 로그인하면 어떤 기기에서도 책장을 꺼낼 수 있어요."
  - 닫기 버튼 → `dbd:preferences.guestBannerDismissed = true`.
- 홈 hitbox 진입점 안내 모달 1회 (HomeGuide):
  - 회원·비회원 모두에게 최초 방문 시 1회 노출.
  - 5개 hitbox(다이어리/책장/캘린더/책 등록/설정)의 이름과 이동 경로를 리스트로 안내.
  - 닫기 버튼("방을 둘러볼게요") → `dbd:preferences.homeGuideDismissed = true`.
  - IndexedDB에만 저장. 서버 전송 없음. 기기별 독립 1회 노출.
- 그 외 일반 툴팁, 코치마크, 추가 온보딩 단계는 여전히 금지(원칙 1 유지).
```

### 2. `docs/UI_GUIDE.md` §컴포넌트 사양에 `HomeGuide` 섹션 추가

`### GuestBanner` 섹션 바로 다음에 아래를 추가한다:

```
### HomeGuide

홈 화면 5개 hitbox 진입점을 첫 방문 시 1회 안내하는 모달. `dbd:preferences.homeGuideDismissed`가 false일 때만 노출.

```
오버레이: fixed inset-0 bg-black/60 z-30
컨텐츠:   bg-[#3a2a1a] border border-[#1a100a] p-6 max-w-sm w-full z-40
          shadow-[2px_2px_0_#1a100a]
위치:     화면 중앙 (fixed + transform -50%)
```

리스트 항목 (5개):
- 핀: 8×8px `bg-[#e89b5e] border border-[#1a100a]` 인라인 블록
- 라벨: `text-sm text-[#f4e4c1]`
- 안내: `text-xs text-[#a08866]`

닫기 버튼: Primary 스타일, 카피 "방을 둘러볼게요"

금지:
- `rounded-*` 금지
- `backdrop-blur` 금지
- `gradient` 금지
- box-shadow glow 금지
```

### 3. `docs/ADR.md` 끝에 ADR-032 추가

```
## ADR-032: 홈 hitbox 진입점 1회 온보딩 모달 도입

- **상태**: Accepted
- **날짜**: 2026-05-08
- **컨텍스트**: 홈 화면의 5개 hitbox(다이어리/책장/캘린더/책 등록/설정)는 시각적 어포던스(`hitbox-bob` 모션)만 있어 첫 방문자가 어디로 이동하는지 직관적으로 알기 어렵다. PRD §8.1은 "튜토리얼 툴팁 없음"을 원칙으로 정했으나, 이는 과도한 코치마크 남용을 막기 위한 규정이었지 최소한의 진입점 안내까지 금지한 의도는 아니었다.
- **결정**: 5개 hitbox 진입점에 한해, 첫 방문 시 1회 전체 모달(`HomeGuide`)로 안내한다. 닫힌 이후 `dbd:preferences.homeGuideDismissed=true`로 IndexedDB에 저장하여 재노출하지 않는다. 회원·비회원 모두 동일 IndexedDB 키로 통제한다(기기별 독립 1회 노출).
- **역할 분리**:
  - `GuestBanner`: 비회원 대상 정서 메시지("이 방은 당신의 거예요") + 로그인 유도.
  - `HomeGuide`: 회원·비회원 공통, 기능 진입점(hitbox → 경로) 안내.
- **대안**:
  - 핀포인트 오버레이(hitbox 위에 직접 라벨): RoomScene 좌표와 실시간 동기화 비용↑, 반응형에서 좌표 어긋남 위험.
  - 코치마크(순서대로 하나씩 강조): 구현 복잡도↑, 픽셀 정서 훼손.
  - 상시 노출 도움말 버튼: 핵심 원칙(정서가 기능보다 먼저)과 충돌.
- **결과/제약**:
  - `GuestPreferences` 타입에 `homeGuideDismissed?: boolean` 1필드 추가.
  - IndexedDB(`dbd:preferences`)에서만 관리. RLS·Supabase와 무관.
  - 비회원이 로그인해도 이미 dismissed면 재노출하지 않음(기기별 경험 독립, v1.1 동기화 범위 외).
  - PRD §8.1의 "그 외 툴팁/코치마크 금지" 원칙은 유지한다.
```

## Acceptance Criteria

```bash
bun run build && bun lint
```

(테스트 없음. 문서 변경만이므로 빌드·린트 통과 확인으로 충분.)

## 검증 절차

1. AC 커맨드 실행.
2. `docs/PRD.md` §8.1 단락에 "튜토리얼 툴팁 없음" 문장이 사라지고 HomeGuide 정책이 기술됐는지 확인.
3. `docs/UI_GUIDE.md`에 `### HomeGuide` 섹션이 추가됐는지 확인.
4. `docs/ADR.md` 마지막에 `ADR-032` 항목이 추가됐는지 확인.
5. 결과에 따라 `phases/13-onboarding-and-bookshelf-cta/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "PRD §8.1·UI_GUIDE HomeGuide 섹션·ADR-032 추가 완료"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
6. 커밋:
   - `docs(13-onboarding-and-bookshelf-cta): step 0 — docs-and-policy`
   - `chore(13-onboarding-and-bookshelf-cta): step 0 output`

## 금지사항

- 코드 파일(`.ts`, `.tsx`, `.js`, `.json` in `src/`)을 수정하지 마라. 이유: 이 step은 정책 합의용이며, 코드 가정이 phase 전체에 전파되지 않도록 격리한다.
- `phases/` 디렉토리의 step 파일(`step1.md`, `step2.md`)을 수정하지 마라. 이유: 이미 확정된 설계이며 step 0 작업 범위 밖이다.
