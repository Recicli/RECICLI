import { campanasReciclaje, productosReutiliza, liquidaciones } from "../data/publicaciones.js";
import { empresas } from "../data/empresas.js";
import { money, progressPercent, hojas } from "./script.js";

export function renderRecicla() {
  const campaigns = document.querySelector("#campanasReciclaje");
  const companies = document.querySelector("#empresasRecicla");
  if (campaigns) {
    campaigns.innerHTML = campanasReciclaje.map((c) => {
      const pct = progressPercent(c.avanceKg, c.metaKg);
      return `<article class="card">
        <img class="card-media" src="${c.imagen}" alt="${c.titulo}">
        <span class="tag">${c.material}</span>
        <h3>${c.titulo}</h3>
        <p>${c.empresa} · ${c.ciudad}</p>
        <div class="progress" style="--value:${pct}%"><span></span></div>
        <p><strong>${c.avanceKg} kg</strong> de ${c.metaKg} kg · Pago: ${money(c.pagoKg)} por kg</p>
        <button class="btn">Participar</button>
      </article>`;
    }).join("");
  }
  if (companies) {
    companies.innerHTML = empresas.filter((e) => e.modulo === "Recicla").map((e) => `
      <article class="card">
        <h3>${e.nombre}</h3>
        <p>${e.ciudad} · Empresa verificada</p>
        <p>${hojas(e.hojas)} · ${e.afiliados} afiliados</p>
        <button class="btn secondary">Afiliarme</button>
      </article>`).join("");
  }
}

export function renderReutiliza() {
  const products = document.querySelector("#productosReutiliza");
  const liquid = document.querySelector("#liquidaciones");
  const cats = document.querySelector("#categorias");
  if (cats) {
    cats.innerHTML = ["Muebles", "Electrodomesticos", "Computadoras", "Celulares", "Herramientas", "Oficina", "Ropa", "Otros"]
      .map((cat) => `<button class="btn secondary" data-filter="${cat}">${cat}</button>`).join("");
  }
  if (products) {
    products.innerHTML = productosReutiliza.map((p) => `
      <article class="card ${p.destacado ? "promoted" : ""}">
        <img class="card-media" src="${p.imagen}" alt="${p.titulo}">
        <span class="tag">${p.categoria}</span>
        <h3>${p.titulo}</h3>
        <p>${p.estado} · ${p.ciudad}</p>
        <p><strong>${money(p.precio)}</strong> · ${p.vendedor} ${p.verificado ? "· Verificado" : ""}</p>
        <button class="btn">Ver producto</button>
      </article>`).join("");
  }
  if (liquid) {
    liquid.innerHTML = liquidaciones.map((l) => `
      <article class="card promoted">
        <img class="card-media" src="${l.imagen}" alt="${l.titulo}">
        <span class="tag">Liquidacion Empresarial</span>
        <h3>${l.titulo}</h3>
        <p>${l.unidades} unidades · ${money(l.precio)} por unidad</p>
        <p>Estado: ${l.estado} · Visibilidad: ${l.visibilidad}</p>
        <button class="btn yellow">Solicitar lote</button>
      </article>`).join("");
  }
}
