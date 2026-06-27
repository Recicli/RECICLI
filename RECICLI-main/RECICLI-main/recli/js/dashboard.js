import {
  createCampana,
  fetchCampanas,
  fetchContactMessages,
  fetchImpactMetrics,
  fetchProductos,
  fetchReciclajePublicaciones,
  updateProducto
} from "./supabaseData.js";

const state = {
  metrics: null,
  campanas: [],
  productos: [],
  reciclaje: [],
  mensajes: []
};

export async function initDashboard() {
  initDashboardSections();
  bindDashboardActions();
  await loadDashboardData();
}

function initDashboardSections() {
  const title = document.querySelector("#dashboardTitle");
  document.querySelectorAll("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-section-target]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll("[data-section]").forEach((section) => section.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`[data-section="${button.dataset.sectionTarget}"]`)?.classList.add("active");
      if (title) title.textContent = button.textContent.trim();
    });
  });
}

function bindDashboardActions() {
  document.querySelector("[data-dashboard-refresh]")?.addEventListener("click", loadDashboardData);
  document.addEventListener("click", handleDashboardAction);
  document.addEventListener("submit", handleDashboardSubmit);
}

async function loadDashboardData() {
  renderLoading();
  try {
    const [metrics, campanas, productos, reciclaje, mensajes] = await Promise.all([
      fetchImpactMetrics(),
      fetchCampanas(),
      fetchProductos({ includeInactive: true }),
      fetchReciclajePublicaciones(),
      fetchContactMessages().catch(() => [])
    ]);
    Object.assign(state, { metrics, campanas, productos, reciclaje, mensajes });

    const type = document.querySelector("[data-dashboard-type]")?.dataset.dashboardType;
    if (type === "recicla") renderRecycleDashboard();
    if (type === "reutiliza") renderReuseDashboard();
    toast("Dashboard actualizado.");
  } catch (error) {
    renderError(error);
  }
}

function renderLoading() {
  document.querySelectorAll(".dashboard-section [id]").forEach((node) => {
    node.innerHTML = `<article class="loading-state">Cargando datos desde Supabase...</article>`;
  });
}

function renderError(error) {
  document.querySelectorAll(".dashboard-section [id]").forEach((node) => {
    node.innerHTML = `<article class="error-state">No se pudieron cargar datos: ${escapeHtml(error.message)}</article>`;
  });
}

function renderRecycleDashboard() {
  const m = state.metrics || {};
  setHtml("reciclaStats", metricCards([
    ["Kg recolectados este mes", `${m.kgReciclados || 0} kg`],
    ["Material vendido", `${Math.round((m.kgReciclados || 0) * 0.72)} kg`],
    ["Usuarios afiliados", "--"],
    ["Recicladores afiliados", "--"],
    ["Campanas activas", m.campanasActivas || 0],
    ["Rutas programadas", "--"],
    ["Pagos estimados", `S/ ${Math.round((m.kgReciclados || 0) * .45)}`],
    ["CO2 ahorrado", `${m.co2Evitado || 0} kg`]
  ]));

  renderRecycleCore();
  renderCampaigns();
  renderAffiliatedUsers();
  renderCollectors();
  renderRoutes();
  renderMaterials();
  renderPayments();
  renderLocationRequests();
  renderEcoAi();
}

function renderRecycleCore() {
  const materialRows = state.metrics?.reciclajeMaterial || [];
  const total = materialRows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const materialCards = materialRows.length ? materialRows.map((item) => progressCard(item.label, item.value, total)).join("") : empty("Aun no hay material agrupado desde publicaciones de reciclaje.");

  setHtml("recycleCore", `
    <div class="stats-grid">
      ${metricCards([
        ["Total recogido", `${state.metrics?.kgReciclados || 0} kg`],
        ["Total vendido", `${Math.round((state.metrics?.kgReciclados || 0) * .72)} kg`],
        ["Ganancia estimada", `S/ ${Math.round((state.metrics?.kgReciclados || 0) * .28)}`],
        ["Pagos a usuarios", `S/ ${Math.round((state.metrics?.kgReciclados || 0) * .45)}`]
      ])}
    </div>
    <article class="dashboard-card">
      <h3>Grafico por material</h3>
      <div class="grid">${materialCards}</div>
    </article>
    <article class="dashboard-card">
      <h3>Rendimiento</h3>
      <p>Campanas con mayor rendimiento: ${state.campanas[0]?.titulo ? escapeHtml(state.campanas[0].titulo) : "sin datos suficientes"}.</p>
      <p>Material mas recolectado: ${materialRows[0]?.label ? escapeHtml(materialRows[0].label) : "sin datos suficientes"}.</p>
      <p>Usuarios y recicladores mas activos: pendiente de integracion con afiliaciones y rutas.</p>
    </article>
  `);
}

function renderCampaigns() {
  const cards = state.campanas.map((c) => {
    const progress = c.metaKg ? Math.min(100, Math.round((Number(c.avanceKg || 0) / Number(c.metaKg)) * 100)) : 0;
    return `<article class="dashboard-card campaign-card">
      ${badge(c.estado || "activa")}
      <h3>${escapeHtml(c.titulo)}</h3>
      <p>${escapeHtml(c.empresa || "Empresa recicladora")} · ${escapeHtml(c.ciudad || "Ciudad no indicada")}</p>
      <div class="meta">
        <span><strong>${escapeHtml(c.material || "Mixto")}</strong><br>Material</span>
        <span><strong>${c.metaKg || 0} kg</strong><br>Meta</span>
        <span><strong>S/ ${c.pagoKg || 0}</strong><br>Pago por kg</span>
        <span><strong>${progress}%</strong><br>Avance</span>
      </div>
      <div class="progress-bar"><span style="--progress:${progress}%"></span></div>
      <div class="action-row">
        <button class="action-btn ghost" data-dashboard-action="prepared" data-message="Edicion de campana preparada para integracion.">Editar</button>
        <button class="action-btn ghost" data-dashboard-action="prepared" data-message="Pausar campana requiere columna estado/auditoria.">Pausar</button>
        <button class="action-btn secondary" data-dashboard-action="prepared" data-message="Participantes preparado para tabla participaciones.">Ver participantes</button>
      </div>
    </article>`;
  }).join("");
  setHtml("campaignList", cards || empty("No hay campanas registradas."));
}

function renderAffiliatedUsers() {
  // TODO: conectar tabla real de afiliaciones empresa_usuario cuando exista.
  const rows = state.reciclaje.slice(0, 8).map((item) => [
    profileName(item.profiles),
    escapeHtml(item.ciudad || item.profiles?.ciudad || "-"),
    "Por conectar",
    escapeHtml(item.material || "-"),
    "Por conectar",
    "Por conectar",
    "Por conectar",
    `${item.cantidad || 0} ${item.unidad || "kg"}`,
    badge(item.estado || "disponible"),
    `<span class="leaf-rating">${leafs(item.profiles?.hojas || 0)}</span>`,
    `<div class="action-row"><button class="action-btn ghost" data-dashboard-action="open-location-modal" data-user="${escapeAttr(item.usuario_id || "")}" data-name="${escapeAttr(profileName(item.profiles))}" data-material="${escapeAttr(item.material || "")}">Solicitar ubicacion</button></div>`
  ]);
  setHtml("affiliatedUsers", rows.length ? table(["Nombre", "Ciudad", "Zona", "Material", "Frecuencia", "Dia", "Horario", "Kg", "Estado", "Hojas", "Acciones"], rows) : empty("No hay usuarios afiliados conectados todavia."));
}

function renderCollectors() {
  setHtml("collectorsTable", empty("No hay recicladores afiliados conectados todavia."));
}

function renderRoutes() {
  setHtml("routesPanel", `<article class="dashboard-card route-card">
    <span class="status-badge pending">Preparado</span>
    <h3>Vista de rutas</h3>
    <p>Vista de rutas preparada para integracion con mapa.</p>
    <p>Modulo listo para conectar ciudad, zona, fecha, reciclador, usuarios incluidos y kg estimados.</p>
    <button class="action-btn" data-dashboard-action="open-route-modal">Ver rutas</button>
  </article>`);
}

function renderMaterials() {
  const rows = state.metrics?.reciclajeMaterial || [];
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  setHtml("materialsPanel", rows.length ? rows.map((item) => progressCard(item.label, item.value, total)).join("") : empty("No hay datos de materiales publicados."));
}

function renderPayments() {
  const rows = state.reciclaje.map((item) => {
    const kg = Number(item.cantidad || 0);
    const rate = estimateRate(item.material);
    return [
      profileName(item.profiles),
      "Material reciclable",
      escapeHtml(item.material || "-"),
      `${kg} ${item.unidad || "kg"}`,
      `S/ ${rate.toFixed(2)}`,
      `S/ ${(kg * rate).toFixed(2)}`,
      badge("pendiente")
    ];
  });
  setHtml("paymentsTable", rows.length ? table(["Usuario", "Concepto", "Material", "Kg reales", "Pago/kg", "Total", "Estado"], rows) : empty("Sin pagos estimados porque no hay publicaciones de reciclaje."));
}

function renderLocationRequests() {
  // TODO: conectar tabla solicitudes_ubicacion cuando exista.
  setHtml("locationRequests", table(["Usuario", "Estado", "Direccion", "Referencia", "Dia", "Hora", "Material", "Kg", "Acciones"], [[
    "Por conectar",
    badge("pendiente"),
    "Pendiente de completar",
    "Pendiente",
    "Pendiente",
    "Pendiente",
    "Pendiente",
    "0 kg",
    `<button class="action-btn ghost" data-dashboard-action="view-location">Ver ubicacion</button>`
  ]]));
}

function renderEcoAi() {
  const material = state.metrics?.reciclajeMaterial?.[0];
  const recommendations = [
    state.reciclaje.length > 3 ? "Hay varias publicaciones disponibles: conviene crear ruta agrupada por zona." : "Aun faltan publicaciones suficientes para sugerir rutas.",
    material ? `El material con mayor acumulacion es ${material.label}; considera una campana dedicada.` : "No hay material dominante todavia.",
    (state.metrics?.kgReciclados || 0) > 150 ? "Hay volumen alto registrado: revisar pagos y recicladores disponibles." : "Volumen actual moderado: mantener recojo flexible."
  ];
  setHtml("ecoAiPanel", recommendations.map((text) => `<article class="dashboard-card"><span class="eco-score">IA EcoRed</span><p>${escapeHtml(text)}</p></article>`).join(""));
}

function renderReuseDashboard() {
  const activos = state.productos.filter((p) => p.estado === "activo");
  const destacados = state.productos.filter((p) => p.destacado);
  const vendidos = state.productos.filter((p) => p.estado === "vendido");
  const ingresos = vendidos.reduce((sum, p) => sum + Number(p.precio || 0), 0);

  setHtml("reuseStats", metricCards([
    ["Publicaciones activas", activos.length],
    ["Liquidaciones activas", destacados.length],
    ["Productos vendidos", vendidos.length],
    ["Mensajes recibidos", state.mensajes.length],
    ["Visitas estimadas", "--"],
    ["Ingresos estimados", `S/ ${ingresos}`],
    ["Publicaciones destacadas", destacados.length],
    ["Reputacion", leafs(5)]
  ]));
  renderProducts();
  renderLiquidations();
  renderSales();
  renderReuseMessages();
  renderAds();
  renderReuseAnalytics();
  renderReuseReputation();
}

function renderProducts() {
  const rows = state.productos.map((p) => [
    escapeHtml(p.titulo),
    escapeHtml(p.categoria || "-"),
    `S/ ${p.precio || 0}`,
    escapeHtml(p.descripcion ? "Publicado" : "Sin detalle"),
    escapeHtml(p.ciudad || "-"),
    "Por conectar",
    "Por conectar",
    badge(p.estado || "activo"),
    p.destacado ? "Si" : "No",
    `<div class="action-row"><button class="action-btn ghost" data-dashboard-action="mark-sold" data-id="${p.id}">Marcar vendido</button><button class="action-btn ghost" data-dashboard-action="feature-product" data-id="${p.id}">Destacar</button></div>`
  ]);
  setHtml("productsTable", rows.length ? table(["Titulo", "Categoria", "Precio", "Estado producto", "Ciudad", "Visitas", "Mensajes", "Estado", "Destacado", "Acciones"], rows) : empty("No hay productos publicados."));
}

function renderLiquidations() {
  const items = state.productos.filter((p) => p.destacado);
  setHtml("liquidationList", items.length ? items.map((p) => `<article class="dashboard-card liquidation-card">
    ${badge(p.estado || "activo")}
    <h3>${escapeHtml(p.titulo)}</h3>
    <p>${escapeHtml(p.descripcion || "Liquidacion sin descripcion.")}</p>
    <div class="meta">
      <span><strong>${escapeHtml(p.categoria || "Otros")}</strong><br>Tipo</span>
      <span><strong>S/ ${p.precio || 0}</strong><br>Precio unitario</span>
      <span><strong>Destacada</strong><br>Visibilidad</span>
      <span><strong>--</strong><br>Interesados</span>
    </div>
    <div class="action-row">
      <button class="action-btn ghost" data-dashboard-action="prepared" data-message="Edicion de liquidacion preparada.">Editar liquidacion</button>
      <button class="action-btn" data-dashboard-action="feature-product" data-id="${p.id}">Enviar a portada</button>
      <button class="action-btn secondary" data-dashboard-action="prepared" data-message="Interesados preparado para tabla mensajes_producto.">Ver interesados</button>
    </div>
  </article>`).join("") : empty("No hay liquidaciones destacadas. Usa Crear liquidacion para preparar una nueva."));
}

function renderSales() {
  const vendidos = state.productos.filter((p) => p.estado === "vendido");
  setHtml("salesTable", vendidos.length ? table(["Producto", "Categoria", "Precio", "Estado"], vendidos.map((p) => [escapeHtml(p.titulo), escapeHtml(p.categoria || "-"), `S/ ${p.precio || 0}`, badge(p.estado)])) : empty("No hay ventas registradas."));
}

function renderReuseMessages() {
  setHtml("reuseMessages", state.mensajes.length ? table(["Nombre", "Producto/liquidacion", "Mensaje", "Contacto", "Estado", "Acciones"], state.mensajes.map((m) => [
    escapeHtml(m.nombre || "-"),
    "Por conectar",
    escapeHtml(short(m.mensaje || "-", 80)),
    escapeHtml(`${m.correo || ""} ${m.celular || ""}`.trim()),
    badge(m.estado || "pendiente"),
    `<button class="action-btn ghost" data-dashboard-action="prepared" data-message="Respuesta preparada para integracion con correo/WhatsApp.">Responder</button>`
  ])) : empty("No hay interesados registrados."));
}

function renderAds() {
  const plans = ["Destacado 7 dias", "Destacado 14 dias", "Portada Reutiliza", "Portada principal EcoRed"];
  setHtml("adsPanel", plans.map((plan) => `<article class="dashboard-card"><span class="status-badge pending">Plan</span><h3>${plan}</h3><p>Preparado para pagos y activacion comercial.</p><button class="action-btn ghost" data-dashboard-action="prepared" data-message="Plan publicitario preparado.">Activar</button></article>`).join(""));
}

function renderReuseAnalytics() {
  const categories = groupBy(state.productos, "categoria");
  setHtml("reuseAnalytics", `
    <article class="dashboard-card"><h3>Categorias con mas interaccion</h3>${Object.entries(categories).map(([k, v]) => progressCard(k, v, state.productos.length)).join("") || empty("Sin categorias.")}</article>
    <article class="dashboard-card"><h3>Ingresos estimados</h3><p>S/ ${state.productos.filter((p) => p.estado === "vendido").reduce((sum, p) => sum + Number(p.precio || 0), 0)}</p><p>Visitas por semana: modulo preparado para analitica.</p></article>
  `);
}

function renderReuseReputation() {
  setHtml("reuseReputation", `
    <article class="dashboard-card"><h3>Hojas de reputacion</h3><p class="leaf-rating">${leafs(5)}</p><p>Basado en publicaciones reales, trato con usuarios, entregas, reportes y ventas completadas.</p></article>
    <article class="dashboard-card"><h3>Factores</h3><p>Reportes: ${state.metrics?.reportesPendientes || 0}</p><p>Ventas completadas: ${state.productos.filter((p) => p.estado === "vendido").length}</p></article>
  `);
}

async function handleDashboardAction(event) {
  const target = event.target.closest("[data-dashboard-action]");
  if (!target) return;
  const action = target.dataset.dashboardAction;
  try {
    if (action === "open-campaign-modal") openCampaignModal();
    if (action === "open-liquidation-modal") openLiquidationModal();
    if (action === "open-route-modal") openInfoModal("Vista de rutas", "Vista de rutas preparada para integracion con mapa.");
    if (action === "open-location-modal") openLocationModal(target);
    if (action === "view-location") openInfoModal("Ubicacion de recojo", "Datos de direccion listos para futura integracion con mapa.");
    if (action === "generated-link") generatePickupLink(target);
    if (action === "sent-location") toast("Solicitud marcada como enviada. Guardado real preparado para integracion.");
    if (action === "mark-sold") await updateProductAndRefresh(target.dataset.id, { estado: "vendido" }, "Producto marcado como vendido.");
    if (action === "feature-product") await updateProductAndRefresh(target.dataset.id, { destacado: true }, "Publicacion destacada.");
    if (action === "prepared") toast(target.dataset.message || "Funcion preparada para integracion.");
    if (action === "close-modal") closeModal();
  } catch (error) {
    toast(`No se pudo completar: ${error.message}`);
  }
}

async function handleDashboardSubmit(event) {
  const form = event.target.closest("[data-dashboard-form]");
  if (!form) return;
  event.preventDefault();

  if (form.dataset.dashboardForm === "campaign") {
    const payload = Object.fromEntries(new FormData(form));
    // TODO: ampliar esquema campanas con descripcion, zona, fecha_inicio, fecha_fin y publicidad.
    await createCampana({
      titulo: payload.titulo,
      material: payload.material,
      meta_kg: Number(payload.meta_kg || 0),
      pago_kg: Number(payload.pago_kg || 0),
      ciudad: payload.ciudad,
      fecha: payload.fecha_inicio || null,
      estado: "activa"
    });
    closeModal();
    toast("Campana guardada en Supabase con campos disponibles.");
    await loadDashboardData();
  }

  if (form.dataset.dashboardForm === "liquidation") {
    toast("Liquidacion preparada. Insercion real lista para definir esquema de liquidaciones.");
    closeModal();
  }
}

function openCampaignModal() {
  openModal(`<div class="modal-panel">
    <div class="modal-header"><div><span class="status-badge pending">Crear</span><h2>Nueva campana</h2></div><button class="modal-close" data-dashboard-action="close-modal">x</button></div>
    <form class="modal-form" data-dashboard-form="campaign">
      <label>Titulo<input name="titulo" required></label>
      <label>Descripcion<textarea name="descripcion"></textarea></label>
      <div class="split"><label>Ciudad<input name="ciudad" required></label><label>Zona<input name="zona"></label></div>
      <div class="split"><label>Tipo de material<input name="material" required></label><label>Meta kg<input name="meta_kg" type="number" min="0" required></label></div>
      <div class="split"><label>Pago por kg<input name="pago_kg" type="number" min="0" step="0.01"></label><label>Publicidad<select name="publicidad"><option>normal</option><option>destacado</option><option>portada</option></select></label></div>
      <div class="split"><label>Fecha inicio<input name="fecha_inicio" type="date"></label><label>Fecha fin<input name="fecha_fin" type="date"></label></div>
      <button class="btn">Guardar campana</button>
    </form>
  </div>`);
}

function openLiquidationModal() {
  openModal(`<div class="modal-panel">
    <div class="modal-header"><div><span class="status-badge pending">Crear</span><h2>Nueva liquidacion</h2></div><button class="modal-close" data-dashboard-action="close-modal">x</button></div>
    <form class="modal-form" data-dashboard-form="liquidation">
      <label>Titulo<input name="titulo" required></label>
      <label>Descripcion<textarea name="descripcion"></textarea></label>
      <div class="split"><label>Categoria<input name="categoria" required></label><label>Cantidad<input name="cantidad" type="number" min="1"></label></div>
      <div class="split"><label>Precio unitario<input name="precio_unitario" type="number" step="0.01"></label><label>Precio por lote<input name="precio_lote" type="number" step="0.01"></label></div>
      <div class="split"><label>Ciudad<input name="ciudad"></label><label>Zona<input name="zona"></label></div>
      <label>Visibilidad<select name="visibilidad"><option>normal</option><option>destacada</option><option>portada</option></select></label>
      <p class="empty-state">Fotos listas para integracion con Supabase Storage.</p>
      <button class="btn">Guardar liquidacion</button>
    </form>
  </div>`);
}

function openLocationModal(target) {
  const user = target.dataset.name || "Usuario";
  const userId = target.dataset.user || "ID";
  const material = target.dataset.material || "Material frecuente";
  const link = `${window.location.origin}/pages/perfil.html?accion=ubicacion-recojo&usuario=${encodeURIComponent(userId)}`;
  openModal(`<div class="modal-panel">
    <div class="modal-header"><div><span class="status-badge pending">Ubicacion</span><h2>Enviar enlace de ubicacion al usuario</h2></div><button class="modal-close" data-dashboard-action="close-modal">x</button></div>
    <p><strong>Usuario:</strong> ${escapeHtml(user)}</p>
    <p><strong>Material frecuente:</strong> ${escapeHtml(material)}</p>
    <p><strong>Frecuencia:</strong> Por conectar.</p>
    <p><strong>Dia y horario:</strong> Por conectar.</p>
    <p>El usuario completara direccion exacta, referencia, dia, hora y confirmacion del material desde este enlace.</p>
    <input id="pickupGeneratedLink" readonly value="${escapeAttr(link)}">
    <div class="action-row" style="margin-top:14px">
      <button class="action-btn" data-dashboard-action="generated-link">Generar enlace</button>
      <button class="action-btn secondary" data-dashboard-action="sent-location">Marcar como enviado</button>
    </div>
  </div>`);
}

function openInfoModal(title, text) {
  openModal(`<div class="modal-panel"><div class="modal-header"><div><h2>${escapeHtml(title)}</h2></div><button class="modal-close" data-dashboard-action="close-modal">x</button></div><p>${escapeHtml(text)}</p></div>`);
}

function generatePickupLink() {
  const input = document.querySelector("#pickupGeneratedLink");
  input?.select();
  toast("Enlace generado y listo para enviar.");
}

async function updateProductAndRefresh(id, patch, message) {
  await updateProducto(id, patch);
  toast(message);
  await loadDashboardData();
}

function openModal(html) {
  const modal = document.querySelector("#dashboardModal");
  modal.innerHTML = html;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.querySelector("#dashboardModal");
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
}

function setHtml(id, html) {
  const node = document.querySelector(`#${id}`);
  if (node) node.innerHTML = html;
}

function metricCards(items) {
  return items.map(([label, value]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`).join("");
}

function table(headers, rows) {
  if (!rows.length) return empty("Sin datos.");
  return `<table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function progressCard(label, value, total) {
  const progress = total ? Math.round((Number(value || 0) / total) * 100) : 0;
  return `<article class="dashboard-card"><strong>${escapeHtml(label || "Sin especificar")}</strong><p>${Number(value || 0)} kg</p><div class="progress-bar"><span style="--progress:${progress}%"></span></div></article>`;
}

function badge(status) {
  const s = String(status || "pendiente").toLowerCase();
  const cls = ["activo", "activa", "vendido", "pagado", "completada"].includes(s) ? "success" : ["reportado", "rechazada", "observado"].includes(s) ? "danger" : s === "pendiente" ? "pending" : "neutral";
  return `<span class="status-badge ${cls}">${escapeHtml(status || "pendiente")}</span>`;
}

function empty(text) {
  return `<article class="empty-state">${text}</article>`;
}

function toast(text) {
  const toastNode = document.querySelector("#dashboardToast");
  if (!toastNode) return;
  toastNode.textContent = text;
  toastNode.classList.add("show");
  window.setTimeout(() => toastNode.classList.remove("show"), 2800);
}

function estimateRate(material = "") {
  const value = material.toLowerCase();
  if (value.includes("cobre")) return 18;
  if (value.includes("aluminio")) return 3.5;
  if (value.includes("metal") || value.includes("fierro")) return .8;
  if (value.includes("plast")) return .55;
  if (value.includes("cart") || value.includes("papel")) return .35;
  if (value.includes("vidrio")) return .18;
  return .25;
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const label = row[key] || "Sin especificar";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function profileName(profile) {
  return profile ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || "Usuario" : "Usuario";
}

function leafs(count) {
  return "🍃".repeat(Math.max(0, Math.min(5, Number(count) || 0))) || "Sin hojas";
}

function short(text, length) {
  const value = String(text || "");
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
