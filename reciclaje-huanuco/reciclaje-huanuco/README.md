# ♻ Sistema de Optimización de Rutas de Reciclaje — Huánuco, Perú

Sistema fullstack donde el chofer de un camión de reciclaje tiene una ruta fija
sobre las calles reales de Huánuco. Si un ciudadano **cancela** su solicitud en
tiempo real, el mapa lo detecta consultando MySQL y **vuelve a dibujar la ruta**
por las calles usando **OSRM** (motor de rutas 100% gratuito, sin Google Maps).

- **Centro / Depósito Central:** Plaza de Armas de Huánuco (`-9.9306, -76.2422`).
- **Base de datos:** MySQL
- **Backend:** Node.js + Express + mysql2
- **Frontend:** React (Vite) + React-Leaflet (OpenStreetMap) + OSRM

---

## 🧭 Cómo se conectan las capas (flujo de datos)

```
   MySQL                 Backend (Express)              Frontend (React)
 ┌────────────┐        ┌────────────────────┐        ┌──────────────────────┐
 │ solicitudes│  SQL   │ GET  /en-ruta      │  HTTP  │ useRutaChofer (hook) │
 │ _recojo    │◄──────►│ PUT  /congelar     │◄──────►│  sondea cada 4 s     │
 │ usuarios   │        │ PUT  /cancelar/:id │  JSON  │  ¿cambió la lista?   │
 └────────────┘        │ PUT  /finalizar    │        │   └─► osrmService    │
                       └────────────────────┘        │        └─► OSRM API  │
                                                      │   redibuja <Polyline>│
                                                      └──────────────────────┘
```

**Ciclo de un viaje:**

1. **Iniciar viaje** → `PUT /congelar`: las solicitudes `PENDIENTE` pasan a
   `EN_RUTA`. El viaje queda "congelado": lo nuevo que entre será `PENDIENTE` y
   el chofer no lo verá hasta el próximo ciclo.
2. El hook `useRutaChofer` pregunta cada 4 s por los puntos `EN_RUTA`. Cuando la
   lista cambia, llama a `osrmService`, que pide a OSRM la geometría de las
   calles (respetando el **sentido** de cada vía) y dibuja la `<Polyline>`.
3. **Cancelar** → `PUT /cancelar/:id`: la solicitud pasa a `CANCELADO` y el
   usuario suma +1 en su contador. **Al llegar a 3, el usuario se BLOQUEA.**
   En el próximo sondeo el hook ve "un punto menos" y **recalcula la ruta**.
4. **Finalizar viaje** → `PUT /finalizar`: lo que quedó `EN_RUTA` pasa a
   `COMPLETADO` y el mapa queda limpio.

---

## 🚀 Instalación (Windows + XAMPP + VS Code)

### 1) Base de datos
1. Abre **XAMPP** y enciende **Apache** y **MySQL**.
2. Entra a phpMyAdmin: `http://localhost/phpmyadmin`.
3. Pestaña **Importar** → elige `database/esquema.sql` → **Continuar**.
   (Crea la base `reciclaje_huanuco` con las tablas y los datos de prueba.)

### 2) Backend
Abre una terminal (PowerShell) en la carpeta `backend`:

```powershell
cd backend
npm install
npm run dev
```

Debe decir: `✓ Conectado a MySQL` y `✓ Backend escuchando en http://localhost:4000`.
> Si tu MySQL tiene contraseña, edítala en el archivo `backend/.env`.

### 3) Frontend
En **otra** terminal, en la carpeta `frontend`:

```powershell
cd frontend
npm install
npm run dev
```

Abre el navegador en `http://localhost:5173`.

---

## 🧪 Cómo probar la reacción en tiempo real

1. Pulsa **Iniciar viaje** → aparecen las 5 paradas y la ruta verde por las calles.
2. En el panel derecho, pulsa **Cancelar** en cualquier parada.
3. Mira el mapa: el marcador desaparece y la **ruta se redibuja** sola con las
   paradas restantes.
4. Cancela 3 solicitudes del mismo usuario para ver el aviso de **usuario BLOQUEADO**.
5. Pulsa **Finalizar viaje** para cerrar el ciclo.

> Para repetir la prueba, vuelve a importar `database/esquema.sql` (resetea los datos).

---

## 📁 Estructura

```
reciclaje-huanuco/
├── database/
│   └── esquema.sql                 # Capa 1: tablas + datos de Huánuco
├── backend/
│   ├── server.js                   # Express + CORS
│   ├── .env                        # credenciales (listo para XAMPP)
│   └── src/
│       ├── config/database.js      # pool MySQL (mysql2/promise)
│       ├── controllers/solicitudesController.js   # lógica de negocio
│       └── routes/solicitudesRoutes.js            # endpoints
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx                 # integra todo
        ├── App.css                 # estilos
        ├── services/osrmService.js # llamada a OSRM
        ├── hooks/useRutaChofer.js  # sondeo + detección de cambios
        └── components/
            ├── MapaChofer.jsx      # mapa + marcadores + Polyline
            └── ListaParadas.jsx    # panel lateral
```

---

## ⚠ Notas importantes

- **OSRM público:** `router.project-osrm.org` es gratuito pero tiene límite de
  uso (sirve perfecto para clases y demos). Para producción conviene **levantar
  tu propio OSRM** con el extracto de mapa de Perú.
- **Sentido de las calles:** OSRM usa los datos de OpenStreetMap. Si una calle de
  Huánuco no tiene bien marcado el sentido en OSM, la ruta puede no reflejarlo;
  se mejora contribuyendo a OSM o ajustando el extracto local.
- **Sondeo (polling) cada 4 s:** es simple y robusto, tal como se pidió. Si más
  adelante quieres reacción instantánea, se puede cambiar a WebSockets (Socket.IO)
  o Server-Sent Events sin tocar el resto de la arquitectura.
```
