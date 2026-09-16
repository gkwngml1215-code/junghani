/**
 * 원장칼럼 생성기 — JSON(폼 입력값) → HTML 페이지 / 목록 카드
 * admin-server.js 가 사용합니다. 직접 실행하지 않습니다.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const COLUMNS_DIR = path.join(ROOT, "pages", "columns");
const DATA_DIR = path.join(COLUMNS_DIR, "_data");
const INDEX_FILE = path.join(COLUMNS_DIR, "index.html");

// 카테고리·기본 작성자는 admin/config.json 에서 읽음 (어드민과 같은 값을 쓰기 위해)
let ADMIN_CFG = {};
try { ADMIN_CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "admin", "config.json"), "utf8")); } catch (e) {}
const CATEGORIES = ADMIN_CFG.categories || ["통증 · 추나", "안면비대칭 · 턱관절", "소화기", "다이어트", "한의원 소식"];
const DEFAULT_AUTHOR = ADMIN_CFG.author || "정석환 원장";
const DEFAULT_THUMB = "/assets/img/doctor/doctor-desk.jpg";

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y ? `${y}년 ${m}월 ${d}일` : "";
}
function textOf(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function readingMinutes(html) {
  const chars = textOf(html).replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 500));
}

// ---------- 데이터 파일 ----------
function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
function listPosts() {
  ensureDirs();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")))
    .sort((a, b) => (b.published || "").localeCompare(a.published || "") || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
function readPost(slug) {
  const f = path.join(DATA_DIR, slug + ".json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
}
function writePost(post) {
  ensureDirs();
  fs.writeFileSync(path.join(DATA_DIR, post.slug + ".json"), JSON.stringify(post, null, 2));
}
function deletePost(slug) {
  for (const f of [path.join(DATA_DIR, slug + ".json"), path.join(COLUMNS_DIR, slug + ".html")]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

// ---------- 본문 가공: h2 에 id 부여 + 목차 ----------
// 내부 링크를 배포 주소 규칙(확장자 없음, /dir/)으로 통일 — 어드민에서 .html 로 써도 자동 정리
function cleanLinks(html) {
  return String(html || "")
    .replace(/href="\/index\.html"/g, 'href="/"')
    .replace(/href="(\/[^"#?]*?)\/index\.html((?:[#?][^"]*)?)"/g, 'href="$1/$2"')
    .replace(/href="(\/[^"#?]*?)\.html((?:[#?][^"]*)?)"/g, 'href="$1$2"');
}
function processContent(html) {
  let i = 0;
  const toc = [];
  const out = cleanLinks(html).replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (m, attrs, inner) => {
    i++;
    const id = "s" + i;
    toc.push({ id, text: textOf(inner) });
    const cleaned = attrs.replace(/\s*id="[^"]*"/i, "");
    return `<h2 id="${id}"${cleaned}>${inner}</h2>`;
  });
  return { html: out, toc };
}

// ---------- HTML 렌더 ----------
function renderPost(post, neighbors) {
  const { html: body, toc } = processContent(post.content);
  const thumb = post.thumbnail || DEFAULT_THUMB;
  const summary = (post.summary || []).filter(Boolean);
  const faqs = (post.faqs || []).filter((f) => f.q && f.a);
  const refs = (post.references || []).filter(Boolean).map(cleanLinks);
  const minutes = post.readingMinutes || readingMinutes(post.content);
  const prev = neighbors && neighbors.prev;
  const next = neighbors && neighbors.next;
  const customSchema = (post.schema || "").trim();
  const breadcrumbShort = post.shortTitle || (post.title.length > 24 ? post.title.slice(0, 24) + "…" : post.title);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(post.title)} | 울산 정한의원 원장칼럼</title>
<meta name="description" content="${esc(post.description)}">
${post.keywords ? `<meta name="keywords" content="${esc(post.keywords)}">` : ""}
<link rel="icon" type="image/png" href="/assets/img/logo/symbol.png">
<link rel="stylesheet" href="/assets/css/common.css">
<link rel="stylesheet" href="/assets/css/page.css">
${customSchema ? `<script type="application/ld+json" data-custom-schema>${customSchema}</script>` : ""}
</head>
<body>

<div id="site-header-placeholder"></div>

<div class="page-body">
  <div class="container">
    <article class="post" data-category="${esc(post.category)}" data-published="${esc(post.published)}" data-modified="${esc(post.modified || post.published)}" data-image="${esc(thumb)}">

      <header class="post-head">
        <div class="breadcrumb" style="color:var(--muted);opacity:1"><a href="/">홈</a> &gt; <a href="/pages/columns/">원장칼럼</a> &gt; ${esc(breadcrumbShort)}</div>
        <span class="cat">${esc(post.category)}</span>
        <h1>${esc(post.title)}</h1>
        <div class="post-meta">
          <span class="author"><img src="/assets/img/doctor/doctor-portrait.jpg" alt="${esc(post.author || DEFAULT_AUTHOR)}">${esc(post.author || DEFAULT_AUTHOR)} · 한의사</span>
          <span>발행 <time datetime="${esc(post.published)}">${fmtDate(post.published)}</time></span>
          ${post.modified && post.modified !== post.published ? `<span>수정 <time datetime="${esc(post.modified)}">${fmtDate(post.modified)}</time></span>` : ""}
          <span>읽는 시간 약 ${minutes}분</span>
        </div>
      </header>

      <div class="post-hero"><img src="${esc(thumb)}" alt="${esc(post.thumbnailAlt || post.title)}"></div>

${summary.length ? `      <section class="summary-box" aria-label="핵심 요약">
        <h2>핵심 요약</h2>
        <ul>
${summary.map((s) => `          <li>${s}</li>`).join("\n")}
        </ul>
      </section>
` : ""}
${toc.length ? `      <nav class="toc" aria-label="목차">
        <strong>목차</strong>
        <ol>
${toc.map((t) => `          <li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("\n")}
${faqs.length ? `          <li><a href="#faq">자주 묻는 질문</a></li>` : ""}
        </ol>
      </nav>
` : ""}
      <div class="post-body">
${body}
${faqs.length ? `
        <h2 id="faq">자주 묻는 질문</h2>
        <div class="faq">
${faqs.map((f) => `          <details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join("\n")}
        </div>
` : ""}
${refs.length ? `
        <section class="references">
          <h2>참고 자료</h2>
          <ol>
${refs.map((r) => `            <li>${r}</li>`).join("\n")}
          </ol>
        </section>
` : ""}
      </div>

      <div class="author-box">
        <img src="/assets/img/doctor/doctor-portrait.jpg" alt="정석환 원장">
        <div>
          <h3>글쓴이 · 정석환 원장 (한의사)</h3>
          <p>울산 정한의원 대표원장. 대한 척추추나학회·대한 면역약침학회·대한 한의통증제형학회 정회원. 척추·턱관절·얼굴의 균형을 함께 살피는 추나 중심 진료를 합니다. <a href="/pages/about/doctor">의료진 소개 보기</a></p>
        </div>
      </div>

      <div class="post-nav">
        ${prev ? `<a href="/pages/columns/${esc(prev.slug)}"><span>이전 글</span>${esc(prev.title)}</a>` : `<a href="/pages/columns/"><span>목록</span>원장칼럼 전체 보기</a>`}
        ${next ? `<a href="/pages/columns/${esc(next.slug)}" class="next"><span>다음 글</span>${esc(next.title)}</a>` : `<a href="/pages/columns/" class="next"><span>목록</span>원장칼럼 전체 보기</a>`}
      </div>

      <div class="page-cta">
        <h3>칼럼을 읽고 궁금한 점이 있다면</h3>
        <p>카카오톡 채널로 편하게 질문해 주세요. 사진 상담도 가능합니다.</p>
        <div class="btns">
          <a href="https://m.booking.naver.com/booking/13/bizes/169408" target="_blank" rel="noopener" class="btn btn-primary">네이버 예약</a>
          <a href="https://pf.kakao.com/_Exlcmxj" target="_blank" rel="noopener" class="btn btn-accent">카카오톡 상담</a>
          <a href="tel:052-242-2244" class="btn btn-outline-dark">052-242-2244</a>
        </div>
      </div>

      <p class="disclaimer">본 칼럼은 의학 정보 제공을 목적으로 하며 개별 진단이나 치료를 대체하지 않습니다. 치료 효과와 기간은 개인의 상태에 따라 다를 수 있습니다.</p>
    </article>
  </div>
</div>

<div id="site-footer-placeholder"></div>
<script src="/assets/js/nav.js"></script>
</body>
</html>
`;
}

function renderCard(post) {
  const thumb = post.thumbnail || DEFAULT_THUMB;
  return `      <a href="/pages/columns/${esc(post.slug)}" class="post-card">
        <div class="thumb"><img src="${esc(thumb)}" alt="${esc(post.thumbnailAlt || post.title)}" loading="lazy"></div>
        <div class="body">
          <span class="cat">${esc(post.category)}</span>
          <h3>${esc(post.title)}</h3>
          <p>${esc(post.description)}</p>
          <time datetime="${esc(post.published)}">${fmtDate(post.published)}</time>
        </div>
      </a>`;
}

// 목록 페이지의 <!-- posts:start --> ~ <!-- posts:end --> 사이를 다시 씀
function rebuildIndex(posts) {
  const published = posts.filter((p) => p.status !== "draft");
  let html = fs.readFileSync(INDEX_FILE, "utf8");
  const cards = published.length ? published.map(renderCard).join("\n\n") : `      <p class="muted">아직 등록된 칼럼이 없습니다.</p>`;
  html = html.replace(/<!-- posts:start -->[\s\S]*?<!-- posts:end -->/, `<!-- posts:start -->\n${cards}\n      <!-- posts:end -->`);
  fs.writeFileSync(INDEX_FILE, html);
}

// 공개 글 전체 HTML 재생성 (이전/다음 링크 때문에 하나가 바뀌면 이웃도 갱신)
function rebuildAll() {
  const posts = listPosts();
  const published = posts.filter((p) => p.status !== "draft");
  published.forEach((p, i) => {
    const neighbors = { prev: published[i + 1], next: published[i - 1] }; // 목록은 최신순
    fs.writeFileSync(path.join(COLUMNS_DIR, p.slug + ".html"), renderPost(p, neighbors));
  });
  // 임시저장 글의 html 은 지움
  posts.filter((p) => p.status === "draft").forEach((p) => {
    const f = path.join(COLUMNS_DIR, p.slug + ".html");
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  rebuildIndex(posts);
  return published.length;
}

// ---------- 기존 수작업 HTML → JSON 가져오기 ----------
function importExisting() {
  ensureDirs();
  const files = fs.readdirSync(COLUMNS_DIR).filter((f) => f.endsWith(".html") && !f.startsWith("_") && f !== "index.html");
  let n = 0;
  for (const f of files) {
    const slug = f.replace(/\.html$/, "");
    if (fs.existsSync(path.join(DATA_DIR, slug + ".json"))) continue;
    const h = fs.readFileSync(path.join(COLUMNS_DIR, f), "utf8");
    const pick = (re) => (h.match(re) || [])[1] || "";
    const attr = (tag, n) => (tag.match(new RegExp(n + '="([^"]*)"')) || [])[1] || "";
    const art = pick(/(<article class="post"[^>]*>)/);
    const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const summaryHtml = pick(/<section class="summary-box"[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
    const summary = summaryHtml ? summaryHtml.split(/<\/li>/).map((s) => s.replace(/^[\s\S]*?<li>/, "").trim()).filter(Boolean) : [];
    const faqHtml = pick(/<div class="faq">([\s\S]*?)<\/div>\s*<\/div>/);
    const faqs = [];
    const re = /<details>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="a">([\s\S]*?)<\/div>\s*<\/details>/g;
    let m;
    while ((m = re.exec(faqHtml))) faqs.push({ q: textOf(m[1]), a: textOf(m[2]) });
    const refHtml = pick(/<section class="references">[\s\S]*?<ol>([\s\S]*?)<\/ol>/);
    const references = refHtml ? refHtml.split(/<\/li>/).map((s) => s.replace(/^[\s\S]*?<li>/, "").trim()).filter(Boolean) : [];
    let content = pick(/<div class="post-body">([\s\S]*?)<div class="author-box">/);
    content = content.replace(/<h2 id="faq">[\s\S]*$/, "").replace(/<section class="references">[\s\S]*$/, "").trim();
    const post = {
      slug,
      title: decode(textOf(pick(/<h1>([\s\S]*?)<\/h1>/))),
      shortTitle: decode(textOf((pick(/<div class="breadcrumb"[^>]*>([\s\S]*?)<\/div>/).split("&gt;").pop() || ""))),
      author: DEFAULT_AUTHOR,
      category: decode(attr(art, "data-category")),
      description: decode(pick(/<meta name="description" content="([^"]*)"/)),
      keywords: decode(pick(/<meta name="keywords" content="([^"]*)"/)),
      schema: "",
      content,
      thumbnail: attr(art, "data-image"),
      thumbnailAlt: decode(pick(/<div class="post-hero"><img[^>]*alt="([^"]*)"/)),
      published: attr(art, "data-published"),
      modified: attr(art, "data-modified"),
      summary,
      faqs,
      references,
      status: "published",
      updatedAt: new Date().toISOString()
    };
    writePost(post);
    n++;
  }
  return n;
}

module.exports = { CATEGORIES, DEFAULT_AUTHOR, listPosts, readPost, writePost, deletePost, renderPost, rebuildAll, rebuildIndex, importExisting, readingMinutes, COLUMNS_DIR, DATA_DIR, ROOT };
