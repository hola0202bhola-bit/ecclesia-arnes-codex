# Smoke de navegación — 25/11/2026

Cambio autorizado mínimo en scripts/smoke-deployment.mjs: el helper verifica también Mi cuenta y admite las expectativas anónima/visitante. Anónimo oculta ambos accesos, visitante conserva cuenta, personal mantiene login administrativo y separación de cookies. No se retiran comprobaciones de permisos, revocación, persistencia, reinicio ni módulos anteriores; no cambian ejecutores, umbrales o límites.

Gate completo aprobado con salida 0: 531/531 producto, 117/117 arnés y 67 escenarios del índice (uno aceptado y 66 rechazos esperados), sin omisiones; arquitectura 60/60 sin infracciones, cobertura de líneas 97.54%. Los 197 archivos congelados permanecieron idénticos. Después solo se actualiza documentación. Ejecución 2026-11-25T16:15:36.9075222-06:00–2026-11-25T18:01:57.8227249-06:00, Node 24.22.3 y PostgreSQL 18.6 propios.

Los intentos interrumpidos o fallidos anteriores permanecen documentados en el informe local; no se cuentan como verdes. La copia positiva del índice aprobó el producto completo y las 66 alteraciones fueron rechazadas, preservando índice y working tree. Cambios posteriores al gate únicamente documentales, con revisión de formato y hook oficial del producto antes de su commit. Commits locales revisables; sin push, merges, despliegue ni escritura remota. Las pruebas no acreditan aceptación docente.
