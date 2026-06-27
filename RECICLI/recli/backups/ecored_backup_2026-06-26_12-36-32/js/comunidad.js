import { hojas } from "./script.js";

const posts = [
  { autor: "Municipalidad de Amarilis", tipo: "Evento", texto: "Convocatoria gratuita para recoleccion barrial este domingo.", destacado: true, hojas: 5 },
  { autor: "EcoAndes SAC", tipo: "Reciclaje", texto: "Meta semanal: 800 kg de carton. Ya superamos el 60%.", destacado: true, hojas: 5 },
  { autor: "Valeria Torres", tipo: "Logro", texto: "Entregue 18 kg de botellas y subi mi EcoScore.", destacado: false, hojas: 5 },
  { autor: "ONG Agua Viva", tipo: "Anuncio", texto: "Buscamos voluntarios para limpieza del rio Higueras.", destacado: true, hojas: 4 }
];

export function initComunidad() {
  const list = document.querySelector("#communityPosts");
  const form = document.querySelector("#postForm");
  const result = document.querySelector("#gameResult");
  if (list) renderPosts(list);
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    posts.unshift({ autor: "Tu perfil", tipo: form.tipo.value, texto: form.post.value, destacado: false, hojas: 5 });
    renderPosts(list);
    form.reset();
  });
  document.querySelector("#gameOptions")?.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    result.textContent = btn.dataset.answer === "plastico"
      ? "Correcto: botella PET va a plastico. +25 EcoScore"
      : "Casi. La botella PET corresponde a plastico.";
  });
}

function renderPosts(list) {
  list.innerHTML = posts.map((p, index) => `
    <article class="card ${p.destacado ? "promoted" : ""}">
      <span class="tag">${p.tipo}</span>
      <h3>${p.autor}</h3>
      <p>${p.texto}</p>
      <p>${hojas(p.hojas)} · EcoScore visible</p>
      <button class="btn secondary" data-like="${index}">Me gusta</button>
      <button class="btn ghost">Comentar</button>
    </article>`).join("");
}
