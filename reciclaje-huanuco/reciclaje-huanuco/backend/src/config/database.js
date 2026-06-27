// ============================================================
//  CAPA 2: BACKEND — Conexión a MySQL
//  Usa un POOL de conexiones (mysql2/promise) para no abrir y
//  cerrar una conexión por cada consulta. El pool reparte
//  conexiones libres entre las peticiones que llegan.
// ============================================================
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',     // XAMPP por defecto: root
  password: process.env.DB_PASSWORD || '',  // XAMPP por defecto: sin clave
  database: process.env.DB_NAME || 'reciclaje_huanuco',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Pequeña verificación al arrancar para avisar si MySQL no responde.
pool
  .getConnection()
  .then((conexion) => {
    console.log('✓ Conectado a MySQL (base: reciclaje_huanuco)');
    conexion.release();
  })
  .catch((error) => {
    console.error('✗ No se pudo conectar a MySQL:', error.message);
    console.error('  Revisa que XAMPP/MySQL esté encendido y el archivo .env.');
  });
