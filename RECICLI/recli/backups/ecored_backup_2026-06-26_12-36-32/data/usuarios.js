import { ROLES } from "../js/config.js";

export const usuarios = [
  {
    id: 1,
    nombre: "Valeria Torres",
    rol: ROLES.USUARIO,
    ciudad: "Huanuco",
    zona: "Amarilis",
    ecoScore: 1240,
    hojas: 5,
    medallas: ["Guardian del carton", "Vecina circular", "Cazadora de botellas"],
    publicacionesActivas: 6,
    kgReciclados: 148
  },
  {
    id: 2,
    nombre: "Carlos Rojas",
    rol: ROLES.RECICLADOR,
    ciudad: "Huanuco",
    zona: "Pillco Marca",
    ecoScore: 970,
    hojas: 4,
    medallas: ["Ruta limpia", "Aliado verificado"],
    publicacionesActivas: 2,
    kgReciclados: 420
  },
  {
    id: 3,
    nombre: "EcoAndes SAC",
    rol: ROLES.EMPRESA_RECICLA,
    ciudad: "Huanuco",
    zona: "Centro",
    ecoScore: 3820,
    hojas: 5,
    medallas: ["Empresa verificada", "Meta cumplida"],
    publicacionesActivas: 4,
    kgReciclados: 3180
  }
];

// Futuro Supabase:
// const { data } = await supabase.from("usuarios").select("*");
