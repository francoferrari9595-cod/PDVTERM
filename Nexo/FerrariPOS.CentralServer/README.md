# FerrariPOS Central Server

Servidor central para el panel web de FerrariPOS.

## Arquitectura de datos actual

- El panel Central **no utiliza snapshots** para transportar los datos.
- El panel Central **no utiliza PostgreSQL para sincronizar los datos del Manager**.
- Windows Manager conserva SQLite como fuente de verdad local.
- Windows Manager publica cada 10 segundos la URL pública vigente de su Quick Tunnel en Central.
- Cuando el usuario abre/actualiza el panel Central, Render consulta directamente `/api/central/live` del Windows Manager a través del Quick Tunnel.
- La respuesta contiene los datos reales que ya utiliza el panel Quick Tunnel, además del QR de vinculación del Manager.
- La consulta está autenticada con el `central_token` de la instalación y queda asociada al `store_id` de la sesión web.
- Si el Quick Tunnel cambia, Windows Manager vuelve a publicar automáticamente la nueva URL.

## Endpoints principales

- `/health` estado del servidor.
- `/api/v1/stores/register` registro de la instalación.
- `/api/v1/stores/{storeId}/live-source` publica el Quick Tunnel activo.
- `/api/v1/web/login` acceso al panel.
- `/api/v1/web/dashboard` devuelve la lectura directa del Manager.
- `/api/v1/stores/{storeId}/commands` canal existente para acciones del panel.

## Render

El servicio solo necesita el Web Service de FerrariPOS Central. No requiere una base PostgreSQL para el mecanismo de datos en vivo.
