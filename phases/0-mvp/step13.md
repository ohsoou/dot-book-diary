# Step 13: release-hardening

## 읽어야 할 파일

- `/docs/PRD.md` (출시 기준 §14)
- `/docs/ARCHITECTURE.md` (캐싱·재검증, 보안 헤더, 미들웨어)
- `/CLAUDE.md`
- 모든 이전 step 산출물

## 작업

MVP를 출시 가능한 상태로 마감한다. 이 step은 기능 추가보다 검증과 마감 작업이 중심이다.

1. **정적 검증**
   ```bash
   bun run build   # 타입 에러 없음
   bun lint        # ESLint 에러 없음
   bun test        # 전체 테스트 통과
   ```

2. **그렙 게이트 — 0건이어야 한다**
   ```bash
   grep -r "rounded-" src/
   grep -r "backdrop-blur" src/
   grep -r "bg-gradient\|from-\|to-" src/
   grep -r "indigo\|purple" src/
   grep -r "dangerouslySetInnerHTML" src/   # 0건. 다이어리 본문은 텍스트 노드만 사용
   grep -r "SERVICE_ROLE_KEY" src/
   ```

3. **수동 플로우 검증** (체크리스트)
   - 비회원: 책 등록 → 책장 → 세션 기록 → 다이어리 작성 → 캘린더 확인.
   - 회원: 로그인 → 동일 플로우 → 로그아웃.
   - guest→login 후 `localArchived=true` 확인 (DevTools IndexedDB).
   - `/diary/new` 폼에서 30초 대기 → autosave 동작 확인.
   - `/diary/new` 폼 dirty 상태에서 뒤로가기 → `beforeunload` 경고 확인.
   - 알라딘 API 없이 (키 제거) 검색 → 에러 토스트 확인.
   - `/reading/[bookId]` 상단의 책 삭제 → confirm 다이얼로그 → `/bookshelf` 이동 및 목록 제거 확인.

4. **품질 게이트**
   - Lighthouse Performance ≥ 90.
   - Lighthouse Accessibility ≥ 95.
   - `global-error.tsx`가 존재하는가?
   - `middleware.ts` matcher가 `api/books`를 제외하는가?
   - `.env.local`이 커밋되지 않았는가 (`git status` 확인).
   - `SUPABASE_SERVICE_ROLE_KEY`가 코드에 없는가?

5. **보안 / 데이터 정책 최종 확인**
   - **RLS 수동 검증**: 
     - 계정 A로 로그인하여 책을 등록한다.
     - 계정 B로 로그인하여 책장이 비어 있는지 확인한다.
     - 브라우저 개발자 도구의 Network 탭에서 계정 A의 `book_id`를 가로채어 계정 B의 세션으로 수정/삭제 요청을 보냈을 때 `401 Unauthorized` 또는 `404 Not Found`(RLS에 의한 미노출)가 발생하는지 확인한다.
   - 외부 API는 `src/app/api/books/*`에서만 호출.
   - `0001_init.sql`의 RLS/policy 4종 모두 존재.
   - guest data server upload 코드 없음.
   - `NEXT_PUBLIC_FF_SYNC_GUEST_DATA=false` — 코드에서 `false`일 때 업로드 진입 불가.

6. **`phases/0-mvp/index.json` 마감**
   - 모든 step summary 반영.
   - phase 전체를 `"status": "completed"` 마크.

## Acceptance Criteria

```bash
bun run build
bun lint
bun test
```

## 검증 절차

1. 위 AC + 그렙 게이트 + 수동 플로우 모두 통과.
2. PRD §14 출시 기준 9개 항목 체크리스트 확인.
3. 수동 검증 결과를 `phases/0-mvp/index.json`의 summary에 메모.

## 금지사항

- 하드닝 step에서 스코프 외 신규 기능을 끼워 넣지 마라.
- 테스트를 `vi.skip` / `test.skip`으로 꺼서 통과시키지 마라.
- 기존 동작을 검증 없이 단순 리팩터링으로 흔들지 마라.
- `any` 타입 캐스팅으로 빌드 에러를 우회하지 마라.
