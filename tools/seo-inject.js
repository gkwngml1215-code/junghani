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
 *       BlogPosting(원장칼럼 article.post 에서 추출), Physician(의료진 페이지)
 *  2. sitemap.xml, robots.txt 를 다시 만든다
 *
 * 도메인이 정해지면 아래 SITE_URL 만 바꾸고 다시 실행하면 전체 페이지가 갱신됩니다.
 */
const fs = require("fs");
const path = require("path");

// 사이트 주소 우선순위: 환경변수 URL·SITE_URL → admin/config.json 의 siteUrl → 임시값
let CFG_URL = "";
try { CFG_URL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "admin", "config.json"), "utf8")).siteUrl || ""; } catch (e) {}
const SITE_URL = (process.env.URL || process.env.SITE_URL || CFG_URL || "https://www.jeonghanclinic.kr").replace(/\/+$/, "");

const CLINIC = {
  name: "울산 정한의원",
  alternateName: "정한의원",
  legalName: "정한의원",
  telephone: "+82-52-242-2244",
  email: "gajasky@nate.com",
  streetAddress: "성안로 188, 2층 201호",
  addressLocality: "중구",
  addressRegion: "울산광역시",
  postalCode: "",
  lat: 35.5768027,
  lng: 129.3176713,
  founder: "정석환",
  foundingDate: "2024-02-28",
  logo: "/assets/img/logo/logo-vertical.png",
  image: "/assets/img/hero/main-hero.jpg",
  sameAs: [
    "https://blog.naver.com/jeonghani9975",
    "https://map.naver.com/p/entry/place/20115436",
    "https://pf.kakao.com/_Exlcmxj",
    "https://m.booking.naver.com/booking/13/bizes/169408"
  ],
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Friday"], opens: "09:30", closes: "19:00" },
    { days: ["Thursday"], opens: "14:30", closes: "19:00" },
    { days: ["Saturday"], opens: "09:30", closes: "14:00" }
  ],
  specialties: ["추나요법", "안면비대칭교정", "턱관절교정", "목·허리디스크", "오십견", "소화불량·담적", "역류성식도염", "한방다이어트"]
};

const DOCTOR = {
  name: "정석환",
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
    if (e.isDirectory()) return ["node_modules", "tools", "components", "admin", "_data"].includes(e.name) ? [] : walk(p);
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
function abs(p) {
  if (!p) return "";
  if (/^https?:/.test(p)) return p;
  return SITE_URL + p.replace(/\/index\.html$/, "/");
}
function urlFor(file) {
  let rel = "/" + path.relative(ROOT, file).split(path.sep).join("/");
  if (rel.endsWith("/index.html")) rel = rel.slice(0, -"index.html".length);
  return SITE_URL + rel;
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
        body: text(pick(html, /<div class="post-body">([\s\S]*?)<div class="author-box">/i))
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

function buildJsonLd(info, file, url) {
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

  const page = {
    "@type": info.article ? "WebPage" : "MedicalWebPage",
    "@id": url + "#webpage",
    url,
    name: info.title,
    description: info.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": SITE_URL + "/#website" },
    about: { "@id": SITE_URL + "/#clinic" },
    primaryImageOfPage: info.image,
    dateModified: info.article ? info.article.modified : TODAY
  };
  if (info.crumbs.length) page.breadcrumb = { "@id": url + "#breadcrumb" };
  if (!info.article) {
    page.audience = { "@type": "MedicalAudience", audienceType: "Patient" };
    page.lastReviewed = TODAY;
    page.reviewedBy = { "@id": SITE_URL + "/#doctor" };
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
      "@type": ["BlogPosting", "MedicalScholarlyArticle"],
      "@id": url + "#article",
      headline: info.h1 || info.title,
      description: info.description,
      abstract: a.summary.join(" "),
      articleSection: a.category,
      image: info.image,
      datePublished: a.published,
      dateModified: a.modified,
      author: { "@id": SITE_URL + "/#doctor" },
      publisher: { "@id": SITE_URL + "/#clinic" },
      mainEntityOfPage: { "@id": url + "#webpage" },
      inLanguage: "ko-KR",
      wordCount: a.body.replace(/\s+/g, "").length,
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
  const info = extract(html, file);
  const isArticle = !!info.article;

  const block = [
    "<!-- seo:start (tools/seo-inject.js 가 자동 생성, 직접 수정하지 마세요) -->",
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">`,
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
    `<script type="application/ld+json">${JSON.stringify(buildJsonLd(info, file, url))}</script>`,
    "<!-- seo:end -->"
  ]
    .filter(Boolean)
    .join("\n");

  // 기존 자동 블록 제거 + 손으로 넣어둔 og:* 제거(중복 방지)
  html = html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->\n?/i, "");
  html = html.replace(/^\s*<meta property="og:(title|description|image)"[^>]*>\n/gim, "");
  html = html.replace(/<\/head>/i, block + "\n</head>");
  fs.writeFileSync(file, html);
  return { url, faqs: info.faqs.length, crumbs: info.crumbs.length, article: isArticle, modified: isArticle ? info.article.modified : TODAY };
}

// ---------- 실행 ----------
const files = walk(ROOT).filter((f) => f.endsWith(".html") && !path.basename(f).startsWith("_") && !/구현가이드/.test(f));
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

// robots.txt
fs.writeFileSync(
  path.join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /tools/\nDisallow: /admin/\nDisallow: /pages/columns/_data/\nDisallow: /pages/columns/_template.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);
console.log(`\n${entries.length} pages updated · sitemap.xml · robots.txt  (SITE_URL = ${SITE_URL})`);
