/**
 * 배포용 빌드 스크립트 — Netlify 가 저장소를 받을 때마다 실행합니다.
 * ------------------------------------------------------------
 *  1. pages/columns/_data/*.json → 칼럼 HTML · 목록 페이지 생성
 *  2. tools/seo-inject.js 실행 (canonical · OG · JSON-LD · sitemap · robots)
 *  3. build-info.json 기록 (어드민이 "배포 완료" 를 확인하는 데 사용)
 *  4. 배포 환경(NETLIFY=true)에서는 공개하면 안 되는 파일을 삭제
 *
 * 로컬에서 시험: 사이트 폴더에서  node tools/build.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const R = require("./column-render");

const ROOT = R.ROOT;
const onNetlify = process.env.NETLIFY === "true";

const imported = R.importExisting();
const published = R.rebuildAll();
console.log(`칼럼: 공개 ${published}편` + (imported ? ` (가져온 글 ${imported}편)` : ""));

execFileSync(process.execPath, [path.join(__dirname, "seo-inject.js")], { cwd: ROOT, stdio: "inherit" });

fs.writeFileSync(
  path.join(ROOT, "build-info.json"),
  JSON.stringify({ commit: process.env.COMMIT_REF || "", builtAt: new Date().toISOString(), url: process.env.URL || "" }, null, 2)
);

if (onNetlify) {
  const remove = ["tools", "pages/columns/_data", "pages/columns/_template.html", "pages/columns/칼럼 작성 가이드.md", "README.md", "배포가이드.md", "구현가이드.md", "구현가이드.html", "netlify.toml", ".gitignore"];
  for (const rel of remove) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  }
  console.log("배포 제외 파일 정리 완료");
}
console.log("빌드 완료");
