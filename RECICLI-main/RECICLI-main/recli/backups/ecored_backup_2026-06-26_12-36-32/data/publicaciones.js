export const campanasReciclaje = [
  {
    id: 1,
    titulo: "Semana del carton en Amarilis",
    empresa: "EcoAndes SAC",
    ciudad: "Huanuco",
    material: "Papel/carton",
    metaKg: 800,
    avanceKg: 530,
    pagoKg: 0.35,
    estado: "Activa",
    imagen: "../assets/img/campaign-cardboard.svg"
  },
  {
    id: 2,
    titulo: "Botellas PET para colegios",
    empresa: "Verde Norte",
    ciudad: "Huanuco",
    material: "Plastico PET",
    metaKg: 500,
    avanceKg: 210,
    pagoKg: 0.55,
    estado: "Activa",
    imagen: "../assets/img/campaign-pet.svg"
  },
  {
    id: 3,
    titulo: "Metal limpio barrial",
    empresa: "Recicla Centro",
    ciudad: "Tingo Maria",
    material: "Metal",
    metaKg: 300,
    avanceKg: 185,
    pagoKg: 0.8,
    estado: "Programada",
    imagen: "../assets/img/campaign-metal.svg"
  }
];

export const productosReutiliza = [
  {
    id: 1,
    titulo: "Escritorio de madera",
    categoria: "Oficina",
    precio: 180,
    ciudad: "Huanuco",
    estado: "Bueno",
    destacado: true,
    vendedor: "Valeria Torres",
    verificado: false,
    imagen: "../assets/img/product-desk.svg"
  },
  {
    id: 2,
    titulo: "Laptop Core i5 para estudio",
    categoria: "Computadoras",
    precio: 950,
    ciudad: "Huanuco",
    estado: "Usado funcional",
    destacado: true,
    vendedor: "TecnoCircular",
    verificado: true,
    imagen: "../assets/img/product-laptop.svg"
  },
  {
    id: 3,
    titulo: "Silla ergonomica",
    categoria: "Muebles",
    precio: 120,
    ciudad: "Amarilis",
    estado: "Muy bueno",
    destacado: false,
    vendedor: "Oficina Sur",
    verificado: true,
    imagen: "../assets/img/product-chair.svg"
  }
];

export const liquidaciones = [
  { id: 1, titulo: "Universidad renueva 30 computadoras", precio: 650, unidades: 30, estado: "Activa", visibilidad: "Destacada", imagen: "../assets/img/product-laptop.svg" },
  { id: 2, titulo: "Oficina liquida escritorios", precio: 140, unidades: 18, estado: "Activa", visibilidad: "Normal", imagen: "../assets/img/product-desk.svg" },
  { id: 3, titulo: "Municipalidad remata mobiliario usado", precio: 90, unidades: 42, estado: "Revision", visibilidad: "Institucional", imagen: "../assets/img/product-chair.svg" },
  { id: 4, titulo: "Empresa vende lote de impresoras", precio: 220, unidades: 12, estado: "Activa", visibilidad: "Destacada", imagen: "../assets/img/product-laptop.svg" }
];

// Futuro Supabase:
// const { data } = await supabase.from("productos_reutiliza").select("*");
