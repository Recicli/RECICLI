export const ROLES = {
  USUARIO: "usuario",
  EMPRESA_RECICLA: "empresa_recicla",
  EMPRESA_REUTILIZA: "empresa_reutiliza",
  ONG: "ong",
  MUNICIPALIDAD: "municipalidad",
  UNIVERSIDAD: "universidad",
  RECICLADOR: "reciclador",
  ADMIN: "admin"
};

export const APP = {
  name: "EcoRed",
  slogan: "Nosotros ponemos las 2R, tu pones la tercera.",
  city: "Huanuco",
  storageRoleKey: "ecored_role",
  storageUserKey: "ecored_user",
  freeReusePosts: 10
};

export const NAV_LINKS = [
  ["Inicio", "index.html"],
  ["Explorar", "pages/explorar.html"],
  ["Comunidad", "pages/comunidad.html"],
  ["Eventos", "pages/eventos.html"],
  ["Datos", "pages/datos.html"],
  ["Contacto", "pages/contacto.html"]
];

export const ROLE_LABELS = {
  [ROLES.USUARIO]: "Usuario normal",
  [ROLES.EMPRESA_RECICLA]: "Empresa Recicla",
  [ROLES.EMPRESA_REUTILIZA]: "Empresa Reutiliza",
  [ROLES.ONG]: "ONG / Municipalidad",
  [ROLES.MUNICIPALIDAD]: "Municipalidad",
  [ROLES.UNIVERSIDAD]: "Universidad",
  [ROLES.RECICLADOR]: "Reciclador",
  [ROLES.ADMIN]: "Admin"
};

export const CHATBOT_FAQ = {
  "Que es EcoRed": "EcoRed organiza reciclaje, reutilizacion y comunidad para impulsar la economia circular local.",
  "Como publico material reciclable": "Entra a Recicla, toca Publicar material y completa tipo, cantidad, ciudad y disponibilidad de recojo.",
  "Como vendo un producto usado": "Usa Reutiliza, publica fotos, precio, ciudad y metodo de entrega. Recuerda revisar la reputacion.",
  "Como se registra una empresa": "Desde Registro elige empresa y activa Recicla, Reutiliza o ambos modulos con verificacion separada.",
  "Las ONGs pagan": "ONGs, municipalidades y universidades crean convocatorias gratuitas en Recicla. Para liquidaciones masivas en Reutiliza activan modulo comercial.",
  "Como funciona el EcoScore": "Suma puntos por kg reciclados, productos reutilizados, eventos, campanas, medallas y CO2 evitado.",
  "Como evito estafas": "Revisa el producto antes de pagar, evita adelantos sospechosos, usa lugares publicos y mira las hojas de reputacion.",
  "Que son las hojas de reputacion": "Son una puntuacion verde basada en cumplimiento, puntualidad, veracidad, trato y reportes."
};
