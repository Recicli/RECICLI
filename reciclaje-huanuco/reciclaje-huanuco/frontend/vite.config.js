import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion de Vite. El frontend corre en el puerto 5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
