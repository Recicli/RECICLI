import { APP, NAV_LINKS } from "./config.js";

export const isPage = () => location.pathname.includes("/pages/");
export const basePath = () => isPage() ? "../" : "./";
export const pageUrl = (url) => url === "index.html" ? `${basePath()}index.html` : `${basePath()}${url}`;

export function layout(title = "EcoRed") {
  document.title = `${title} | EcoRed`;
  const nav = document.querySelector("[data-nav]");
  const footer = document.querySelector("[data-footer]");
  const chatbot = document.querySelector("[data-chatbot]");
  if (nav) nav.innerHTML = renderNavbar();
  if (footer) footer.innerHTML = renderFooter();
  if (chatbot) chatbot.innerHTML = "";
  bindNavbar();
  hydrateNavbarSession();
  initExternalChatbot();
}

function renderNavbar() {
  const links = NAV_LINKS.map(([label, url]) => `<a href="${pageUrl(url)}">${label}</a>`).join("");
  const hasSession = Boolean(localStorage.getItem(APP.storageUserKey));
  const sessionHref = hasSession ? `${basePath()}pages/perfil.html` : `${basePath()}pages/login.html`;
  const sessionLabel = hasSession ? "Perfil" : "Inicia en Eco";
  return `
    <div class="container nav-inner">
      <a class="brand logo-animated" href="${basePath()}index.html" aria-label="EcoRed inicio">
        <img class="brand-logo" src="${basePath()}assets/logos/ecored-logo-transparent.png" alt="EcoRed">
        <span>EcoRed</span>
      </a>
      <nav class="nav-links" id="navLinks" aria-label="Menu principal">
        <div class="nav-menu-list">${links}</div>
        <div class="mobile-menu-footer">
          <img class="mobile-menu-logo logo-animated" src="${basePath()}assets/logos/ecored-logo-transparent.png" alt="EcoRed">
          <div class="mobile-menu-actions">
            <a class="btn eco-login-cta" href="${sessionHref}">${sessionLabel}</a>
          </div>
          <div class="mobile-socials" aria-label="Redes sociales futuras">
            <span>IG</span><span>FB</span><span>TK</span>
          </div>
        </div>
      </nav>
      <div class="nav-actions">
        <a class="btn eco-login-cta" href="${sessionHref}">${sessionLabel}</a>
        <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </div>`;
}

function renderFooter() {
  return `
    <div class="container footer-grid">
      <div>
        <div class="brand logo-animated"><img class="brand-logo" src="${basePath()}assets/logos/ecored-logo-transparent.png" alt="EcoRed"><span>EcoRed</span></div>
        <p>${APP.slogan}</p>
        <p>Infraestructura digital para organizar reciclaje, reutilizacion y comunidad local.</p>
      </div>
      <div>
        <h3>Modulos</h3>
        <p><a href="${basePath()}pages/explorar.html">Explorar Recicla y Reutiliza</a></p>
        <p><a href="${basePath()}pages/comunidad.html">Comunidad</a></p>
        <p><a href="${basePath()}pages/eventos.html">Eventos</a></p>
      </div>
      <div>
        <h3>Hackaton</h3>
        <p>Huanuco, Peru</p>
        <p>contacto@ecored.pe</p>
        <p>@ecored.circular</p>
      </div>
    </div>`;
}

function shouldLoadExternalChatbot() {
  const path = window.location.pathname.toLowerCase();
  return !path.includes("/pages/login.html") && !path.includes("/pages/registro.html") && !path.includes("/pages/reutiliza.html");
}

function initExternalChatbot() {
  if (!shouldLoadExternalChatbot() || window.__ecoredChatbaseInitialized) return;
  window.__ecoredChatbaseInitialized = true;

  const chatbaseSnippet = `
    (function () {
      if (!window.chatbase || window.chatbase("getState") !== "initialized") {
        window.chatbase = function () {
          if (!window.chatbase.q) {
            window.chatbase.q = [];
          }
          window.chatbase.q.push(arguments);
        };
        window.chatbase = new Proxy(window.chatbase, {
          get: function (target, prop) {
            if (prop === "q") {
              return target.q;
            }
            return function () {
              return target(prop, ...arguments);
            };
          }
        });
      }

      var onLoad = function () {
        var script = document.createElement("script");
        script.src = "https://www.chatbase.co/embed.min.js";
        script.id = "EzPhHmEOcb1AKTcCNYgMv";
        script.domain = "www.chatbase.co";
        document.body.appendChild(script);
      };

      if (document.readyState === "complete") {
        onLoad();
      } else {
        window.addEventListener("load", onLoad, { once: true });
      }
    })();
  `;

  const snippet = document.createElement("script");
  snippet.textContent = chatbaseSnippet;
  document.body.appendChild(snippet);
}

function bindNavbar() {
  const navbar = document.querySelector(".navbar");
  const menu = document.querySelector("#menuToggle");
  const links = document.querySelector("#navLinks");

  menu?.addEventListener("click", () => {
    const isOpen = links?.classList.toggle("open");
    menu.classList.toggle("open", Boolean(isOpen));
    menu.setAttribute("aria-expanded", String(Boolean(isOpen)));
    document.body.classList.toggle("menu-open", Boolean(isOpen));
  });

  links?.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    links.classList.remove("open");
    menu?.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });

  document.querySelectorAll(".logo-animated").forEach((logo) => {
    logo.addEventListener("click", () => {
      logo.classList.remove("logo-pop");
      window.requestAnimationFrame(() => logo.classList.add("logo-pop"));
    });
  });

  const revealTargets = document.querySelectorAll(".section, .card, .metric, .promo-card, .explore-option");
  revealTargets.forEach((item) => item.classList.add("scroll-reveal"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((item) => observer.observe(item));

  window.addEventListener("scroll", () => {
    navbar?.classList.toggle("scrolled", window.scrollY > 20);
  });
}

async function hydrateNavbarSession() {
  if (localStorage.getItem(APP.storageUserKey)) return;

  try {
    const { getSupabaseUser } = await import("./supabaseClient.js");
    const user = await getSupabaseUser();
    if (!user?.email) return;
    localStorage.setItem(APP.storageUserKey, user.email);
    localStorage.setItem(APP.storageRoleKey, user.user_metadata?.rol || "usuario");
    document.querySelectorAll(".eco-login-cta").forEach((link) => {
      link.textContent = "Perfil";
      link.setAttribute("href", `${basePath()}pages/perfil.html`);
    });
  } catch (error) {
    console.warn("No se pudo cargar la sesión de Supabase, pero el layout sigue disponible.", error);
  }
}

export function hojas(count = 5) {
  return `<span class="leaf-score">${"🍃".repeat(count)}</span>`;
}

export function money(value) {
  return `S/ ${Number(value).toLocaleString("es-PE")}`;
}

export function progressPercent(current, total) {
  return Math.min(100, Math.round((current / total) * 100));
}
