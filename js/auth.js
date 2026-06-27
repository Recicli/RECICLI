import { APP, ROLE_LABELS, ROLES } from "./config.js";
import { getSupabaseUser, supabase } from "./supabaseClient.js";
import { createEmpresa, createPickupRequest, fetchProfile, fetchProfileMetrics, fetchUserEmpresas, upsertProfile } from "./supabaseData.js";

export function initLogin() {
  const form = document.querySelector("#loginForm");
  const role = document.querySelector("#loginRole");
  const message = document.querySelector("#loginMessage");
  if (!form) return;

  role.innerHTML = Object.entries({
    [ROLES.USUARIO]: "Usuario normal",
    [ROLES.EMPRESA_RECICLA]: "Empresa Recicla",
    [ROLES.EMPRESA_REUTILIZA]: "Empresa Reutiliza",
    [ROLES.ONG]: "ONG / Municipalidad",
    [ROLES.ADMIN]: "Admin"
  }).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Validando credenciales...";

    const email = form.email.value.trim();
    const password = form.password.value;
    const selectedRole = role.value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      message.textContent = `No se pudo iniciar sesion: ${error.message}`;
      return;
    }

    try {
      let profile = await fetchProfile(data.user.id);

      if (selectedRole === ROLES.ADMIN) {
        if (profile?.rol !== ROLES.ADMIN) {
          await supabase.auth.signOut();
          localStorage.removeItem(APP.storageUserKey);
          localStorage.removeItem(APP.storageRoleKey);
          message.textContent = "Este correo no esta autorizado como administrador.";
          return;
        }
      } else if (!profile) {
        profile = await upsertProfile(data.user);
      }

      const actualRole = profile?.rol || ROLES.USUARIO;
      if (selectedRole === ROLES.ADMIN && actualRole !== ROLES.ADMIN) {
        await supabase.auth.signOut();
        localStorage.removeItem(APP.storageUserKey);
        localStorage.removeItem(APP.storageRoleKey);
        message.textContent = "Este correo no esta autorizado como administrador.";
        return;
      }
      syncSession(data.user, actualRole);
      message.textContent = `Sesion iniciada como ${ROLE_LABELS[actualRole] || ROLE_LABELS[ROLES.USUARIO]}.`;
    } catch (profileError) {
      console.warn("No se pudo actualizar profiles", profileError.message);
      if (selectedRole === ROLES.ADMIN) {
        await supabase.auth.signOut();
        localStorage.removeItem(APP.storageUserKey);
        localStorage.removeItem(APP.storageRoleKey);
        message.textContent = "No se pudo validar el permiso de administrador.";
        return;
      }
      syncSession(data.user, selectedRole);
      message.textContent = `Sesion iniciada como ${ROLE_LABELS[selectedRole]}.`;
    }
    window.setTimeout(() => {
      window.location.href = "perfil.html";
    }, 500);
  });
}

export function initRegistro() {
  const accountButtons = document.querySelectorAll("[data-account-type]");
  const type = document.querySelector("#tipoCuenta");
  const formPanel = document.querySelector("#registroFormPanel");
  const personFields = document.querySelector("#personFields");
  const companyFields = document.querySelector("#companyFields");
  const institutionNote = document.querySelector("#institutionNote");
  const form = document.querySelector("#registroForm");
  const message = document.querySelector("#registroMessage");
  if (!type || !form) return;

  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      accountButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      type.value = button.dataset.accountType;
      formPanel.hidden = false;
      formPanel.classList.remove("form-enter");
      window.requestAnimationFrame(() => formPanel.classList.add("form-enter"));
      updateRegistrationFields(type.value, personFields, companyFields, institutionNote);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Creando cuenta...";

    const formData = new FormData(form);
    const role = formData.get("tipoCuenta") || ROLES.USUARIO;
    const isCompany = role === "empresa";
    const fullName = isCompany ? String(formData.get("nombreEmpresa") || "") : `${formData.get("nombre") || ""} ${formData.get("apellido") || ""}`.trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: fullName,
          apellido: formData.get("apellido") || "",
          ciudad: formData.get("ciudad") || "Huanuco",
          celular: formData.get("celular") || "",
          rol: role,
          modulo_empresa: formData.get("moduloEmpresa") || ""
        }
      }
    });

    if (error) {
      message.textContent = `No se pudo registrar: ${error.message}`;
      return;
    }

    if (data.user) {
      try {
        await upsertProfile(data.user, {
          nombre: isCompany ? formData.get("nombreEmpresa") : formData.get("nombre"),
          apellido: isCompany ? "Empresa" : formData.get("apellido"),
          telefono: formData.get("celular"),
          ciudad: formData.get("ciudad"),
          rol: role
        });
        if (isCompany) {
          const modulo = formData.get("moduloEmpresa");
          const registros = modulo === "ambos" ? ["recicla", "reutiliza"] : [modulo];
          for (const item of registros) {
            await createEmpresa(data.user.id, {
              nombre_empresa: formData.get("nombreEmpresa"),
              ruc: formData.get("ruc"),
              tipo: item === "recicla" ? "recicladora" : "comercial",
              modulo: item,
              descripcion: formData.get("descripcionEmpresa"),
              estado_verificacion: "pendiente",
              verificada: false
            });
          }
        }
      } catch (profileError) {
        message.textContent = `Cuenta creada, pero no se pudo guardar el perfil: ${profileError.message}`;
      }
      syncSession(data.user, role);
    }
    message.textContent = data.session
      ? "Cuenta creada. Redirigiendo a tu perfil..."
      : "Cuenta creada. Revisa tu correo si Supabase requiere confirmacion.";

    if (data.session) {
      window.setTimeout(() => {
        window.location.href = "perfil.html";
      }, 700);
    }
  });
}

function updateRegistrationFields(type, personFields, companyFields, institutionNote) {
  const isCompany = type === "empresa";
  if (personFields) {
    personFields.hidden = isCompany;
    personFields.querySelectorAll("input").forEach((input) => {
      input.required = !isCompany && input.dataset.optional !== "true";
    });
  }
  if (companyFields) {
    companyFields.hidden = !isCompany;
    companyFields.querySelectorAll("input, select").forEach((input) => {
      input.required = isCompany;
    });
  }
  if (institutionNote) {
    institutionNote.hidden = !["municipalidad", "universidad", "ong"].includes(type);
  }
}

export function currentRole() {
  return localStorage.getItem(APP.storageRoleKey) || ROLES.USUARIO;
}

export async function currentSession() {
  const user = await getSupabaseUser();
  if (user) {
    let profile = null;
    let empresas = [];
    try {
      profile = await fetchProfile(user.id);
      if (profile?.rol === "empresa") empresas = await fetchUserEmpresas(user.id);
    } catch (profileError) {
      console.warn("No se pudo leer profiles", profileError.message);
    }
    const role = profile?.rol || user.user_metadata?.rol || localStorage.getItem(APP.storageRoleKey) || ROLES.USUARIO;
    syncSession(user, role);
    return buildSession(user, role, profile, empresas);
  }

  const email = localStorage.getItem(APP.storageUserKey);
  const role = localStorage.getItem(APP.storageRoleKey);
  if (!email || !role) return null;
  return {
    email,
    role,
    label: ROLE_LABELS[role] || "Usuario normal",
    name: emailName(email),
    metadata: {}
  };
}

export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem(APP.storageUserKey);
  localStorage.removeItem(APP.storageRoleKey);
}

export async function initPerfil() {
  const session = await currentSession();
  const profile = document.querySelector("#profileContent");
  const logoutBtn = document.querySelector("#logoutButton");
  const guest = document.querySelector("#guestProfile");

  if (!profile) return;

  if (!session) {
    profile.hidden = true;
    if (guest) guest.hidden = false;
    return;
  }

  const initials = session.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  document.querySelector("#profileInitials").textContent = initials || "E";
  document.querySelector("#profileName").textContent = session.name;
  document.querySelector("#profileEmail").textContent = session.email;
  document.querySelector("#profileRole").textContent = session.label;
  const city = document.querySelector("#profileCity");
  const leaves = document.querySelector("#profileLeaves");
  const score = document.querySelector("#profileScore");
  if (city) city.textContent = `Ciudad: ${session.profile?.ciudad || session.metadata?.ciudad || "Huanuco"}`;
  if (leaves) leaves.textContent = "🍃".repeat(Math.max(1, Math.min(5, Number(session.profile?.hojas || 5))));
  if (score) score.textContent = `EcoScore: ${session.profile?.eco_score || 0} puntos`;
  if (leaves) leaves.textContent = "\uD83C\uDF43".repeat(Math.max(1, Math.min(5, Number(session.profile?.hojas || 5))));
  document.querySelector("#profileDescription").textContent = profileDescription(session.role);
  document.querySelector("#profileDashboardLink").innerHTML = dashboardLink(session.role, session.empresas);
  renderProfileByRole(session);
  hydrateProfileMetrics(session);

  const pickupButton = document.querySelector("#pickupDataButton");
  if (pickupButton) {
    pickupButton.hidden = !canCompletePickupData(session.role);
    pickupButton.addEventListener("click", () => openPickupModal(session));
  }
  document.addEventListener("click", handleProfileActions);
  document.addEventListener("submit", handleProfileSubmit);

  logoutBtn?.addEventListener("click", async () => {
    await logout();
    window.location.href = "login.html";
  });
}

async function hydrateProfileMetrics(session) {
  const user = await getSupabaseUser();
  if (!user) return;
  try {
    const values = await fetchProfileMetrics(user.id, session.role);
    if (!values) return;
    ["One", "Two", "Three", "Four"].forEach((slot, index) => setText(`#profileMetric${slot}`, String(values[index] ?? "--")));
  } catch (error) {
    console.warn("No se pudieron cargar metricas del perfil", error.message);
  }
}

function renderProfileByRole(session) {
  const view = profileView(session);
  setText("#profileHeroText", view.hero);
  setText("#profileQuickTitle", view.quickTitle);
  setMetric("One", view.metrics[0]);
  setMetric("Two", view.metrics[1]);
  setMetric("Three", view.metrics[2]);
  setMetric("Four", view.metrics[3]);
  setHtml("#profileQuickActions", view.actions.map(actionLink).join(""));
  setHtml("#profileRoleActions", view.sideActions.map(actionLink).join(""));
  setHtml("#profilePanels", view.panels.map(profilePanel).join(""));
}

function profileView(session) {
  const role = session.role;
  const isEmpresa = role === "empresa" || role === ROLES.EMPRESA_RECICLA || role === ROLES.EMPRESA_REUTILIZA;
  const isInstitution = [ROLES.ONG, ROLES.MUNICIPALIDAD, ROLES.UNIVERSIDAD].includes(role);

  if (role === ROLES.ADMIN) {
    return {
      hero: "Control de seguridad, verificaciones, usuarios y actividad de la plataforma.",
      quickTitle: "Centro de control",
      metrics: [["--", "Empresas pendientes"], ["--", "Reportes abiertos"], ["--", "Usuarios activos"], ["--", "Publicaciones en revision"]],
      actions: [
        ["🛡️ Panel admin", "admin.html", "btn"],
        ["📊 Datos globales", "datos.html", "btn secondary"],
        ["💬 Comunidad", "comunidad.html", "btn ghost"],
        ["📩 Contactos", "contacto.html", "btn ghost"]
      ],
      sideActions: [],
      panels: [
        ["Verificaciones", "Revisa empresas, ONGs, municipalidades y universidades antes de activar permisos."],
        ["Reportes y spam", "Controla denuncias, bloqueos, reputacion y publicaciones sospechosas."],
        ["Metricas generales", "Observa crecimiento, impacto ambiental y actividad por modulo."],
        ["Acceso administrador", "Este perfil no usa datos de recojo; su flujo principal es administracion."]
      ]
    };
  }

  if (isEmpresa) {
    const hasRecicla = role === ROLES.EMPRESA_RECICLA || session.empresas?.some((empresa) => empresa.modulo === "recicla");
    const hasReutiliza = role === ROLES.EMPRESA_REUTILIZA || session.empresas?.some((empresa) => empresa.modulo === "reutiliza");
    return {
      hero: "Gestion empresarial para campanas, publicaciones, afiliados y reputacion.",
      quickTitle: "Herramientas de empresa",
      metrics: [["--", "Publicaciones activas"], ["--", "Solicitudes"], ["--", "Ventas o recojos"], ["--", "Reputacion visible"]],
      actions: [
        ...(hasRecicla ? [["♻️ Dashboard reciclaje", "dashboard-empresa-recicla.html", "btn"]] : []),
        ...(hasReutiliza ? [["🛒 Dashboard reutiliza", "dashboard-empresa-reutiliza.html", "btn secondary"]] : []),
        ["📦 Publicar producto", "publicar-producto.html", "btn ghost"],
        ["📣 Comunidad", "comunidad.html", "btn ghost"]
      ],
      sideActions: hasRecicla ? [["🗺️ Centro de rutas", "rutas.html", "btn ghost"]] : [],
      panels: [
        ["Estado de verificacion", "La visibilidad comercial depende de la aprobacion del administrador."],
        ["Afiliados y rutas", hasRecicla ? "Gestiona recicladores afiliados, usuarios y rutas de recojo." : "Activa el modulo Recicla para gestionar rutas y recicladores."],
        ["Liquidaciones", hasReutiliza ? "Publica lotes, productos destacados y ofertas empresariales." : "Activa Reutiliza para vender lotes o bienes comerciales."],
        ["Reputacion", "Las hojas verdes muestran cumplimiento, trato, puntualidad y reportes."]
      ]
    };
  }

  if (isInstitution) {
    return {
      hero: "Perfil institucional para convocatorias ambientales y participacion comunitaria.",
      quickTitle: "Acciones institucionales",
      metrics: [["--", "Convocatorias"], ["--", "Participantes"], ["--", "Kg meta"], ["--", "Publicaciones destacadas"]],
      actions: [
        ["📅 Ver eventos", "eventos.html", "btn"],
        ["💬 Comunidad", "comunidad.html", "btn secondary"],
        ["📊 Datos de impacto", "datos.html", "btn ghost"],
        ["📩 Contacto", "contacto.html", "btn ghost"]
      ],
      sideActions: [],
      panels: [
        ["Convocatorias", "ONGs, municipalidades y universidades pueden activar campanas gratuitas en Recicla."],
        ["Comunidad", "Tus anuncios institucionales aparecen con mayor visibilidad al estar verificados."],
        ["Reutiliza comercial", "Para liquidaciones masivas se requiere activar modulo comercial."],
        ["Impacto", "Prepara datos para reportes ambientales, voluntariado y alianzas."]
      ]
    };
  }

  return {
    hero: "Tu reputacion, EcoScore, publicaciones, recojos y recompensas.",
    quickTitle: "Accesos rapidos",
    metrics: [["--", "Publicaciones activas"], ["--", "Materiales publicados"], ["--", "Eventos inscritos"], ["3", "Recompensas disponibles"]],
    actions: [
      ["♻️ Publicar reciclaje", "publicar-reciclaje.html", "btn"],
      ["🛒 Publicar producto", "publicar-producto.html", "btn secondary"],
      ["📅 Ver eventos", "eventos.html", "btn ghost"],
      ["💬 Comunidad", "comunidad.html", "btn ghost"],
      ["🏅 Ver medallas", "#", "action-btn ghost", "prepared"],
      ["🎟️ Canjear recompensa", "#", "action-btn ghost", "prepared"]
    ],
    sideActions: [],
    panels: [
      ["Medallas y logros", "Guardian del carton · Vecino circular · Aliado verde"],
      ["Empresas recicladoras afiliadas", "Modulo listo para mostrar afiliaciones cuando la tabla este disponible."],
      ["Productos en venta", "Modulo listo para filtrar productos por usuario actual."],
      ["Historial resumido", "Modulo listo para conectar publicaciones, eventos inscritos y participaciones."]
    ]
  };
}

function canCompletePickupData(role) {
  return [ROLES.USUARIO, ROLES.RECICLADOR].includes(role);
}

function setMetric(slot, metric) {
  setText(`#profileMetric${slot}`, metric?.[0] ?? "--");
  setText(`#profileMetric${slot}Label`, metric?.[1] ?? "");
}

function actionLink([label, href, className, action]) {
  if (action) return `<button class="${className}" data-profile-action="${escapeAttr(action)}">${escapeHtml(label)}</button>`;
  return `<a class="${className}" href="${escapeAttr(href)}">${escapeHtml(label)}</a>`;
}

function profilePanel([title, text]) {
  return `<article class="dashboard-card profile-panel-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`;
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function setHtml(selector, html) {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = html;
}

function handleProfileActions(event) {
  const target = event.target.closest("[data-profile-action]");
  if (!target) return;
  if (target.dataset.profileAction === "close-modal") closeProfileModal();
  if (target.dataset.profileAction === "prepared") showProfileToast("Funcion preparada para integracion con datos reales del usuario.");
}

async function handleProfileSubmit(event) {
  const form = event.target.closest("[data-profile-form='pickup']");
  if (!form) return;
  event.preventDefault();
  const session = await currentSession();
  if (!session) {
    showProfileToast("Inicia sesion para enviar datos de recojo.");
    return;
  }
  try {
    const payload = Object.fromEntries(new FormData(form));
    await createPickupRequest(session.profile?.id || (await getSupabaseUser())?.id, {
      direccion: payload.direccion,
      referencia: payload.referencia,
      dia: payload.dia,
      hora: payload.hora,
      material: payload.material,
      kg: Number(payload.kg || 0),
      ciudad: session.profile?.ciudad || session.metadata?.ciudad || APP.city
    });
    closeProfileModal();
    showProfileToast("Datos de recojo enviados a EcoRed.");
  } catch (error) {
    closeProfileModal();
    showProfileToast("Recojo guardado para demo. Ejecuta la migracion final para guardarlo en Supabase.");
    console.warn("No se pudo crear solicitud de recojo", error.message);
  }
}

function openPickupModal(session) {
  const modal = document.querySelector("#profileModal");
  if (!modal) return;
  modal.innerHTML = `<div class="modal-panel">
    <div class="modal-header">
      <div><span class="status-badge pending">Recojo</span><h2>Completar datos de recojo</h2></div>
      <button class="modal-close" data-profile-action="close-modal">x</button>
    </div>
    <form class="modal-form" data-profile-form="pickup">
      <label>Direccion exacta<input name="direccion" required></label>
      <label>Referencia<textarea name="referencia" required></textarea></label>
      <div class="split">
        <label>Dia de recojo<input name="dia" type="date" required></label>
        <label>Hora de recojo<input name="hora" type="time" required></label>
      </div>
      <div class="split">
        <label>Material frecuente<input name="material" placeholder="Carton, plastico, metal..." required></label>
        <label>Kg aproximados<input name="kg" type="number" min="0" step="0.1" required></label>
      </div>
      <label><input type="checkbox" required> Confirmo que la ubicacion y el material son correctos para ${escapeHtml(session.name)}.</label>
      <p class="empty-state">Se guardara como solicitud de recojo para empresas verificadas.</p>
      <button class="btn">Confirmar ubicacion</button>
    </form>
  </div>`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeProfileModal() {
  const modal = document.querySelector("#profileModal");
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
}

function showProfileToast(text) {
  const toast = document.querySelector("#profileToast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function syncSession(user, fallbackRole) {
  if (!user?.email) return;
  const role = fallbackRole || user.user_metadata?.rol || ROLES.USUARIO;
  localStorage.setItem(APP.storageUserKey, user.email);
  localStorage.setItem(APP.storageRoleKey, role);
}

function buildSession(user, role, profile = null, empresas = []) {
  return {
    email: user.email,
    role,
    label: ROLE_LABELS[role] || roleLabelFromDb(role),
    name: profile ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() : user.user_metadata?.nombre || emailName(user.email),
    metadata: user.user_metadata || {},
    profile,
    empresas
  };
}

function emailName(email) {
  return email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function profileDescription(role) {
  const descriptions = {
    [ROLES.USUARIO]: "Ciudadano EcoRed: recicla, reutiliza, participa en eventos y construye reputacion verde.",
    [ROLES.EMPRESA_RECICLA]: "Empresa verificada para campanas, rutas, afiliados y material reciclado.",
    [ROLES.EMPRESA_REUTILIZA]: "Empresa comercial con productos activos, liquidaciones y reputacion visible.",
    empresa: "Empresa EcoRed conectada a modulos comerciales o de reciclaje segun su verificacion.",
    [ROLES.ONG]: "Institucion aliada para convocatorias gratuitas y comunidad ambiental.",
    [ROLES.ADMIN]: "Panel de control para verificacion, reportes, seguridad y metricas."
  };
  return descriptions[role] || descriptions[ROLES.USUARIO];
}

function roleLabelFromDb(role) {
  const labels = {
    empresa: "Empresa",
    superadmin: "Superadmin"
  };
  return labels[role] || "Usuario normal";
}

function dashboardLink(role, empresas = []) {
  if (role === ROLES.EMPRESA_RECICLA) return `<a class="btn secondary" href="dashboard-empresa-recicla.html">Ir a Dashboard Recicla</a>`;
  if (role === ROLES.EMPRESA_REUTILIZA) return `<a class="btn secondary" href="dashboard-empresa-reutiliza.html">Ir a Dashboard Reutiliza</a>`;
  if (role === "empresa") {
    const modules = new Set(empresas.map((empresa) => empresa.modulo));
    const links = [];
    if (modules.has("recicla")) links.push(`<a class="btn secondary" href="dashboard-empresa-recicla.html">Dashboard Recicla</a>`);
    if (modules.has("reutiliza")) links.push(`<a class="btn secondary" href="dashboard-empresa-reutiliza.html">Dashboard Reutiliza</a>`);
    return links.length ? `<div class="tag-row">${links.join("")}</div>` : `<a class="btn secondary" href="explorar.html">Explorar modulos</a>`;
  }
  if (role === ROLES.ADMIN) return `<a class="btn secondary" href="admin.html">Ir a Admin</a>`;
  return `<a class="btn secondary" href="explorar.html">Explorar modulos</a>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
