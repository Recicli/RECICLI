import { money, progressPercent, hojas } from "./script.js";
import { fetchCampanas, fetchEmpresas, fetchProductos } from "./supabaseData.js";

export async function renderRecicla() {
  const campaigns = document.querySelector("#campanasReciclaje");
  const companies = document.querySelector("#empresasRecicla");

  if (campaigns) {
    campaigns.innerHTML = loadingCard("Cargando campanas desde Supabase...");
    try {
      const campanas = await fetchCampanas();
      campaigns.innerHTML = campanas.length ? campanas.map(renderCampana).join("") : emptyCard("Aun no hay campanas activas registradas.");
    } catch (error) {
      campaigns.innerHTML = emptyCard(`No se pudieron cargar campanas: ${error.message}`);
    }
  }

  if (companies) {
    companies.innerHTML = loadingCard("Cargando empresas recicladoras...");
    try {
      const empresas = await fetchEmpresas("recicla");
      companies.innerHTML = empresas.length ? empresas.map((e) => `
        <article class="card">
          <h3>${e.nombre_empresa}</h3>
          <p>${e.verificada ? "Empresa verificada" : "Empresa pendiente de verificacion"}</p>
          <p>${hojas(e.profiles?.hojas || 0)}</p>
          <button class="btn secondary">Afiliarme</button>
        </article>`).join("") : emptyCard("Aun no hay empresas recicladoras registradas.");
    } catch (error) {
      companies.innerHTML = emptyCard(`No se pudieron cargar empresas: ${error.message}`);
    }
  }
}

export async function renderReutiliza() {
  const products = document.querySelector("#productosReutiliza");
  const liquid = document.querySelector("#liquidaciones");
  const cats = document.querySelector("#categorias");

  if (cats) {
    cats.innerHTML = ["Muebles", "Electrodomesticos", "Computadoras", "Celulares", "Herramientas", "Oficina", "Ropa", "Otros"]
      .map((cat) => `<button class="btn secondary" data-filter="${cat}">${cat}</button>`).join("");
  }

  if (products) {
    products.innerHTML = loadingCard("Cargando productos desde Supabase...");
    try {
      const productos = await fetchProductos();
      products.innerHTML = productos.length ? productos.map(renderProducto).join("") : emptyCard("Aun no hay productos publicados.");
      bindProductFilters(productos);
    } catch (error) {
      products.innerHTML = emptyCard(`No se pudieron cargar productos: ${error.message}`);
    }
  }

  if (liquid) {
    liquid.innerHTML = loadingCard("Cargando productos destacados...");
    try {
      const destacados = await fetchProductos({ destacado: true });
      liquid.innerHTML = destacados.length ? destacados.map(renderProductoDestacado).join("") : emptyCard("Aun no hay productos destacados o liquidaciones registradas.");
    } catch (error) {
      liquid.innerHTML = emptyCard(`No se pudieron cargar destacados: ${error.message}`);
    }
  }
}

function renderCampana(c) {
  const pct = c.metaKg ? progressPercent(c.avanceKg, c.metaKg) : 0;
  return `<article class="card">
    <img class="card-media" src="${c.imagen}" alt="${c.titulo}">
    <span class="tag">${c.material || "Material"}</span>
    <h3>${c.titulo}</h3>
    <p>${c.empresa} ${c.ciudad ? `- ${c.ciudad}` : ""}</p>
    <div class="progress" style="--value:${pct}%"><span></span></div>
    <p><strong>${c.avanceKg} kg</strong> de ${c.metaKg} kg - Pago: ${money(c.pagoKg)} por kg</p>
    <button class="btn">Participar</button>
  </article>`;
}

function renderProducto(p) {
  return `<article class="card social-product-card ${p.destacado ? "promoted" : ""}">
    <div class="social-card-head">
      <div class="avatar mini-avatar">${initials(p.vendedor || "EcoRed")}</div>
      <div>
        <strong>${escapeHtml(p.vendedor || "Usuario EcoRed")}</strong>
        <span>${escapeHtml(locationText(p))} · ${p.local ? "Guardado local" : "Publicado"}</span>
      </div>
    </div>
    <img class="card-media social-card-media" src="${escapeAttr(p.imagen)}" alt="${escapeAttr(p.titulo)}">
    <div class="social-card-body">
      <div>
        <span class="tag">${escapeHtml(p.categoria)}</span>
        <h3>${escapeHtml(p.titulo)}</h3>
      </div>
      <strong class="social-price">${money(p.precio)}</strong>
    </div>
    ${p.descripcion ? `<p>${escapeHtml(p.descripcion)}</p>` : ""}
    <div class="publication-meta">
      ${p.estadoProducto ? `<span>${escapeHtml(p.estadoProducto)}</span>` : ""}
      ${p.pesoKg ? `<span>${Number(p.pesoKg).toFixed(1)} kg</span>` : ""}
      ${p.metodoEntrega ? `<span>${escapeHtml(p.metodoEntrega)}</span>` : ""}
      ${p.metodoPago ? `<span>${escapeHtml(p.metodoPago)}</span>` : ""}
    </div>
    <div class="social-actions">
      <button class="action-btn ghost" type="button" aria-label="Reaccionar">👍</button>
      <button class="action-btn ghost" type="button">💬 Consultar</button>
      <button class="btn small" type="button">Ver producto</button>
    </div>
  </article>`;
}

function renderProductoDestacado(p) {
  return `<article class="card promoted social-product-card">
    <div class="social-card-head">
      <div class="avatar mini-avatar">${initials(p.vendedor || "EcoRed")}</div>
      <div><strong>${escapeHtml(p.vendedor || "Empresa EcoRed")}</strong><span>Liquidacion destacada</span></div>
    </div>
    <img class="card-media social-card-media" src="${escapeAttr(p.imagen)}" alt="${escapeAttr(p.titulo)}">
    <span class="tag">Destacado</span>
    <h3>${escapeHtml(p.titulo)}</h3>
    <p>${escapeHtml(p.categoria)} - ${escapeHtml(p.ciudad || "Ciudad no indicada")}</p>
    <p>${money(p.precio)}</p>
    <button class="btn yellow">Ver publicacion</button>
  </article>`;
}

function loadingCard(text) {
  return `<article class="card"><p>${text}</p></article>`;
}

function emptyCard(text) {
  return `<article class="card"><h3>Sin registros</h3><p>${text}</p></article>`;
}

function bindProductFilters(productos) {
  const products = document.querySelector("#productosReutiliza");
  const cats = document.querySelector("#categorias");
  const search = document.querySelector("input[type='search']");
  if (!products || !cats) return;

  let activeCategory = "";
  const paint = () => {
    const term = (search?.value || "").trim().toLowerCase();
    const filtered = productos.filter((item) => {
      const byCategory = !activeCategory || item.categoria === activeCategory;
      const text = `${item.titulo} ${item.descripcion} ${item.categoria} ${item.ciudad}`.toLowerCase();
      return byCategory && (!term || text.includes(term));
    });
    products.innerHTML = filtered.length ? filtered.map(renderProducto).join("") : emptyCard("No encontramos publicaciones con ese filtro.");
  };

  cats.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeCategory = activeCategory === button.dataset.filter ? "" : button.dataset.filter;
    cats.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("dark", item === button && activeCategory));
    paint();
  });

  search?.addEventListener("input", paint);
}

function initials(name) {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "E";
}

function locationText(item) {
  return [item.ciudad, item.zona].filter(Boolean).join(", ") || "Ciudad no indicada";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value || "../assets/img/product-desk.svg");
}
