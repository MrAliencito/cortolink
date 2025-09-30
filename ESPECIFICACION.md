# Especificación — CortoLink

## Objetivo
Servicio de **acortamiento de URLs** con estadísticas, simple y listo para portfolio.

## Requerimientos
- Crear enlace corto (slug opcional) y redirigir `/:slug`.
- Registrar clics (ts, referer, userAgent, ip).
- Panel admin con lista, contador y detalle de clics.
- Borrado de enlaces.
- Basic Auth en admin.

## Modelo de datos
Link 1—N Click (ver `prisma/schema.prisma`).

## Endpoints
- `POST /api/links` → 201 o 400/409
- `GET /:slug` → 302 o 404
- `GET /api/admin/links` → 200
- `GET /api/admin/links/:id/stats` → 200
- `DELETE /api/admin/links/:id` → 204
- `GET /salud` → 200

## Criterios
- URL válida (http/https), slug único minúscula.
- Admin protegido por Basic.
