-- ============================================================
--  SISTEMA DE OPTIMIZACIÓN DE RUTAS DE RECICLAJE — HUÁNUCO, PERÚ
--  CAPA 1: BASE DE DATOS (MySQL)
-- ============================================================
--  Cómo usarlo en XAMPP:
--    1. Abre phpMyAdmin (http://localhost/phpmyadmin)
--    2. Pestaña "Importar" -> selecciona este archivo -> "Continuar"
--    (o pega todo el contenido en la pestaña "SQL" y ejecuta)
-- ============================================================

DROP DATABASE IF EXISTS reciclaje_huanuco;
CREATE DATABASE reciclaje_huanuco
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE reciclaje_huanuco;

-- ------------------------------------------------------------
--  TABLA: usuarios (los ciudadanos que piden el recojo)
--  - cancelaciones: contador acumulado de veces que cancela
--  - estado: ACTIVO por defecto; pasa a BLOQUEADO al llegar a 3
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(150)  NOT NULL,
  direccion     VARCHAR(255)  NULL,
  telefono      VARCHAR(20)   NULL,
  cancelaciones INT           NOT NULL DEFAULT 0,
  estado        ENUM('ACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  creado_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- ------------------------------------------------------------
--  TABLA: solicitudes_recojo (cada punto que aparece en el mapa)
--  - latitud / longitud: DECIMAL(10,7) ≈ precisión de ~1 cm
--  - estado: el ciclo de vida del punto en la ruta
--      PENDIENTE  -> aún no entra al viaje
--      EN_RUTA    -> congelado en el viaje actual (el chofer lo ve)
--      CANCELADO  -> el usuario lo canceló en tiempo real
--      COMPLETADO -> el camión ya pasó por ahí
--  - orden_visita: el orden en que el chofer debe visitarlos
-- ------------------------------------------------------------
CREATE TABLE solicitudes_recojo (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT           NOT NULL,
  latitud        DECIMAL(10,7) NOT NULL,
  longitud       DECIMAL(10,7) NOT NULL,
  referencia     VARCHAR(255)  NULL,
  estado         ENUM('PENDIENTE', 'EN_RUTA', 'CANCELADO', 'COMPLETADO')
                   NOT NULL DEFAULT 'PENDIENTE',
  orden_visita   INT           NULL,
  creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitud_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE,
  INDEX idx_estado (estado)
) ENGINE = InnoDB;

-- ============================================================
--  DATOS DE PRUEBA
--  Coordenadas reales alrededor de la Plaza de Armas de Huánuco
--  (Depósito Central: -9.9306, -76.2422). OSRM "pegará" cada
--  punto a la calle más cercana automáticamente.
-- ============================================================
INSERT INTO usuarios (nombre, direccion, telefono) VALUES
  ('María Quispe',    'Jr. Dos de Mayo 650',   '962111222'),
  ('Carlos Figueroa', 'Jr. General Prado 820',  '962333444'),
  ('Lucía Tarazona',  'Jr. Huánuco 410',        '962555666'),
  ('Pedro Ríos',      'Jr. Constitución 300',   '962777888'),
  ('Ana Beraún',      'Jr. Aguilar 540',        '962999000');

INSERT INTO solicitudes_recojo
  (usuario_id, latitud, longitud, referencia, estado, orden_visita) VALUES
  (1, -9.9275000, -76.2400000, 'Frente al Mercado Modelo',  'PENDIENTE', 1),
  (2, -9.9290000, -76.2380000, 'Esquina con Jr. Ayacucho',  'PENDIENTE', 2),
  (3, -9.9340000, -76.2445000, 'Cerca al Puente Calicanto', 'PENDIENTE', 3),
  (4, -9.9325000, -76.2460000, 'Costado del parque',        'PENDIENTE', 4),
  (5, -9.9355000, -76.2410000, 'Al lado de la bodega azul',  'PENDIENTE', 5);

-- Consulta rápida para verificar:
-- SELECT * FROM solicitudes_recojo;
-- SELECT * FROM usuarios;
