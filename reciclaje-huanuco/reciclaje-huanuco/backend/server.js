// ============================================================
//  CAPA 2: BACKEND — Servidor principal (punto de entrada)
//  Levanta Express, habilita CORS (para que React en el puerto
//  5173 pueda llamar a la API en el 4000) y monta las rutas.
// ============================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import solicitudesRoutes from './src/routes/solicitudesRoutes.js';

dotenv.config();

const app = express();
const PUERTO = process.env.PORT || 4000;

app.use(cors());            // permite peticiones desde el frontend
app.use(express.json());    // entiende cuerpos JSON

// Todas las rutas de solicitudes cuelgan de este prefijo.
app.use('/api/solicitudes', solicitudesRoutes);

// Ruta de salud, solo para comprobar que el servidor está vivo.
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Rutas de Reciclaje Huánuco — activa ✓' });
});

app.listen(PUERTO, () => {
  console.log(`✓ Backend escuchando en http://localhost:${PUERTO}`);
});
