export function initAdmin() {
  const queue = document.querySelector("#adminQueue");
  if (!queue) return;
  queue.innerHTML = [
    ["Verificar empresa", "TecnoCircular solicita modulo Reutiliza", "Pendiente"],
    ["Verificar institucion", "Universidad solicita convocatorias gratuitas en Recicla", "En revision"],
    ["Reporte de spam", "Publicacion con adelanto sospechoso", "Alta prioridad"],
    ["Publicacion sospechosa", "Lote de celulares sin fotos suficientes", "Pendiente"]
  ].map(([tipo, detalle, estado]) => `<article class="card admin-alert">
    <span class="tag">${estado}</span>
    <h3>${tipo}</h3>
    <p>${detalle}</p>
    <button class="btn">Aprobar</button>
    <button class="btn ghost">Bloquear / reducir reputacion</button>
  </article>`).join("");
}
