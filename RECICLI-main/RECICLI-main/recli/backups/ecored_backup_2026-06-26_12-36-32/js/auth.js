import { APP, ROLE_LABELS, ROLES } from "./config.js";

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    localStorage.setItem(APP.storageRoleKey, role.value);
    localStorage.setItem(APP.storageUserKey, form.email.value || "demo@ecored.pe");
    message.textContent = `Sesion simulada iniciada como ${ROLE_LABELS[role.value]}.`;
  });
}

export function initRegistro() {
  const type = document.querySelector("#tipoCuenta");
  const companyBox = document.querySelector("#empresaOpciones");
  const form = document.querySelector("#registroForm");
  const message = document.querySelector("#registroMessage");
  if (!type || !form) return;

  type.addEventListener("change", () => {
    companyBox.hidden = type.value !== "empresa";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message.textContent = "Correo de confirmacion simulado enviado. Tu cuenta queda lista para validacion.";
  });
}

export function currentRole() {
  return localStorage.getItem(APP.storageRoleKey) || ROLES.USUARIO;
}
