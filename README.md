# 울산 정한의원 홈페이지 - 작업 안내

## 1. 여는 방법 (중요)

헤더/푸터를 `components/header.html`, `components/footer.html`에서 `fetch`로 불러오는 구조라, **파일을 더블클릭해서 `file://`로 열면 메뉴가 안 뜹니다.** 반드시 로컬 서버로 여세요.

- 방법 A (권장): 사이트 폴더에서 `node tools/admin-server.js` 실행 → 홈페이지 `http://localhost:8080/`, 어드민 `http://localhost:8080/admin/`
- 방법 B: Claude에게 "홈페이지 크롬으로 열어줘" 또는 "어드민 켜줘"라고 요청
- 방법 C: VS Code 확장 **Live Server** (홈페이지만 볼 때. 어드민은 동작 안 함)

## 1-1. 어드민 (원장칼럼 관리)

- 주소: `http://localhost:8080/admin/` · 비밀번호: `tools/admin-config.json`의 `password` (처음 값 `jeong2244`)
- 할 수 있는 것: 칼럼 목록 보기, 새 글 쓰기(제목·작성자·카테고리·description·keywords·schema·내용 편집기·썸네일·alt값 + 핵심 요약·FAQ·참고 자료), 수정, 삭제, 임시저장, 미리보기, 전체 다시 생성
- 저장하면 글 HTML 생성 → 목록 갱신 → SEO 데이터·sitemap 갱신까지 자동
- 자세한 사용법: `pages/columns/칼럼 작성 가이드.md`
- **인터넷 어드민(배포 후):** `https://www.junghani.co.kr/admin/` 에서 GitHub 접속 키로 로그인하면 어느 컴퓨터에서나 칼럼을 쓸 수 있습니다. 글은 GitHub 저장소 `pages/columns/_data/`에 저장되고, Netlify 가 `tools/build.js` 로 페이지를 자동 생성합니다. 설정·발급 방법은 `배포가이드.md`. 로컬 어드민(비밀번호)도 그대로 동작하지만 로컬에서 쓴 글은 GitHub 에 올려야 반영됩니다.

## 2. 폴더 구조

```
index.html                  메인 페이지
booking.html                진료예약 안내 (네이버 예약 · 카카오톡 채널 · 전화)
sitemap.xml, robots.txt     검색엔진용 (tools/seo-inject.js 가 자동 생성)
components/
  header.html               공통 헤더(GNB) — 메뉴 수정은 이 파일 하나만
  footer.html               공통 푸터 + 플로팅 버튼(카톡/네이버예약/전화/TOP)
assets/
  css/common.css            색상 변수, 헤더/푸터, 메인 섹션, 반응형
  css/page.css              서브페이지 템플릿 + 원장칼럼 스타일
  js/nav.js                 헤더/푸터 삽입, 모바일 메뉴, 현재 메뉴 표시
  img/                      logo/ hero/ doctor/ clinic/ pages/
pages/
  pain/                     통증질환: index, chuna, disc, shoulder, others
  facial/                   안면비대칭교정: index(안면비대칭), tmj(턱관절교정)
  digestive/                소화기질환: indigestion(소화불량·담적), reflux(역류성식도염)
  diet/                     한방다이어트: index, constitution-test, 5-step-prescription
  about/                    한의원 소개: index, doctor, location
  columns/                  원장칼럼: index(목록, 어드민이 자동 갱신), 날짜-슬러그.html(글), _data/(글 원본 JSON), _template.html, 칼럼 작성 가이드.md
admin/
  index.html                원장칼럼 어드민 화면
tools/
  admin-server.js           로컬 서버 + 어드민 API (node tools/admin-server.js)
  column-render.js          칼럼 JSON → HTML 생성기
  seo-inject.js             SEO/GEO/AEO 자동 주입 스크립트 (아래 5번)
  admin-config.json         어드민 비밀번호
```

## 3. 병원 기본 정보 (사업자등록증·진료시간 자료 기준)

| 항목 | 내용 |
|---|---|
| 상호 | 정한의원 (울산 정한의원) |
| 대표 | 정석환 |
| 사업자등록번호 | 317-98-01694 |
| 주소 | 울산광역시 중구 성안로 188, 2층 201호 (성안동 농협사거리) |
| 좌표 | 위도 35.5768027 / 경도 129.3176713 |
| 전화 | 052-242-2244 |
| 이메일 | gajasky@nate.com |
| 진료시간 | 월화수금 09:30~19:00 / 목 14:30~19:00 / 토 09:30~14:00(점심 없음) / 점심 13:00~14:30 / 일·공휴일 휴진 |
| 네이버 블로그 | https://blog.naver.com/jeonghani9975 |
| 네이버 플레이스 | https://map.naver.com/p/entry/place/20115436 |
| 네이버 예약 | https://m.booking.naver.com/booking/13/bizes/169408 |
| 카카오톡 채널 | https://pf.kakao.com/_Exlcmxj |

전화번호·진료시간·링크가 바뀌면 `components/footer.html`, `components/header.html`, `index.html`, `booking.html`, `pages/about/location.html`, 그리고 `tools/seo-inject.js` 상단의 CLINIC 정보를 함께 수정한 뒤 스크립트를 다시 실행하세요.

## 4. 원장칼럼 올리는 방법

`pages/columns/칼럼 작성 가이드.md`를 보세요. 요약: `_template.html` 복사 → 대괄호 채우기 → `columns/index.html` 목록 맨 위에 카드 추가 → `node tools/seo-inject.js` 실행.

## 5. SEO · GEO · AEO 구조

- 모든 페이지 `<head>`에 `<!-- seo:start -->` ~ `<!-- seo:end -->` 블록이 자동 생성됩니다: canonical, robots, Open Graph, Twitter Card, 지역 메타(geo.*), JSON-LD 구조화 데이터.
- JSON-LD에는 병원(MedicalClinic: 주소·좌표·진료시간·전화·채널), 의료진(Physician), 페이지(MedicalWebPage), 경로(BreadcrumbList), FAQ(FAQPage — `.faq` 안의 질문/답에서 자동 추출), 칼럼(BlogPosting — 발행일·수정일·저자)이 들어갑니다.
- AI 검색(GEO/AEO)을 위해 칼럼마다 "핵심 요약" 박스와 소제목 아래 한 문장 정답(key-answer), FAQ, 참고 자료, 글쓴이 박스를 두는 구조입니다. 이 부분은 `speakable`로 표시되어 음성·AI 답변에 우선 인용됩니다.
- **사이트 주소(SITE_URL)** 는 Netlify 빌드 시 자동으로 실제 주소(`URL` 환경변수)가 쓰입니다. 로컬 실행 시에는 `admin/config.json` 의 `siteUrl` (없으면 임시값 `https://www.jeonghanclinic.kr`).
- 사이트를 올린 뒤 할 일: 네이버 서치어드바이저와 구글 서치콘솔에 사이트 등록 → `sitemap.xml` 제출. 네이버 플레이스·카카오 채널의 홈페이지 주소도 같은 도메인으로 맞추기.

## 6. 원본 자료 위치

`../../울산정한의원 자료/` 폴더에 블로그 원고(txt), 사진, 로고(.ai), 사업자등록증이 있습니다. 사이트에는 웹용으로 축소한 사본만 넣었습니다.

## 7. 남은 확인 사항

- 도메인 확정 후 Netlify 에 도메인 연결 (`배포가이드.md` 5번)
- 지도: 구글 지도 임베드 사용 중. 네이버 지도 임베드를 원하면 네이버 지도 API 키 필요
- 비급여 진료비용: 사이트에는 금액을 넣지 않았음 (원내 게시 안내)
- 치료 전후 사진: 안면비대칭교정·턱관절교정 페이지에 2케이스 게시 (`assets/img/cases/`). 의료광고법상 치료 전후 사진은 환자 동의와 의료광고 심의 대상이 될 수 있으니 게시 전 확인 필요. 타 한의원 브랜딩이 들어간 이미지는 제외
- 비강추나 관련 내용은 요청에 따라 전부 제외
