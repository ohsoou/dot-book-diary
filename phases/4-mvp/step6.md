# Step 6: release-hardening-mvp4

## 읽어야 할 파일

- `docs/PRD.md` §14 출시 기준
- `phases/4-mvp/index.json` — step 0~5 summary 확인
- `phases/4-mvp/step{0..5}.md` — 각 step의 AC 커맨드와 금지사항 재확인

## 배경

step 0~5가 완료됐다. 이 step에서는 전 영역을 종합 검증하여 릴리스 기준을 충족하는지 확인한다.
코드 수정이 필요하다면 **최소한의 수정**만 하고, 그 이유를 step output에 기록한다.

## 작업

### 1. 빌드·린트·테스트

```bash
bun build
```
0 에러 확인.

```bash
bun lint
```
0 에러 확인.

```bash
bun test
```
전체 통과 확인. 실패한 테스트가 있다면 수정한다.

### 2. 금지 패턴 grep

```bash
grep -rE '(rounded-|backdrop-blur|gradient|indigo-|purple-)' src/components/room/ src/components/diary/
```
→ **빈 결과** 확인. 결과가 있으면 해당 코드 수정.

```bash
grep -rn 'BearStatusBar' src/
```
→ **빈 결과** 확인. 남아있는 참조가 있으면 제거.

### 3. 아키텍처 체크리스트

- [ ] `src/lib/nickname.ts` 존재, `getDisplayNickname()` export 확인
- [ ] `BearStateContextValue.nickname: string` 확인
- [ ] `BearSpeechBubble.tsx` 존재, `role="status"` 확인
- [ ] `BearStatusBar.tsx`, `BearStatusBar.test.tsx` 삭제됨 확인
- [ ] RoomScene hitbox 5개에 `outline-dashed` 클래스 존재 확인
- [ ] `BookPicker.tsx` 존재 확인
- [ ] `DiaryList` props에 `books?: Book[]` 있음 확인
- [ ] `BookGrid`에 "일기 쓰기" 링크 존재 확인
- [ ] `phases/4-mvp/step{0..5}.md`의 AC가 모두 통과됐는가

### 4. CLAUDE.md CRITICAL 준수 확인

- 외부 API(알라딘) 호출이 `src/app/api/` 라우트 핸들러에서만 이루어지는가?
- 새로 추가된 모든 Supabase 접근에 RLS가 유지되는가? (BookPicker 등 신규 쿼리 없음 확인)
- 비회원 데이터가 서버로 전송되지 않는가?

### 5. `phases/4-mvp/index.json` 완료 처리

모든 step이 `"status": "completed"`인지 확인 후,
index.json에 phase 완료 기록:
```json
{
  ...
  "completed_at": "<현재 ISO 시각>"
}
```

`phases/index.json`의 `4-mvp` 항목 상태도 `"completed"`로 업데이트.

## Acceptance Criteria

```bash
bun build && bun lint && bun test
```
0 에러, 전체 통과.

```bash
grep -rE '(rounded-|backdrop-blur|gradient|indigo-|purple-)' src/components/room/ src/components/diary/
```
빈 결과.

```bash
grep -rn 'BearStatusBar' src/
```
빈 결과.

## 검증 절차

1. 위 AC 커맨드 전부 실행.
2. 선택적 시각 검수 (`bun dev`):
   - `/`에서 곰 말풍선 렌더, 닉네임/상태 표시 확인
   - hitbox 5개 dashed outline + 점 가시 확인
   - 책장 → "일기 쓰기" → 폼 → picker에 책 선택됨 확인
   - 저장 후 일기 목록에 책 제목 표시 확인
3. `phases/4-mvp/index.json` step 6 업데이트:
   - `"status": "completed"`, `"summary": "build/lint/test 0 에러, grep 빈 결과, 아키텍처 체크리스트 통과"`
4. phase 완료 커밋:
   - `chore(4-mvp): mark phase completed`

## 금지사항

- 테스트를 삭제하거나 skip하여 통과율을 인위적으로 높이지 마라.
- 이 step에서 새 기능을 추가하지 마라. 검증과 최소 수정만.
- `--force` 또는 `--no-verify` 옵션으로 git 훅을 우회하지 마라.
