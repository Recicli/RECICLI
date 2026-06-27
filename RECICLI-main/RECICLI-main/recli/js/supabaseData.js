import { supabase } from "./supabaseClient.js";

export async function fetchProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(user, extra = {}) {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const existing = await fetchProfile(user.id);
  const payload = {
    id: user.id,
    nombre: extra.nombre || metadata.nombre?.split(" ")[0] || metadata.nombre || "Usuario",
    apellido: extra.apellido || metadata.apellido || "EcoRed",
    email: user.email,
    telefono: extra.telefono || metadata.celular || "",
    ciudad: extra.ciudad || metadata.ciudad || "Huanuco",
    descripcion: extra.descripcion || "Miembro de EcoRed",
    rol: existing?.rol || normalizeRole(extra.rol || metadata.rol || "usuario"),
    ultimo_login: new Date().toISOString()
  };
  const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchEmpresas(modulo = null) {
  let query = supabase.from("empresas").select("*, profiles(nombre, apellido, email, telefono, ciudad, hojas)").order("created_at", { ascending: false });
  if (modulo) query = query.eq("modulo", modulo);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchUserEmpresas(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.from("empresas").select("*").eq("usuario_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchProfiles(filters = {}) {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (filters.rol) query = query.eq("rol", filters.rol);
  if (filters.estado) query = query.eq("estado", filters.estado);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchCampanas() {
  const { data, error } = await supabase.from("campanas").select("*, empresas(nombre_empresa, verificada)").order("fecha", { ascending: true });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    empresa: c.empresas?.nombre_empresa || "Empresa recicladora",
    ciudad: c.ciudad || "",
    material: c.material || "",
    metaKg: Number(c.meta_kg || 0),
    avanceKg: 0,
    pagoKg: Number(c.pago_kg || 0),
    estado: c.estado || "",
    imagen: "../assets/img/campaign-cardboard.svg"
  }));
}

export async function createCampana(campana) {
  const { data, error } = await supabase.from("campanas").insert(campana).select().single();
  if (error) throw error;
  return data;
}

export async function fetchProductos(options = {}) {
  let query = supabase.from("productos").select("*").order("created_at", { ascending: false });
  if (!options.includeInactive) query = query.eq("estado", "activo");
  if (options.destacado !== undefined) query = query.eq("destacado", options.destacado);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    categoria: p.categoria || "Otros",
    precio: Number(p.precio || 0),
    ciudad: p.ciudad || "",
    estado: p.estado || "",
    destacado: Boolean(p.destacado),
    vendedor: "Usuario EcoRed",
    verificado: false,
    imagen: p.imagen || "../assets/img/product-desk.svg",
    descripcion: p.descripcion || ""
  }));
}

export async function updateProducto(id, patch) {
  const { data, error } = await supabase.from("productos").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchReciclajePublicaciones() {
  const { data, error } = await supabase
    .from("publicaciones_reciclaje")
    .select("*, profiles(nombre, apellido, email, ciudad, hojas)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchEventos() {
  const { data, error } = await supabase.from("eventos").select("*, profiles(nombre, apellido, rol)").eq("estado", "activo").order("fecha", { ascending: true });
  if (error) throw error;
  return (data || []).map((e) => ({
    id: e.id,
    titulo: e.titulo || "Evento EcoRed",
    organizador: e.profiles ? `${e.profiles.nombre || ""} ${e.profiles.apellido || ""}`.trim() : "Organizador EcoRed",
    ciudad: e.ciudad || "",
    fecha: e.fecha || "",
    tipo: "Evento ambiental",
    metaKg: 0,
    participantes: 0,
    imagen: "../assets/img/event-river.svg",
    descripcion: e.descripcion || ""
  }));
}

export async function fetchCommunityPosts() {
  const { data, error } = await supabase
    .from("comunidad")
    .select("*, profiles(nombre, apellido, rol, hojas, eco_score)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCommunityPost(userId, contenido, imagen = null) {
  const { data, error } = await supabase.from("comunidad").insert({ usuario_id: userId, contenido, imagen }).select().single();
  if (error) throw error;
  return data;
}

export async function createProducto(userId, producto) {
  const { data, error } = await supabase.from("productos").insert({ usuario_id: userId, ...producto }).select().single();
  if (error) throw error;
  return data;
}

export async function createReciclaje(userId, publicacion) {
  const { data, error } = await supabase.from("publicaciones_reciclaje").insert({ usuario_id: userId, ...publicacion }).select().single();
  if (error) throw error;
  return data;
}

export async function createEmpresa(userId, empresa) {
  const { data, error } = await supabase.from("empresas").insert({ usuario_id: userId, ...empresa }).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmpresaVerification(id, estado, motivo = "") {
  const payload = {
    estado_verificacion: estado,
    verificada: estado === "aprobada",
    motivo_rechazo: estado === "rechazada" ? motivo : null,
    verificado_at: estado === "aprobada" ? new Date().toISOString() : null
  };
  const { data, error } = await supabase.from("empresas").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateProfileState(id, estado) {
  const { data, error } = await supabase.from("profiles").update({ estado }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchReportes() {
  const { data, error } = await supabase.from("reportes").select("*, profiles(nombre, apellido, email)").order("estado", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchContactMessages() {
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateContactMessage(id, patch) {
  const { data, error } = await supabase.from("contact_messages").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function createContactMessage(message) {
  const { data, error } = await supabase.from("contact_messages").insert(message).select().single();
  if (error) throw error;
  return data;
}

export async function fetchImpactMetrics() {
  const [profiles, empresas, campanas, productos, reciclaje, participaciones, eventos, reportes] = await Promise.all([
    countRows("profiles"),
    countRows("empresas", "verificada", true),
    countRows("campanas", "estado", "activa"),
    countRows("productos", "estado", "activo"),
    selectRows("publicaciones_reciclaje", "cantidad, unidad, ciudad, material, estado"),
    selectRows("participaciones", "kilos"),
    countRows("eventos", "estado", "activo"),
    countRows("reportes", "estado", "pendiente")
  ]);

  const kgPublicados = reciclaje.reduce((sum, item) => {
    if ((item.unidad || "kg").toLowerCase() !== "kg") return sum;
    return sum + Number(item.cantidad || 0);
  }, 0);
  const kgParticipaciones = participaciones.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
  const kgReciclados = kgPublicados + kgParticipaciones;

  return {
    kgReciclados,
    productosActivos: productos,
    campanasActivas: campanas,
    usuariosRegistrados: profiles,
    empresasVerificadas: empresas,
    eventosActivos: eventos,
    reportesPendientes: reportes,
    co2Evitado: Math.round(kgReciclados * 0.5),
    rankingCiudades: groupBySum(reciclaje, "ciudad", "cantidad"),
    reciclajeMaterial: groupBySum(reciclaje, "material", "cantidad")
  };
}

async function countRows(table, column = null, value = null) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (column) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function selectRows(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw error;
  return data || [];
}

function groupBySum(rows, key, valueKey) {
  const map = new Map();
  rows.forEach((row) => {
    const label = row[key] || "Sin especificar";
    map.set(label, (map.get(label) || 0) + Number(row[valueKey] || 0));
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function normalizeRole(role) {
  const map = {
    empresa_recicla: "empresa",
    empresa_reutiliza: "empresa",
    usuario: "usuario",
    reciclador: "reciclador",
    municipalidad: "municipalidad",
    universidad: "universidad",
    ong: "ong",
    empresa: "empresa"
  };
  return map[role] || "usuario";
}
