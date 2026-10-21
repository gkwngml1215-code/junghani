/**
 * SEO / GEO / AEO 자동 주입 스크립트
 * ------------------------------------------------------------
 * 실행:  사이트 폴더(ulsan-jeong-clinic)에서  node tools/seo-inject.js
 *
 * 하는 일 (모든 .html 에 대해, _template.html 과 구현가이드.html 제외)
 *  1. <head> 안의 <!-- seo:start --> ~ <!-- seo:end --> 블록을 새로 만든다
 *     - canonical, robots, Open Graph, Twitter Card
 *     - JSON-LD 구조화 데이터: MedicalClinic(병원), WebSite, WebPage/MedicalWebPage,
 *       BreadcrumbList(.breadcrumb 에서 추출), FAQPage(.faq details 에서 추출),
 *       BlogPosting(원장칼럼 article.post 에서 추출, about = 질환·치료 개체), Physician(의료진 페이지)
 *  2. sitemap.xml, robots.txt 를 다시 만든다
 *
 * 도메인이 정해지면 아래 SITE_URL 만 바꾸고 다시 실행하면 전체 페이지가 갱신됩니다.
 */
const fs = require("fs");
const path = require("path");

// 사이트 주소 우선순위: 환경변수 URL·SITE_URL → admin/config.json 의 siteUrl → 임시값
let CFG = {};
try { CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "admin", "config.json"), "utf8")); } catch (e) {}
const SITE_URL = (process.env.URL || process.env.SITE_URL || CFG.siteUrl || "https://www.junghani.co.kr").replace(/\/+$/, "");
// 예전에 쓰던 임시 도메인 — 페이지 안에 남아 있으면 현재 주소로 바꿈
const OLD_URLS = ["https://www.jeonghanclinic.kr", "https://jeonghanclinic.kr"];
const { execFileSync } = require("child_process");

// 페이지별 keywords (네이버용). 칼럼은 어드민 입력값을 씀
const KEYWORDS = {
  "/index.html": "울산 한의원, 성안동 한의원, 울산 추나요법, 울산 안면비대칭, 울산 턱관절, 울산 한방다이어트, 울산 중구 한의원, 정한의원",
  "/booking.html": "울산 정한의원 예약, 성안동 한의원 예약, 네이버 예약 한의원, 울산 한의원 전화",
  "/pages/pain/index.html": "울산 통증 한의원, 울산 허리 통증, 울산 목 통증, 울산 어깨 통증, 성안동 통증 치료",
  "/pages/pain/chuna.html": "울산 추나요법, 추나 건강보험, 추나요법 비용, 울산 추나 잘하는 곳, 성안동 추나",
  "/pages/pain/disc.html": "울산 허리디스크 한의원, 울산 목디스크, 디스크 추나, 울산 디스크 비수술",
  "/pages/pain/shoulder.html": "울산 오십견 한의원, 울산 어깨 통증, 회전근개 한의원, 울산 어깨 침",
  "/pages/pain/others.html": "울산 무릎 통증 한의원, 울산 손목 통증, 울산 발목 염좌, 울산 두통 한의원",
  "/pages/facial/index.html": "울산 안면비대칭, 안면비대칭 교정 한의원, 울산 얼굴 비대칭, 안면비대칭 추나, 울산 안면비대칭 잘하는 곳",
  "/pages/facial/tmj.html": "울산 턱관절 한의원, 턱관절 교정, 턱관절 통증 한의원, 울산 턱 소리, 턱관절 추나",
  "/pages/digestive/indigestion.html": "울산 소화불량 한의원, 담적 한의원, 울산 담적, 만성 소화불량 한약, 울산 위장 한의원",
  "/pages/digestive/reflux.html": "울산 역류성식도염 한의원, 역류성식도염 한약, 울산 속쓰림, 역류성식도염 침",
  "/pages/diet/index.html": "울산 한방다이어트, 울산 다이어트 한의원, 체질 다이어트, 다이어트 한약 울산, 성안동 다이어트",
  "/pages/diet/constitution-test.html": "체질 검사 한의원, 울산 체질 다이어트, 4계절 체질, 체성분 검사 한의원",
  "/pages/diet/5-step-prescription.html": "다이어트 한약 처방, 울산 다이어트 한약, 한방 다이어트 단계, 요요 없는 다이어트",
  "/pages/about/index.html": "울산 정한의원, 성안동 한의원 소개, 울산 중구 한의원, 정한의원 시설",
  "/pages/about/doctor.html": "정석환 원장, 울산 한의사, 정한의원 원장, 추나 전문 한의사, 안면비대칭 전문 한의사",
  "/pages/about/location.html": "울산 정한의원 위치, 성안로 188, 성안동 한의원 주차, 울산 중구 한의원 오시는 길",
  "/pages/columns/index.html": "울산 한의원 칼럼, 정석환 원장 칼럼, 추나 칼럼, 안면비대칭 칼럼, 한방 건강 정보"
};

// ---------- 페이지 마지막 수정일 ----------
// Cloudflare Pages 는 저장소를 얕게(최신 커밋 1개만) 받아오기 때문에, git 기록만 쓰면
// 모든 페이지의 수정일이 "가장 최근 커밋 날짜" 로 똑같이 찍힌다 (실제로 전 페이지가 같은 날짜로 나갔던 원인).
// 그래서 페이지 내용의 해시와 날짜를 tools/lastmod.json 에 기록해 두고, 내용이 그대로면 기록된 날짜를 쓴다.
//  - 기록과 내용이 같음        → 기록된 날짜
//  - 기록 없음(새 페이지)       → git 에서 그 파일의 마지막 커밋 날짜 (얕은 저장소면 최신 커밋 날짜)
//  - 기록과 내용이 다름(수정됨) → 로컬: 오늘 / Cloudflare 빌드: 최신 커밋 날짜(= 그 수정을 올린 날)
// 로컬(전체 기록이 있는 저장소)에서 실행하면 lastmod.json 이 갱신되니, 페이지를 고친 뒤에는 이 파일도 같이 커밋하세요.
const crypto = require("crypto");
const LASTMOD_FILE = path.join(__dirname, "lastmod.json");
let LASTMOD = {};
try { LASTMOD = JSON.parse(fs.readFileSync(LASTMOD_FILE, "utf8")); } catch (e) {}
const gitOut = (args) => { try { return execFileSync("git", args, { cwd: path.resolve(__dirname, ".."), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { return ""; } };
const IS_SHALLOW = gitOut(["rev-parse", "--is-shallow-repository"]) !== "false"; // git 이 없어도 "얕음" 으로 취급 (기록 파일 우선)
const HEAD_DATE = (() => { const d = gitOut(["log", "-1", "--format=%cs"]); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ""; })();
let lastmodChanged = false;

function contentHash(html) {
  // 자동 생성 SEO 블록은 날짜가 들어가므로 빼고 비교
  const body = html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->\n?/i, "").replace(/\r\n/g, "\n");
  return crypto.createHash("sha1").update(body).digest("hex").slice(0, 16);
}
function lastModOf(file, html) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const hash = contentHash(html);
  const rec = LASTMOD[rel];
  if (rec && rec.hash === hash && rec.date) return rec.date;

  let date;
  if (rec) date = IS_SHALLOW ? HEAD_DATE || TODAY : TODAY;
  else {
    const d = IS_SHALLOW ? HEAD_DATE : gitOut(["log", "-1", "--format=%cs", "--", rel]);
    date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : TODAY;
  }
  if (!IS_SHALLOW) { LASTMOD[rel] = { hash, date }; lastmodChanged = true; }
  return date;
}

// 병원 기본 정보는 site.json (어드민 "홈페이지 설정") 에서 읽음. 없으면 아래 기본값
let SITE = {};
try { SITE = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "site.json"), "utf8")); } catch (e) {}
const SC = SITE.clinic || {}, SH = SITE.hours || {}, SCH = SITE.channels || {}, SSEO = SITE.seo || {};
const PHONE = SC.phone || "052-242-2244";

const CLINIC = {
  name: SC.name || "울산 정한의원",
  alternateName: "정한의원",
  legalName: "정한의원",
  telephone: "+82-" + PHONE.replace(/^0/, ""),
  email: SC.email || "gajasky@nate.com",
  streetAddress: SC.street || "성안로 188, 2층 201호",
  addressLocality: SC.city || "중구",
  addressRegion: SC.region || "울산광역시",
  postalCode: "",
  lat: 35.5768027,
  lng: 129.3176713,
  founder: SC.doctor || "정석환",
  foundingDate: "2024-02-28",
  logo: "/assets/img/logo/logo-vertical.png",
  image: "/assets/img/hero/main-hero.jpg",
  hasMap: SCH.naverMap || "https://map.naver.com/p/entry/place/20115436",
  sameAs: [SCH.blog, SCH.naverMap, SCH.kakao, SCH.naverBooking].filter(Boolean),
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Friday"], opens: SH.weekdayOpen || "09:30", closes: SH.weekdayClose || "19:00" },
    { days: ["Thursday"], opens: SH.thuOpen || "14:30", closes: SH.thuClose || "19:00" },
    { days: ["Saturday"], opens: SH.satOpen || "09:30", closes: SH.satClose || "14:00" }
  ],
  specialties: ["추나요법", "안면비대칭교정", "턱관절교정", "목·허리디스크", "오십견", "소화불량·담적", "역류성식도염", "한방다이어트"]
};
if (SSEO.naverVerify) CFG.naverVerify = SSEO.naverVerify;
if (SSEO.googleVerify) CFG.googleVerify = SSEO.googleVerify;

const DOCTOR = {
  name: SC.doctor || "정석환",
  jobTitle: "한의사 · 대표원장",
  url: "/pages/about/doctor.html",
  image: "/assets/img/doctor/doctor-portrait.jpg",
  memberOf: ["대한 척추추나학회", "대한 면역약침학회", "대한 한의통증제형학회", "대한 한방피부과학회", "대한 중경의학회", "한방 비만학회"]
};

const ROOT = path.resolve(__dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- 유틸 ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ["node_modules", "tools", "components", "admin", "_data", "dist", ".git"].includes(e.name) ? [] : walk(p);
    return [p];
  });
}
function decode(s) {
  return s.replace(/&nbsp;/g, " ").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}
function text(html) {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"')) || tag.match(new RegExp(name + "\\s*=\\s*'([^']*)'"));
  return m ? decode(m[1]) : "";
}
// 주소 규칙 (Cloudflare Pages 와 동일): /dir/index.html → /dir/ , /page.html → /page
function cleanPath(p) {
  return p.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
}
function abs(p) {
  if (!p) return "";
  for (const old of OLD_URLS) if (p.startsWith(old)) p = p.slice(old.length);
  if (/^https?:/.test(p)) return p;
  return SITE_URL + (/\.(html)$/.test(p) ? cleanPath(p) : p);
}
function urlFor(file) {
  const rel = "/" + path.relative(ROOT, file).split(path.sep).join("/");
  return SITE_URL + cleanPath(rel);
}
function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : "";
}

// ---------- 추출 ----------
function extract(html, file) {
  const title = text(pick(html, /<title>([\s\S]*?)<\/title>/i));
  const description = attr(pick(html, /(<meta\s+name="description"[^>]*>)/i) || "", "content");
  const h1 = text(pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));

  // breadcrumb: <div class="breadcrumb"> a > a > text
  const bcHtml = pick(html, /<div class="breadcrumb"[^>]*>([\s\S]*?)<\/div>/i);
  const crumbs = [];
  if (bcHtml) {
    const parts = bcHtml.split(/&gt;/);
    parts.forEach((p) => {
      const a = p.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (a) crumbs.push({ name: text(a[2]), url: abs(a[1]) });
      else if (text(p)) crumbs.push({ name: text(p), url: "" });
    });
  }

  // FAQ
  const faqs = [];
  const faqBlock = html.match(/<div class="faq">([\s\S]*?)<\/div>\s*<\/div>/i);
  const faqHtml = faqBlock ? faqBlock[1] : "";
  const re = /<details>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="a">([\s\S]*?)<\/div>\s*<\/details>/gi;
  let m;
  while ((m = re.exec(faqHtml))) faqs.push({ q: text(m[1]), a: text(m[2]) });

  // 칼럼
  const artTag = pick(html, /(<article class="post"[^>]*>)/i);
  const article = artTag
    ? {
        category: attr(artTag, "data-category"),
        published: attr(artTag, "data-published"),
        modified: attr(artTag, "data-modified") || attr(artTag, "data-published"),
        image: attr(artTag, "data-image"),
        summary: (() => {
          const s = pick(html, /<section class="summary-box"[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
          return s ? s.split(/<\/li>/).map(text).filter(Boolean) : [];
        })(),
        body: text(pick(html, /<div class="post-body">([\s\S]*?)(?:<div class="author-box">|<aside class="author-box)/i)),
        // 참고자료 링크 → 구조화 데이터 citation
        citations: (() => {
          const sec = pick(html, /<section class="references"[^>]*>([\s\S]*?)<\/section>/i);
          return [...String(sec || "").matchAll(/<a href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ "@type": "CreativeWork", name: text(m[2]), url: m[1] }));
        })()
      }
    : null;

  // 대표 이미지: og:image 가 있으면 사용, 없으면 sub-hero 배경 또는 기본
  let image = attr(pick(html, /(<meta\s+property="og:image"[^>]*>)/i) || "", "content");
  if (!image) image = pick(html, /class="sub-hero"[^>]*background-image:url\('([^']+)'\)/i);
  if (!image && article) image = article.image;
  if (!image) image = CLINIC.image;

  return { title, description, h1, crumbs, faqs, article, image: abs(image) };
}

// ---------- JSON-LD ----------
function clinicNode() {
  return {
    "@type": ["MedicalClinic", "MedicalBusiness", "LocalBusiness"],
    "@id": SITE_URL + "/#clinic",
    name: CLINIC.name,
    alternateName: CLINIC.alternateName,
    legalName: CLINIC.legalName,
    url: SITE_URL + "/",
    telephone: CLINIC.telephone,
    email: CLINIC.email,
    image: abs(CLINIC.image),
    logo: abs(CLINIC.logo),
    foundingDate: CLINIC.foundingDate,
    founder: { "@id": SITE_URL + "/#doctor" },
    medicalSpecialty: "한의학",
    availableService: CLINIC.specialties.map((s) => ({ "@type": "MedicalTherapy", name: s })),
    address: {
      "@type": "PostalAddress",
      streetAddress: CLINIC.streetAddress,
      addressLocality: CLINIC.addressLocality,
      addressRegion: CLINIC.addressRegion,
      addressCountry: "KR"
    },
    geo: { "@type": "GeoCoordinates", latitude: CLINIC.lat, longitude: CLINIC.lng },
    hasMap: "https://map.naver.com/p/entry/place/20115436",
    openingHoursSpecification: CLINIC.openingHours.map((o) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: o.days,
      opens: o.opens,
      closes: o.closes
    })),
    sameAs: CLINIC.sameAs,
    areaServed: ["울산광역시", "울산 중구", "성안동"],
    priceRange: "₩₩",
    currenciesAccepted: "KRW",
    paymentAccepted: "현금, 신용카드, 건강보험",
    isAcceptingNewPatients: true
  };
}
function doctorNode(full) {
  const n = {
    "@type": ["Physician", "Person"],
    "@id": SITE_URL + "/#doctor",
    name: DOCTOR.name,
    jobTitle: DOCTOR.jobTitle,
    url: abs(DOCTOR.url),
    image: abs(DOCTOR.image),
    worksFor: { "@id": SITE_URL + "/#clinic" },
    medicalSpecialty: "한의학"
  };
  if (full) {
    n.memberOf = DOCTOR.memberOf.map((o) => ({ "@type": "Organization", name: o }));
    n.knowsAbout = CLINIC.specialties;
    n.description = "울산 정한의원 대표원장. 추나요법 중심의 통증 치료와 안면비대칭·턱관절교정, 소화기질환, 한방다이어트를 진료합니다.";
  }
  return n;
}

// 칼럼이 다루는 질환·치료를 제목·설명에서 찾아 구조화 데이터의 about 으로 넣음
// (검색엔진·AI 가 "이 글은 무엇에 관한 의학 글인가" 를 글자 대신 개체로 이해하도록)
const MEDICAL_TOPICS = [
  { re: /안면\s*비대칭|얼굴\s*비대칭/, node: { "@type": "MedicalCondition", name: "안면비대칭", alternateName: "Facial asymmetry" } },
  { re: /턱관절/, node: { "@type": "MedicalCondition", name: "턱관절 장애", alternateName: ["측두하악관절 장애", "Temporomandibular joint disorder"] } },
  { re: /허리\s*디스크|요추\s*추간판/, node: { "@type": "MedicalCondition", name: "허리디스크", alternateName: "요추 추간판 탈출증" } },
  { re: /목\s*디스크|경추\s*추간판/, node: { "@type": "MedicalCondition", name: "목디스크", alternateName: "경추 추간판 탈출증" } },
  { re: /오십견/, node: { "@type": "MedicalCondition", name: "오십견", alternateName: "유착성 관절낭염" } },
  { re: /소화불량|담적/, node: { "@type": "MedicalCondition", name: "기능성 소화불량" } },
  { re: /역류성/, node: { "@type": "MedicalCondition", name: "역류성 식도염" } },
  { re: /다이어트|비만/, node: { "@type": "MedicalCondition", name: "비만" } },
  { re: /추나/, node: { "@type": "MedicalTherapy", name: "추나요법" } }
];
function medicalTopics(text) {
  return MEDICAL_TOPICS.filter((t) => t.re.test(text)).map((t) => t.node);
}

function buildJsonLd(info, file, url, modified) {
  const rel = "/" + path.relative(ROOT, file).split(path.sep).join("/");
  const isHome = rel === "/index.html";
  const isDoctor = rel.endsWith("/about/doctor.html");
  const graph = [clinicNode(), doctorNode(isDoctor)];

  if (isHome) {
    graph.push({
      "@type": "WebSite",
      "@id": SITE_URL + "/#website",
      url: SITE_URL + "/",
      name: CLINIC.name,
      publisher: { "@id": SITE_URL + "/#clinic" },
      inLanguage: "ko-KR"
    });
  }

  const topics = info.article ? medicalTopics([info.h1, info.title, info.description].join(" ")) : [];
  const page = {
    "@type": "MedicalWebPage",
    "@id": url + "#webpage",
    url,
    name: info.title,
    description: info.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": SITE_URL + "/#website" },
    about: topics.length ? topics : { "@id": SITE_URL + "/#clinic" },
    primaryImageOfPage: info.image,
    dateModified: modified
  };
  if (info.crumbs.length) page.breadcrumb = { "@id": url + "#breadcrumb" };
  page.audience = { "@type": "MedicalAudience", audienceType: "Patient" };
  page.reviewedBy = { "@id": SITE_URL + "/#doctor" };
  page.lastReviewed = modified;
  if (!info.article) {
    page.speakable = { "@type": "SpeakableSpecification", cssSelector: ["h1", ".lead", ".key-answer", ".summary-box"] };
  }
  graph.push(page);

  if (info.crumbs.length) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": url + "#breadcrumb",
      itemListElement: info.crumbs.map((c, i) => {
        const item = { "@type": "ListItem", position: i + 1, name: c.name };
        if (c.url) item.item = c.url;
        else item.item = url;
        return item;
      })
    });
  }

  if (info.faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": url + "#faq",
      mainEntity: info.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a }
      }))
    });
  }

  if (info.article) {
    const a = info.article;
    graph.push({
      // 환자용 건강 칼럼 = BlogPosting. (MedicalScholarlyArticle 은 학술 논문용이라 쓰지 않음)
      // 의학 글이라는 표시는 위의 MedicalWebPage(about·reviewedBy·audience) 가 담당
      "@type": "BlogPosting",
      "@id": url + "#article",
      headline: info.h1 || info.title,
      description: info.description,
      abstract: a.summary.join(" "),
      articleSection: a.category,
      ...(topics.length ? { about: topics } : {}),
      image: info.image,
      datePublished: a.published,
      dateModified: a.modified,
      author: { "@id": SITE_URL + "/#doctor" },
      publisher: { "@id": SITE_URL + "/#clinic" },
      mainEntityOfPage: { "@id": url + "#webpage" },
      inLanguage: "ko-KR",
      wordCount: a.body.replace(/\s+/g, "").length,
      ...(a.citations && a.citations.length ? { citation: a.citations } : {}),
      isAccessibleForFree: true,
      speakable: { "@type": "SpeakableSpecification", cssSelector: [".summary-box", ".key-answer"] }
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

// ---------- 주입 ----------
function inject(file) {
  let html = fs.readFileSync(file, "utf8");
  const url = urlFor(file);
  const rel = "/" + path.relative(ROOT, file).split(path.sep).join("/");
  // 이전에 자동 생성한 블록은 빼고 읽는다 (옛 블록의 og:image 등을 다시 물려받지 않도록)
  const info = extract(html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->\n?/i, ""), file);
  const isArticle = !!info.article;
  const modified = isArticle ? info.article.modified : lastModOf(file, html);
  const keywords = attr(pick(html, /(<meta\s+name="keywords"[^>]*>)/i) || "", "content") || KEYWORDS[rel] || "";

  const block = [
    "<!-- seo:start (tools/seo-inject.js 가 자동 생성, 직접 수정하지 마세요) -->",
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">`,
    keywords && !/name="keywords"/i.test(html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->\n?/i, "")) ? `<meta name="keywords" content="${keywords.replace(/"/g, "&quot;")}">` : "",
    CFG.naverVerify ? `<meta name="naver-site-verification" content="${CFG.naverVerify}">` : "",
    CFG.googleVerify ? `<meta name="google-site-verification" content="${CFG.googleVerify}">` : "",
    `<meta name="author" content="정석환 원장 · 울산 정한의원">`,
    `<meta name="geo.region" content="KR-31">`,
    `<meta name="geo.placename" content="울산광역시 중구 성안동">`,
    `<meta name="geo.position" content="${CLINIC.lat};${CLINIC.lng}">`,
    `<meta property="og:type" content="${isArticle ? "article" : "website"}">`,
    `<meta property="og:site_name" content="${CLINIC.name}">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${info.title.replace(/"/g, "&quot;")}">`,
    `<meta property="og:description" content="${info.description.replace(/"/g, "&quot;")}">`,
    `<meta property="og:image" content="${info.image}">`,
    isArticle ? `<meta property="article:published_time" content="${info.article.published}">` : "",
    isArticle ? `<meta property="article:modified_time" content="${info.article.modified}">` : "",
    isArticle ? `<meta property="article:author" content="정석환">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${info.title.replace(/"/g, "&quot;")}">`,
    `<meta name="twitter:description" content="${info.description.replace(/"/g, "&quot;")}">`,
    `<meta name="twitter:image" content="${info.image}">`,
    `<script type="application/ld+json">${JSON.stringify(buildJsonLd(info, file, url, modified))}</script>`,
    "<!-- seo:end -->"
  ]
    .filter(Boolean)
    .join("\n");

  // 기존 자동 블록 제거 + 손으로 넣어둔 og:* 제거(중복 방지)
  html = html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->\n?/i, "");
  html = html.replace(/^\s*<meta property="og:(title|description|image)"[^>]*>\n/gim, "");
  html = html.replace(/<\/head>/i, block + "\n</head>");
  fs.writeFileSync(file, html);
  return { url, rel, title: info.title, description: info.description, faqs: info.faqs.length, crumbs: info.crumbs.length, article: isArticle, modified };
}

// ---------- 실행 ----------
const files = walk(ROOT).filter((f) => f.endsWith(".html") && !path.basename(f).startsWith("_") && !/구현가이드/.test(f) && path.basename(f) !== "404.html");
const entries = [];
for (const f of files) {
  const r = inject(f);
  entries.push(r);
  console.log(`${r.url}  faq:${r.faqs} crumb:${r.crumbs}${r.article ? " article" : ""}`);
}

// sitemap.xml
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map((e) => {
      const pri = e.url === SITE_URL + "/" ? "1.0" : e.article ? "0.7" : "0.8";
      return `  <url><loc>${e.url}</loc><lastmod>${e.modified}</lastmod><changefreq>${e.article ? "monthly" : "weekly"}</changefreq><priority>${pri}</priority></url>`;
    })
    .join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

// 페이지 수정일 기록 저장 (로컬 실행 때만 — Cloudflare 빌드에서는 저장해도 사라지므로 생략)
if (lastmodChanged) {
  const sorted = Object.fromEntries(Object.keys(LASTMOD).sort().map((k) => [k, LASTMOD[k]]));
  fs.writeFileSync(LASTMOD_FILE, JSON.stringify(sorted, null, 2) + "\n");
}

// robots.txt — 검색엔진 + AI 검색 크롤러 허용 (후한의원 사이트와 같은 기준), 데이터 수집용 Bytespider 는 차단
const AI_BOTS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "Google-Extended", "PerplexityBot", "ClaudeBot", "anthropic-ai", "Applebot-Extended", "CCBot", "Yeti", "NaverBot"];
fs.writeFileSync(
  path.join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /pages/columns/_data/\nDisallow: /pages/columns/_template.html\nDisallow: /components/\n\nSitemap: ${SITE_URL}/sitemap.xml\n\n` +
    AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /\n`).join("\n") +
    `\nUser-agent: Bytespider\nDisallow: /\n`
);

// llms.txt — 생성형 AI 가 사이트를 요약해 인용할 때 읽는 파일
const pageOf = (rel) => entries.find((e) => e.rel === rel);
const line = (rel, label) => { const p = pageOf(rel); return p ? `- [${label || p.title.split("|")[0].trim()}](${p.url}): ${p.description}` : ""; };
const mainPages = [
  ["/pages/pain/index.html", "통증질환"], ["/pages/pain/chuna.html", "추나요법"], ["/pages/pain/disc.html", "목·허리디스크"], ["/pages/pain/shoulder.html", "오십견·어깨"], ["/pages/pain/others.html", "기타 통증"],
  ["/pages/facial/index.html", "안면비대칭교정"], ["/pages/facial/tmj.html", "턱관절교정"],
  ["/pages/digestive/indigestion.html", "소화불량·담적"], ["/pages/digestive/reflux.html", "역류성식도염"],
  ["/pages/diet/index.html", "한방다이어트"], ["/pages/diet/constitution-test.html", "체질 검사"], ["/pages/diet/5-step-prescription.html", "5단계 처방"],
  ["/pages/about/index.html", "한의원 소개"], ["/pages/about/doctor.html", "의료진"], ["/pages/about/location.html", "오시는 길"], ["/booking.html", "진료 예약"]
];
const columns = entries.filter((e) => e.article).map((e) => `- [${e.title.split("|")[0].trim()}](${e.url}): ${e.description}`);
const hoursText = CLINIC.openingHours.map((o) => `${o.days.map((d) => ({ Monday: "월", Tuesday: "화", Wednesday: "수", Thursday: "목", Friday: "금", Saturday: "토" })[d]).join("·")} ${o.opens}-${o.closes}`).join(", ");
fs.writeFileSync(
  path.join(ROOT, "llms.txt"),
  `# ${CLINIC.name}\n\n> ${CLINIC.addressRegion} ${CLINIC.addressLocality} ${CLINIC.streetAddress}에 있는 한의원. 추나요법 중심의 통증 치료, 15년 경력의 안면비대칭·턱관절 교정, 소화불량·역류성식도염 등 소화기질환, 체질 맞춤 한방다이어트를 진료합니다. 대표원장 ${DOCTOR.name}.\n\n` +
    `## 주요 정보\n${mainPages.map(([r, l]) => line(r, l)).filter(Boolean).join("\n")}\n\n` +
    `## 원장 칼럼\n- [원장 칼럼 목록](${SITE_URL}/pages/columns/)\n${columns.join("\n")}\n\n` +
    `## 병원 정보\n- 주소: ${CLINIC.addressRegion} ${CLINIC.addressLocality} ${CLINIC.streetAddress}\n- 전화: ${CLINIC.telephone.replace("+82-", "0")}\n- 진료시간: ${hoursText}, 일요일·공휴일 휴진\n- 대표원장: ${DOCTOR.name} (${DOCTOR.memberOf.join(", ")})\n- 사업자등록번호: 317-98-01694\n- 네이버 예약: https://m.booking.naver.com/booking/13/bizes/169408\n- 카카오톡 채널: https://pf.kakao.com/_Exlcmxj\n- 블로그: https://blog.naver.com/jeonghani9975\n\n` +
    `## 안내\n- 사이트맵: ${SITE_URL}/sitemap.xml\n- 이 사이트의 의학 정보는 일반적인 안내이며 진단·치료를 대신하지 않습니다. 개인별 치료 결과는 다를 수 있습니다.\n`
);
console.log(`\n${entries.length} pages updated · sitemap.xml · robots.txt · llms.txt  (SITE_URL = ${SITE_URL})`);
