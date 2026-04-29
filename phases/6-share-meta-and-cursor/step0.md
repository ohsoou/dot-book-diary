# Step 0: og-image-bear

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `src/app/layout.tsx` — 현재 `metadata` export 구조 (title, description, robots, icons)
- `src/lib/env.ts` — `NEXT_PUBLIC_APP_URL` 환경변수 접근 패턴
- `docs/ADR.md` — ADR-030 확인 (이 phase의 step 0에서 추가됐어야 함. 없으면 추가한다)

## 배경

카카오톡/슬랙/트위터 등 SNS에서 이 앱 URL을 공유할 때 썸네일 이미지로 곰 스프라이트가 표시되도록 한다.

SNS 공유 썸네일은 OG(Open Graph) 메타 태그로 제어된다:
- `og:image` — 썸네일 이미지 URL (절대 URL 필수)
- `og:title` — 공유 제목
- `og:description` — 공유 설명

Next.js App Router는 `metadata` export의 `openGraph` 필드로 이를 제어한다.

사용할 이미지: `public/sprites/day/Bear.png` (실제 파일 존재 확인됨).
공개 URL: `${NEXT_PUBLIC_APP_URL}/sprites/day/Bear.png`

**주의**: Supabase 대시보드 설정이나 외부 서비스 설정은 이 step에서 하지 않는다.

## 작업

### 1. `docs/ADR.md` — ADR-030 추가 (없는 경우에만)

파일에 ADR-030이 없으면 끝에 추가하라:

```
## ADR-030: SNS 공유 썸네일로 Bear.png 채택

**결정**: og:image로 `public/sprites/day/Bear.png`를 사용한다.

**이유**: 앱 아이덴티티를 대표하는 이미지가 곰 캐릭터이며, 이미 day 스프라이트로 고해상도 PNG가 존재한다. 별도 1200×630 합성본 제작은 현재 스코프 밖이다.

**결과·제약**:
- `src/app/layout.tsx`의 `metadata.openGraph.images`에 절대 URL로 설정.
- `metadataBase`는 `NEXT_PUBLIC_APP_URL` 기반으로 설정.
- 이미지 비율이 1:1에 가까워 SNS 플랫폼별 크롭이 발생할 수 있음 — 허용 범위.
- 카카오톡은 OG 캐시를 가지므로 URL 변경 시 https://developers.kakao.com/tool/clear/og 에서 수동 갱신 필요.
```

### 2. `src/app/layout.tsx` — metadata 업데이트

기존 `metadata` export를 다음과 같이 확장하라:

```ts
export const metadata: Metadata = {
  title: { default: '도트 북 다이어리', template: '%s · 도트 북 다이어리' },
  description: '따뜻한 도트 방에서 쓰는 독서 기록',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: '도트 북 다이어리',
    description: '따뜻한 도트 방에서 쓰는 독서 기록',
    images: ['/sprites/day/Bear.png'],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    images: ['/sprites/day/Bear.png'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
}
```

주의:
- `metadataBase`가 설정되면 `images: ['/sprites/day/Bear.png']`는 자동으로 절대 URL로 변환된다.
- 기존 `title`, `description`, `robots`, `icons` 필드는 그대로 유지한다.

### 3. 메타데이터 테스트 (신규)

`src/app/layout.test.ts` (또는 `src/app/layout.metadata.test.ts`) 신규:

```ts
import { metadata } from './layout'

it('has openGraph image', () => {
  expect(metadata.openGraph?.images).toBeDefined()
  const images = metadata.openGraph?.images
  const firstImage = Array.isArray(images) ? images[0] : images
  const src = typeof firstImage === 'string' ? firstImage : (firstImage as { url: string })?.url
  expect(src).toContain('Bear.png')
})
```

## Acceptance Criteria

```bash
bun build
```
0 에러. 빌드 후 생성된 HTML에 og:image meta 태그 포함.

```bash
bun lint
```
0 에러.

```bash
bun test
```
전체 통과 (기존 + 신규 포함).

## 검증 절차

1. AC 커맨드를 순서대로 실행한다.
2. `bun build` 후 `.next/server/app/page.html` 또는 `bun dev` 실행 후 `/`의 `<head>` 소스에서 `og:image`를 확인한다:
   ```bash
   grep -r "og:image" .next/ --include="*.html" | head -5
   ```
3. `phases/6-share-meta-and-cursor/index.json`의 step 0을 업데이트한다.
4. 커밋:
   - `feat(6-share-meta-and-cursor): step 0 — og-image-bear`
   - `chore(6-share-meta-and-cursor): step 0 output`

## 금지사항

- `RootLayout` 함수 컴포넌트 내부 로직(테마 조회, ThemeHydrator, GuestArchiver 등)을 수정하지 마라 — `metadata` export만 변경한다.
- 외부 CDN URL을 og:image로 사용하지 마라 — 반드시 `public/` 정적 에셋 경로.
- 기존 테스트를 삭제하거나 skip하지 마라.
