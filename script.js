const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const siteHeader = document.querySelector(".site-header");
const pageSections = [...document.querySelectorAll("main > .section")];
const revealItems = [...document.querySelectorAll("[data-reveal]")];
const revealGroups = [...document.querySelectorAll("[data-reveal-group]")];
const navLinks = document.querySelectorAll(".site-nav a");
const sections = [...document.querySelectorAll("section[id]")].filter(
  (section) => [...navLinks].some((link) => link.getAttribute("href") === `#${section.id}`)
);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const themeColors = {
  light: "#fcf8fd",
  dark: "#080611",
};

function getStoredTheme() {
  try {
    return localStorage.getItem("portfolio-theme");
  } catch (error) {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem("portfolio-theme", theme);
  } catch (error) {
    // Ignore storage errors so theme switching still works for the current session.
  }
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  storeTheme(theme);
  themeMeta?.setAttribute("content", themeColors[theme]);
  themeToggle?.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggle?.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

applyTheme(root.dataset.theme || getStoredTheme() || "light");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function setActiveNav(sectionId) {
  navLinks.forEach((link) => {
    const match = link.getAttribute("href") === `#${sectionId}`;
    link.classList.toggle("is-active", match);

    if (match) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setRevealDelays() {
  revealGroups.forEach((group) => {
    const groupedItems = [...group.querySelectorAll("[data-reveal]")].filter(
      (item) => item.closest("[data-reveal-group]") === group
    );

    groupedItems.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${Math.min(index * 90, 360)}ms`);
    });
  });
}

function revealAll() {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

setRevealDelays();

function initRevealObserver() {
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

function initSectionObserver() {
  if (!sections.length) {
    return;
  }

  let ticking = false;

  const syncActiveSection = () => {
    const headerOffset = (siteHeader?.offsetHeight || 0) + 56;
    const anchorLine = window.scrollY + headerOffset;
    let activeSectionId = sections[0].id;

    sections.forEach((section) => {
      if (anchorLine >= section.offsetTop) {
        activeSectionId = section.id;
      }
    });

    setActiveNav(activeSectionId);
    ticking = false;
  };

  const requestSync = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(syncActiveSection);
  };

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  syncActiveSection();
}

function initSectionFocus() {
  if (!pageSections.length || prefersReducedMotion.matches) {
    pageSections.forEach((section) => {
      section.style.setProperty("--section-opacity", "1");
      section.style.setProperty("--section-scale", "1");
      section.style.setProperty("--section-blur", "0px");
    });
    return;
  }

  let ticking = false;

  const syncSectionFocus = () => {
    const viewportHeight = window.innerHeight || 1;
    const anchorLine = viewportHeight * 0.42;
    const rects = pageSections.map((section) => section.getBoundingClientRect());
    let activeIndex = 0;

    rects.forEach((rect, index) => {
      if (rect.top <= anchorLine) {
        activeIndex = index;
      }
    });

    const nextIndex = Math.min(activeIndex + 1, pageSections.length - 1);
    const nextRect = rects[nextIndex];
    const transitionDistance = viewportHeight * 0.72;
    const progressToNext =
      nextIndex === activeIndex
        ? 0
        : Math.max(0, Math.min(1, 1 - (nextRect.top - anchorLine) / transitionDistance));

    pageSections.forEach((section, index) => {
      let influence = 0;

      if (index === activeIndex) {
        influence = 1 - progressToNext * 0.66;
      } else if (index === nextIndex && nextIndex !== activeIndex) {
        influence = 0.34 + progressToNext * 0.66;
      } else {
        influence = 0.34;
      }

      const blur = (1 - influence) * 2.2;
      const scale = 0.992 + (influence - 0.34) / 0.66 * 0.008;

      section.style.setProperty("--section-opacity", influence.toFixed(3));
      section.style.setProperty("--section-scale", Math.max(0.992, scale).toFixed(4));
      section.style.setProperty("--section-blur", `${blur.toFixed(2)}px`);
    });

    ticking = false;
  };

  const requestSync = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(syncSectionFocus);
  };

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  syncSectionFocus();
}

const initialSectionId = window.location.hash.replace("#", "");
const hasMatchingNav = [...navLinks].some((link) => link.getAttribute("href") === `#${initialSectionId}`);
setActiveNav(hasMatchingNav ? initialSectionId : "about");

function resetToHero() {
  if (window.location.hash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

window.addEventListener("load", () => {
  window.requestAnimationFrame(() => {
    resetToHero();
  });
});

window.addEventListener("pageshow", () => {
  window.requestAnimationFrame(() => {
    resetToHero();
  });
});

initRevealObserver();
initSectionObserver();
initSectionFocus();
