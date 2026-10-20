/**
 * 배포용 빌드 스크립트 — Cloudflare Pages 가 저장소(main)를 받을 때마다 실행합니다.
 * ------------------------------------------------------------
 *  1. pages/columns/_data/*.json → 칼럼 HTML · 목록 페이지 생성
 *  2. tools/seo-inject.js 실행 (canonical · OG · JSON-LD · sitemap · robots)
 *  3. build-info.json 기록 (어드민이 "배포 완료" 를 확인하는 데 사용)
 *  4. 공개할 파일만 dist/ 로 복사 (tools · 칼럼 원고 JSON · 안내 문서 · 어드민은 제외)
 *
 * Cloudflare Pages 설정:  Build command = node tools/build.js   /   Build output directory = dist
 * 로컬에서 시험:          사이트 폴더에서  node tools/build.js   → dist/ 가 생김 (git 에는 올라가지 않음)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const R = require("./column-render");

const ROOT = R.ROOT;
const DIST = path.join(ROOT, "dist");

// 0) site.json(진료시간·전화·주소·링크·SEO·공지) 을 페이지에 반영
const applied = require("./site-apply").applyAll();
console.log(`홈페이지 설정 반영: 바뀐 파일 ${applied.changed}개`);

const imported = R.importExisting();
const published = R.rebuildAll();
console.log(`칼럼: 공개 ${published}편` + (imported ? ` (가져온 글 ${imported}편)` : ""));

execFileSync(process.execPath, [path.join(__dirname, "seo-inject.js")], { cwd: ROOT, stdio: "inherit" });

const commit = process.env.CF_PAGES_COMMIT_SHA || process.env.COMMIT_REF || "";
fs.writeFileSync(path.join(ROOT, "build-info.json"), JSON.stringify({ commit, builtAt: new Date().toISOString(), branch: process.env.CF_PAGES_BRANCH || "", nextScheduled: R.nextScheduled() }, null, 2));

// 공개 제외 목록 (저장소 루트 기준)
const EXCLUDE = new Set(["tools", "admin", "dist", "node_modules", ".git", ".gitignore", ".node-version", "site.json", "README.md", "배포가이드.md", "구현가이드.md", "구현가이드.html", "package.json", "package-lock.json"]);
const EXCLUDE_PATHS = new Set(["pages/columns/_data", "pages/columns/_template.html", "pages/columns/칼럼 작성 가이드.md"]);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
// dist 가 ROOT 안에 있으므로 루트를 통째로 복사하지 않고 항목별로 복사한다
const keep = (src) => !EXCLUDE_PATHS.has(path.relative(ROOT, src).split(path.sep).join("/"));
for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (EXCLUDE.has(e.name)) continue;
  fs.cpSync(path.join(ROOT, e.name), path.join(DIST, e.name), { recursive: true, filter: keep });
}
// 공통 헤더/푸터를 각 페이지 HTML 에 직접 넣는다 (배포본 dist/ 에만 적용, 원본 파일은 그대로)
// 원래는 nav.js 가 접속할 때 fetch 로 붙이는데, 그러면 HTML 자체에는 메뉴·주소·전화가 없어서
// 자바스크립트를 실행하지 않는 크롤러(네이버 Yeti 일부, GPTBot·ClaudeBot 등 AI 크롤러)가 다른 페이지 링크와 병원 정보를 못 읽는다.
const HEADER = fs.readFileSync(path.join(DIST, "components", "header.html"), "utf8").trim();
const FOOTER = fs.readFileSync(path.join(DIST, "components", "footer.html"), "utf8").trim();
let inlined = 0;
(function inline(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== "components") inline(p); continue; }
    if (!e.name.endsWith(".html")) continue;
    const html = fs.readFileSync(p, "utf8");
    const out = html
      .replace('<div id="site-header-placeholder"></div>', () => `<div id="site-header-placeholder">${HEADER}</div>`)
      .replace('<div id="site-footer-placeholder"></div>', () => `<div id="site-footer-placeholder">${FOOTER}</div>`);
    if (out !== html) { fs.writeFileSync(p, out); inlined++; }
  }
})(DIST);
console.log(`헤더/푸터 직접 삽입: ${inlined}개 페이지`);

const n = (function count(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0); })(DIST);
console.log(`dist/ 생성 완료 · 파일 ${n}개 · commit ${commit || "(로컬)"}`);
console.log("빌드 완료");
