# Continuación: Iglesias web y catálogos

Bases verificadas: producto e3337c7d4475f29ad749b4b4fcc40732398ec3b0 y arnés 7bdea6311a295f1ff64be3e8f64a3d5455559032. Mismos repositorios y capas. El gate exige las tres suites, migración geográfica, vistas de gestión/error y 34 respuestas oficiales enumeradas por manifest. Comprueba PostgreSQL, doble seed, fuentes/hash/versión, migración desde esquema previo, HTTP, concurrencia, roles y vistas. La importación no descarga datos durante las pruebas.

Los controles nuevos evitan omitir archivos del incremento; el hook sigue materializando blobs reales. Regresión positiva con las tres suites y negativas de eliminación staged de suite/manifest/formulario. No se amplían permisos ni se reduce cobertura. Catálogos GET se implementan con la misma política pública ya existente; administración de catálogos y cierre siguen pendientes. Nuevas regresiones de contrato distinguen lectura de snapshot y edición propuesta.

Ejecutar npm run check -- ../proyecto-ecclesia. Tras revisar diff y pasar gate, refrescar fingerprint explícitamente para commits autorizados; no desactivar ni reemplazar hooks ajenos. Resultados finales en estado-producto.md del producto. El resto de este archivo conserva el incremento de identidad.

# Incremento de identidad y continuidad de producto

1 de noviembre de 2026, America/Mexico_City. Bases inspeccionadas: producto `acc6cd353512ddfdb0e330083f83f4843e990e0b`; arnés `dcf5cbbbd38c5c74ce11209f62dc883f0da7e961`. El alumno autorizó aplicación + arnés, commits nuevos y publicación sin force push. No se exige cierre ceremonial de Fase 0. Las fuentes y reglas ambiguas siguen documentadas; no se inventan respuestas docentes.

Gate ampliado: requiere suite y migración de Identidad, vistas de acceso/panel/usuarios y compilación estricta de ambas suites. Ejecuta PostgreSQL real con ambas migraciones, doble seed sin usuarios, todas las pruebas, cobertura de cada fuente y smoke del servidor compilado (incluye página de login y denegación anónima de usuarios). Se verifica resultado por suite: al menos las 70 regresiones de Iglesias y 30 de identidad, ninguna omitida. No se acepta un script test que solo retorne cero.

Contrato general añade perfil/logout y política explícita de personal para ambos. Mantiene políticas sin ampliar privilegios de otros dominios. El subconjunto ejecutable incluye identidad mínima con DTO completo; schemas de diseño histórico de cuentas múltiples/edición continúan separados. Regresiones de contrato verifican ámbito y exclusión de hash. Hook: positivo con ambas suites y rechazo adicional de suite de identidad borrada solo del índice, además de los casos negativos originales. No se usa working tree para aprobar código preparado.

La evidencia de ejecución, totales y cobertura está en `../proyecto-ecclesia/docs/evidencia-identidad.md`; las salidas locales se generan fuera de Git como antes. `npm run check -- ../proyecto-ecclesia` ejecuta gate completo. No reducir checks con --index manualmente; esa opción evita recursión únicamente dentro del hook. Cambios legítimos del arnés requieren revisar diff y refrescar fingerprint explícitamente.

Limitaciones: gate no acredita aceptación docente, dispositivo móvil, carga ni despliegue productivo. La inicialización local se verifica en servicio y concurrencia sobre BD; interacción manual de terminal se registra por separado si se ejecuta. El historial R1/R2/R3 conserva sus hechos y métricas anteriores.
