/**
 * 어드민 폴더(admin/) 를 저장소의 admin 브랜치로 올립니다.
 * ------------------------------------------------------------
 * Cloudflare Pages "junghani-admin" 프로젝트는 admin 브랜치에 연결되어 있어서,
 * 이 스크립트를 실행하면 1~2분 뒤 어드민 주소에 반영됩니다.
 *
 * 실행:  사이트 폴더에서  node tools/sync-admin.js
 *  - admin/ 안의 파일(index.html, config.json, _worker.js, logo/)만 admin 브랜치에 들어갑니다.
 *  - 현재 작업 중인 main 브랜치는 건드리지 않습니다 (임시 작업 폴더를 씁니다).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "admin");
const BRANCH = "admin";
const git = (args, opts = {}) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "junghani-admin-"));
const wt = path.join(tmp, "wt");
try {
  git(["fetch", "origin", "--prune"]);
  const remoteHas = (() => { try { return !!git(["ls-remote", "--heads", "origin", BRANCH]); } catch (e) { return false; } })();
  const localHas = (() => { try { git(["rev-parse", "--verify", "--quiet", BRANCH]); return true; } catch (e) { return false; } })();

  if (remoteHas) {
    if (!localHas) git(["branch", "--track", BRANCH, "origin/" + BRANCH]);
    git(["worktree", "add", wt, BRANCH]);
    git(["pull", "--ff-only", "origin", BRANCH], { cwd: wt });
    // 옛 파일 제거 (.git 제외)
    for (const e of fs.readdirSync(wt)) if (e !== ".git") fs.rmSync(path.join(wt, e), { recursive: true, force: true });
  } else {
    git(["worktree", "add", "--detach", wt]);
    git(["checkout", "--orphan", BRANCH], { cwd: wt });
    git(["rm", "-rf", "-q", "."], { cwd: wt });
    for (const e of fs.readdirSync(wt)) if (e !== ".git") fs.rmSync(path.join(wt, e), { recursive: true, force: true });
  }

  fs.cpSync(SRC, wt, { recursive: true });
  fs.writeFileSync(path.join(wt, "README.md"), "# 정한의원 어드민 (admin 브랜치)\n\n이 브랜치는 `main` 의 `admin/` 폴더를 `node tools/sync-admin.js` 로 복사한 것입니다. 여기서 직접 고치지 말고 main 의 admin/ 을 고친 뒤 스크립트를 실행하세요.\n");
  git(["add", "-A"], { cwd: wt });
  const changed = git(["status", "--porcelain"], { cwd: wt });
  if (!changed) { console.log("admin 브랜치에 바뀐 내용이 없습니다."); }
  else {
    git(["commit", "-q", "-m", "어드민 갱신 " + new Date().toISOString().slice(0, 16).replace("T", " ")], { cwd: wt });
    console.log(git(["push", "-u", "origin", BRANCH], { cwd: wt, stdio: ["ignore", "pipe", "inherit"] }) || "push 완료");
    console.log("admin 브랜치 푸시 완료 → Cloudflare Pages 가 1~2분 뒤 어드민을 다시 배포합니다.");
  }
} finally {
  try { git(["worktree", "remove", "--force", wt]); } catch (e) {}
  fs.rmSync(tmp, { recursive: true, force: true });
}
