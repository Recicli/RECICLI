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
  return `<article class="card ${p.destacado ? "promoted" : ""}">
    <img class="card-media" src="${p.imagen}" alt="${p.titulo}">
    <span class="tag">${p.categoria}</span>
    <h3>${p.titulo}</h3>
    <p>${p.ciudad || "Ciudad no indicada"}</p>
    <p><strong>${money(p.precio)}</strong></p>
    <button class="btn">Ver producto</button>
  </article>`;
}

function renderProductoDestacado(p) {
  return `<article class="card promoted">
    <img class="card-media" src="${p.imagen}" alt="${p.titulo}">
    <span class="tag">Destacado</span>
    <h3>${p.titulo}</h3>
    <p>${p.categoria} - ${p.ciudad || "Ciudad no indicada"}</p>
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
