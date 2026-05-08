# Step 2: home-guide-overlay

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/PRD.md` — §8.1 첫 방문 온보딩(step 0에서 갱신됨), §8.3 카피 톤
- `docs/UI_GUIDE.md` — §HomeGuide 컴포넌트 사양(step 0에서 추가됨), §Z-Index, §Modal
- `docs/ADR.md` — ADR-032(step 0에서 추가됨)
- `docs/ARCHITECTURE.md` — §2 디렉토리 구조, §8.1 혼합 렌더링 패턴
- `CLAUDE.md` — CRITICAL 규칙 3가지, 임포트 경로
- `src/types/index.ts` — `GuestPreferences` 타입 (현재)
- `src/lib/storage/preferences.ts` — `getPreferences`, `updatePreferences` API
- `src/components/ui/GuestBanner.tsx` — dismissal 패턴 템플릿
- `src/components/ui/Modal.tsx` — 기반 모달 컴포넌트
- `src/components/room/RoomScene.tsx` — `HITBOX_DEFS` 라벨 5개 (진실원)
- `src/app/page.tsx` — 현재 홈 페이지 구조 (마운트 위치 파악)
- `src/app/page.test.tsx` — 기존 테스트 (회귀 방지용 참조)

이전 step에서 생성/수정된 파일:
- `docs/PRD.md`, `docs/UI_GUIDE.md`, `docs/ADR.md` (step 0)
- `src/app/bookshelf/page.tsx`, `src/app/bookshelf/page.test.tsx` (step 1)

## 배경

홈 화면의 5개 hitbox는 `hitbox-bob` 모션으로 클릭 어포던스를 제공하지만, 첫 방문자가 "어떤 도트 물체를 누르면 어디로 이동하는지" 알기 어렵다. 이 step은 첫 방문 시 1회만 노출되는 전체 모달 가이드를 추가한다.

**핵심 설계**:
- `GuestBanner`의 dismissal 패턴(`useEffect → getPreferences → setState → null fallback`)을 그대로 적용.
- 기존 `Modal` 컴포넌트를 활용해 신규 모달 코드를 최소화.
- `HITBOX_DEFS` 라벨 5개와 1:1 동기화 (테스트로 검증).
- `homeGuideDismissed`는 IndexedDB(`dbd:preferences`)에만 저장. 서버 미전송.

## 작업

### 1. `src/types/index.ts` — `GuestPreferences` 타입 수정

`homeGuideDismissed?: boolean;` 1줄 추가:

```ts
export type GuestPreferences = {
  nickname?: string;
  localArchived?: boolean;
  guestBannerDismissed?: boolean;
  homeGuideDismissed?: boolean;  // 추가
  themePreference?: 'system' | 'day' | 'night';
};
```

### 2. `src/components/onboarding/HomeGuide.tsx` 신규 작성

```ts
'use client'

// 시그니처: export function HomeGuide(): React.JSX.Element | null
```

**상태 관리** (GuestBanner와 동일 패턴):
```ts
const [dismissed, setDismissed] = useState<boolean | null>(null)

useEffect(() => {
  getPreferences().then((prefs) => {
    setDismissed(prefs.homeGuideDismissed ?? false)
  })
}, [])

// null(로딩 중) 또는 true(이미 dismissed) → null 반환
if (dismissed !== false) return null
```

**닫기 핸들러**:
```ts
async function handleDismiss() {
  setDismissed(true)
  await updatePreferences({ homeGuideDismissed: true })
}
```

**렌더 구조** (`Modal` 컴포넌트 활용):
- `Modal` prop으로 `isOpen={true}` + `onClose={handleDismiss}` 전달 (Modal의 ESC 닫기 자동 처리).
- 모달 제목: "이 방의 도트들을 눌러보세요"
- 5행 리스트 (UI_GUIDE §HomeGuide 사양 참조):
  ```
  [핀] 다이어리   왼쪽 노트를 누르면 일기로 가요
  [핀] 책장       벽 선반을 누르면 책장으로 가요
  [핀] 캘린더     창문을 누르면 책 캘린더로 가요
  [핀] 책 등록    책더미를 누르면 책을 등록할 수 있어요
  [핀] 설정       곰을 누르면 설정으로 가요
  ```
  핀: `inline-block w-2 h-2 bg-[#e89b5e] border border-[#1a100a] mr-2`
  라벨: `text-sm text-[#f4e4c1]`
  안내: `text-xs text-[#a08866] ml-4`
- 닫기 버튼 1개: Primary 스타일, 텍스트 "방을 둘러볼게요", `onClick={handleDismiss}`

**접근성**: Modal 컴포넌트가 `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, ESC 닫기를 이미 처리하므로 추가 구현 불필요. `Modal`의 `title` prop에 "이 방의 도트들을 눌러보세요" 전달.

**라벨 동기화**: `HITBOX_DEFS`를 직접 import하면 server-only 경계 위반 없이 client에서 사용 가능하나, RoomScene 내부 상수가 export되지 않는 경우 정적 배열로 복사한다. 아래 안내문은 정적 배열 사용:

```ts
const GUIDE_ITEMS = [
  { label: '다이어리', desc: '왼쪽 노트를 누르면 일기로 가요' },
  { label: '책장',    desc: '벽 선반을 누르면 책장으로 가요' },
  { label: '캘린더',  desc: '창문을 누르면 책 캘린더로 가요' },
  { label: '책 등록', desc: '책더미를 누르면 책을 등록할 수 있어요' },
  { label: '설정',    desc: '곰을 누르면 설정으로 가요' },
] as const
```

### 3. `src/app/page.tsx` 수정

`<HomeGuide />`를 `<BearStateProvider>` 내부에 추가한다. `<GuestBanner />` 바로 다음 줄 (또는 같은 flex 컨테이너 안).

회원/비회원 분기 공통으로 마운트한다 (HomeGuide가 내부에서 preferences를 읽어 분기하므로 외부에서 분기 불필요).

```tsx
import { HomeGuide } from '@/components/onboarding/HomeGuide'

// <BearStateProvider> 내부
<div className="flex flex-col items-stretch justify-center">
  {isGuest && <GuestBanner />}
  <HomeGuide />          {/* ← 추가 */}
  <BearSpeechBubble />
</div>
```

### 4. `src/components/onboarding/HomeGuide.test.tsx` 신규 작성

`src/components/ui/GuestBanner.test.tsx` 패턴을 따른다.

**모킹**:
```ts
vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))
```

**케이스 (최소 4개)**:

1. dismissed=false → 모달 렌더, 5개 라벨 모두 표시
   ```ts
   mockGetPreferences.mockResolvedValue({ homeGuideDismissed: false })
   render(<HomeGuide />)
   await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
   expect(screen.getByText('다이어리')).toBeInTheDocument()
   expect(screen.getByText('책장')).toBeInTheDocument()
   // ... 5개 모두
   ```

2. 닫기 클릭 → `updatePreferences({ homeGuideDismissed: true })` 호출 + 모달 unmount
   ```ts
   await user.click(screen.getByRole('button', { name: '방을 둘러볼게요' }))
   expect(mockUpdatePreferences).toHaveBeenCalledWith({ homeGuideDismissed: true })
   await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
   ```

3. dismissed=true → 렌더되지 않음
   ```ts
   mockGetPreferences.mockResolvedValue({ homeGuideDismissed: true })
   render(<HomeGuide />)
   await waitFor(() => {/* 비동기 안정화 */})
   expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
   ```

4. 라벨-안내 동기화 검증: `GUIDE_ITEMS`의 label 5개가 화면에 모두 렌더됨 + HITBOX_DEFS 순서와 일치
   (정적 배열 사용 시: `GUIDE_ITEMS.map(item => item.label)`으로 검증)

### 5. `src/app/page.test.tsx` 회귀 방지

`getPreferences` 모킹에 `homeGuideDismissed: true`를 추가하여 기존 RoomScene/hitbox 테스트가 모달 presence에 영향받지 않도록 한다:

```ts
vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({
    guestBannerDismissed: true,
    homeGuideDismissed: true,  // 추가
  }),
  updatePreferences: vi.fn(),
}))
```

기존 테스트 파일에서 이 모킹이 없다면 추가한다. 이미 있다면 `homeGuideDismissed: true` 1줄만 추가.

## Acceptance Criteria

```bash
bun run build && bun lint && bun run test
```

- `HomeGuide.test.tsx` 4건 이상 통과
- `page.test.tsx` 기존 케이스 회귀 없음
- 전체 테스트 스위트 통과

## 검증 절차

1. AC 커맨드 실행.
2. 수동 검증 (`bun dev`):
   - 시크릿창에서 `http://localhost:3000` 진입 → 가이드 모달이 즉시 열림 → 5개 항목 확인 → "방을 둘러볼게요" 클릭 → 모달 닫힘 → 새로고침 → 모달 재표시 없음.
   - ESC 키 → 모달 닫힘 → 새로고침 → 모달 재표시 없음 (ESC도 dismiss 처리).
   - 회원 로그인 후 동일 검증 (회원도 1회 노출).
3. UI_GUIDE 금지 패턴 grep:
   ```bash
   rg -n "rounded-|backdrop-blur|bg-gradient|indigo|purple" src/components/onboarding/
   ```
   0건이어야 함.
4. 결과에 따라 `phases/13-onboarding-and-bookshelf-cta/index.json`의 step 2 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "HomeGuide 모달 컴포넌트 + GuestPreferences 타입 확장 + page.tsx 마운트 + 테스트 4건"`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
5. 커밋:
   - `feat(13-onboarding-and-bookshelf-cta): step 2 — home-guide-overlay`
   - `chore(13-onboarding-and-bookshelf-cta): step 2 output`
6. phase 전체 완료 시 `phases/index.json`의 `13-onboarding-and-bookshelf-cta` status를 `"completed"`로 업데이트.

## 금지사항

- `homeGuideDismissed`를 Supabase `profiles` 테이블에 저장하지 마라. 이유: CLAUDE.md CRITICAL — 비회원 데이터는 서버로 전송하지 않는다. 회원도 기기별 독립 1회 노출이 정책 의도이며 Supabase에 컬럼을 추가하면 RLS 정책 확장·마이그레이션이 필요해져 scope 초과다.
- `Modal.tsx`를 수정하지 마라. 이유: 기존 컴포넌트를 그대로 재사용하는 것이 이 step의 원칙이다.
- `RoomScene.tsx`를 수정하지 마라. 이유: HITBOX_DEFS는 진실원이며 이 step의 범위 밖이다.
- z-index를 임의로 올리지 마라. 이유: backdrop=30, content=40이 표준이며 hitbox=50보다 낮아야 가이드 모달 위에서 hitbox가 차단되는 기획대로 동작한다.
- `rounded-*`, `backdrop-blur`, `gradient`, box-shadow glow 사용 금지 (UI_GUIDE §AI 슬롭 안티패턴).
- 기존 테스트를 깨뜨리지 마라.
