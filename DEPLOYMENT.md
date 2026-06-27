# EcoRed - despliegue

## Frontend en GitHub Pages

EcoRed es HTML, CSS y JavaScript puro, por lo que puede publicarse directo en GitHub Pages.

1. Sube el contenido de la raiz del repositorio `HACAKTON1`.
2. En GitHub activa `Settings > Pages`.
3. Recomendado: usa GitHub Actions con `.github/workflows/deploy-pages.yml`.
4. Alternativa: usa `Deploy from a branch` y selecciona la rama principal con la carpeta raiz `/`.
5. Verifica que `index.html` y `.nojekyll` esten en la raiz del repositorio.

La app publica solo estos directorios/archivos:

- `index.html`
- `assets/`
- `css/`
- `js/`
- `pages/`
- `.nojekyll`

## Supabase

Ejecuta en este orden:

1. `supabase-setup-complete.sql`
2. `supabase-ecored-final-migration.sql`

La migracion final agrega:

- Bucket publico `ecored-media`.
- Imagenes y metadatos para productos y reciclaje.
- Afiliaciones de reciclaje.
- Solicitudes de recojo.
- Interacciones sociales de productos.
- Auditoria basica de admin.

## Detector IA

GitHub Pages no ejecuta Python. El detector debe desplegarse como servicio separado.

Opcion recomendada: Render.

1. Sube la carpeta `Deteccion de objetos` a GitHub.
2. En Render crea un servicio desde el `render.yaml`.
3. El servicio esperado por defecto es:

```text
https://ecored-detector.onrender.com/analizar
```

El `render.yaml` usa `ECORED_FULL_IA=0` para evitar que el plan gratuito cargue el modelo pesado `yolov8x.pt`. Si tienes un plan con mas memoria, cambia esa variable a `1`.

Si Render genera otra URL, cambia `APP.detectorApiUrl` en `js/config.js` o usa en consola:

```js
localStorage.setItem("ecored_detector_url", "https://TU-SERVICIO.onrender.com/analizar")
```

## Rutas

La app de rutas se mantiene como modulo separado. En local usa `http://localhost:5173/`.
En produccion, cambia `APP.routesAppUrl` en `js/config.js` por la URL final.
