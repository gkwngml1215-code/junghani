/**
 * 공통 헤더/푸터 삽입 + GNB 동작 + 서브페이지 탭 활성화
 * - 반드시 http://localhost 같은 로컬 서버로 열어야 fetch가 동작합니다.
 *   (파일 더블클릭 file:// 로 열면 브라우저 보안 정책상 헤더/푸터가 안 뜹니다)
 */
(function () {
  async function includeComponent(placeholderId, path) {
    const el = document.getElementById(placeholderId);
    if (!el) return;
    // 배포본은 빌드 때 헤더/푸터가 HTML 에 이미 들어가 있음 (검색엔진·AI 가 메뉴·주소를 읽도록) → 다시 불러오지 않음
    if (el.children.length) return;
    try {
      const res = await fetch(path);
      el.innerHTML = await res.text();
    } catch (e) {
      console.error("컴포넌트를 불러오지 못했습니다:", path, e);
    }
  }

  // 현재 페이지에 해당하는 1뎁스/2뎁스 메뉴에 active 표시
  function markActiveMenu() {
    const current = location.pathname.replace(/\/index\.html$/, "/");
    document.querySelectorAll(".gnb-menu > li").forEach((li) => {
      const top = li.querySelector(":scope > a");
      const links = li.querySelectorAll("a");
      let hit = false;
      links.forEach((a) => {
        const href = (a.getAttribute("href") || "").replace(/\/index\.html$/, "/");
        if (href && href !== "/" && current.startsWith(href.replace(/[^/]*$/, "")) && current === href) {
          a.closest("li").classList.add("active");
          hit = true;
        }
      });
      // 같은 카테고리 폴더면 1뎁스 active
      if (top) {
        const folder = (top.getAttribute("href") || "").replace(/[^/]*$/, "");
        if (folder && folder !== "/" && current.startsWith(folder)) hit = true;
      }
      if (hit) li.classList.add("active");
    });
  }

  function setupMobileMenu() {
    const header = document.getElementById("site-header");
    const toggle = document.getElementById("gnbToggle");
    if (!toggle || !header) return;

    toggle.addEventListener("click", () => {
      header.classList.toggle("is-open");
      document.body.style.overflow = header.classList.contains("is-open") ? "hidden" : "";
    });

    document.querySelectorAll(".gnb-menu > li").forEach((li) => {
      if (li.querySelector(".gnb-submenu")) li.classList.add("has-sub");
    });

    // 모바일: 1뎁스 클릭 시 2뎁스 아코디언 (데스크톱은 CSS hover)
    document.querySelectorAll(".gnb-menu > li.has-sub > a").forEach((a) => {
      a.addEventListener("click", (e) => {
        const isMobile = window.matchMedia("(max-width: 1024px)").matches;
        if (isMobile) {
          e.preventDefault();
          const li = a.parentElement;
          const open = li.classList.contains("is-expanded");
          document.querySelectorAll(".gnb-menu > li.is-expanded").forEach((x) => x.classList.remove("is-expanded"));
          if (!open) li.classList.add("is-expanded");
        }
      });
    });
  }

  // 서브페이지 2뎁스 탭: 현재 페이지 표시
  function markActiveTab() {
    const current = location.pathname.replace(/\/index\.html$/, "/");
    document.querySelectorAll(".sub-tabs a").forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/index\.html$/, "/");
      if (href === current) a.parentElement.classList.add("active");
    });
  }

  // 맨 위로 버튼
  function setupTopButton() {
    const btn = document.querySelector(".floating .f-top");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await includeComponent("site-header-placeholder", "/components/header.html");
    await includeComponent("site-footer-placeholder", "/components/footer.html");
    markActiveMenu();
    setupMobileMenu();
    markActiveTab();
    setupTopButton();
  });
})();
