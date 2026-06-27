import { APP, ROLE_LABELS, ROLES } from "./config.js";
import { getSupabaseUser, supabase } from "./supabaseClient.js";
import { createEmpresa, fetchProfile, fetchUserEmpresas, upsertProfile } from "./supabaseData.js";

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
  document.querySelector("#profileDescription").textContent = profileDescription(session.role);
  document.querySelector("#profileDashboardLink").innerHTML = dashboardLink(session.role, session.empresas);

  document.querySelector("#pickupDataButton")?.addEventListener("click", () => openPickupModal(session));
  document.addEventListener("click", handleProfileActions);
  document.addEventListener("submit", handleProfileSubmit);

  logoutBtn?.addEventListener("click", async () => {
    await logout();
    window.location.href = "login.html";
  });
}

function handleProfileActions(event) {
  const target = event.target.closest("[data-profile-action]");
  if (!target) return;
  if (target.dataset.profileAction === "close-modal") closeProfileModal();
  if (target.dataset.profileAction === "prepared") showProfileToast("Funcion preparada para integracion con datos reales del usuario.");
}

function handleProfileSubmit(event) {
  const form = event.target.closest("[data-profile-form='pickup']");
  if (!form) return;
  event.preventDefault();
  // TODO: guardar en tabla solicitudes_ubicacion o preferencias_recojo cuando exista el esquema.
  closeProfileModal();
  showProfileToast("Datos enviados a la empresa recicladora.");
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
      <p class="empty-state">Guardado real preparado para tabla de solicitudes de ubicacion.</p>
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
