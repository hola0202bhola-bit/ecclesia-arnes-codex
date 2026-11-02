# Incremento Iglesias web/catálogos — 1 de noviembre de 2026

- Gate exige suite de gestión EJS/catálogos, migración aditiva, fuentes oficiales con manifest y vistas nuevas. Conserva las regresiones de Iglesias e Identidad.
- Hook rechaza suite, manifest o formulario eliminados solo del índice; positivo exige las tres suites PostgreSQL.
- Contrato de consulta pública exige fuente/versión/alcance y evita simular versiones mutables de registros oficiales; política de permisos intacta. Smoke del servidor añade catálogos y gestión anónima rechazada.
- Motivo: impedir que pase un índice incompleto del incremento autorizado. Dependencias y lock no cambian; resultados en ../proyecto-ecclesia/docs/estado-producto.md.

# Incremento Identidad — 1 de noviembre de 2026

- Pipeline obligatorio de Identidad: suite, migración, vistas, tipos, ejecución PostgreSQL y mínimos por suite sin omisiones. Smoke amplía entrada y rechazo anónimo de usuarios.
- Política OpenAPI para perfil y logout; regresiones de contrato de cuentas y permisos, sin ampliar accesos a otros dominios.
- Hook conserva regresiones previas y rechaza suite de Identidad eliminada del índice; total histórico se reemplaza por mínimos y presencia de ambas suites.
- Contexto vigente permite desarrollo autorizado sin ceremonial de Fase 0. Dependencias y lock del arnés se conservan.

Ver [alcance y evidencia](docs/incremento-identidad.md).

# Incremento R1/R2/R3 — 1 de noviembre de 2026

- R1: la regresión del índice exige 70 pruebas PostgreSQL de producto, incluidas 13 de búsqueda literal; conserva el control del índice y los cuatro rechazos reales.
- R2: atributos LF para texto y conservación binaria, sin normalización masiva.
- R3: README/AGENTS y registro de estado con URLs/SHA base publicados, evidencias identificadas y límites H01/H02/H08/H09. Autorización para commits/publicación no se registra como aprobación docente.

Resultados ejecutados en [estado y evidencia](docs/estado-r1-r3.md). Versiones y locks no cambian; avisos de herramientas R4 fuera de este incremento.

## Historial conservado

# Revisión 03 — arnés 0.3.0

1 de noviembre de 2026, America/Mexico_City. Integra módulo Iglesias real: Prisma/generación, compilación estricta, lint/formato, arquitectura de todas las fuentes y PostgreSQL aislado con Vitest/Supertest/cobertura. Mantiene verificaciones de contrato y regresiones históricas. El gate de producto no depende de scripts package.json y verifica cobertura por archivo. Hook materializa índice y prepara lock propio offline sin scripts; no usa node_modules de working tree. Requiere tener caché preparada con npm ci; fallo de instalación es bloqueo, no omisión de producto. No prueba validación docente ni portabilidad a otro dominio.

Instalación: npm ci en ambos hermanos, npm run generate en proyecto, npm run check -- ../proyecto-ecclesia desde arnés. Hook solo en raíz Git independiente después de autorización: node scripts/install-hook.mjs <raíz-proyecto>. Revisar fingerprint y no sobrescribir hook ajeno. No se crearon repositorios de entrega en esta revisión. Evidencias externas de snapshot/producto están en evidencias-revision03/.

Lo siguiente conserva documentación histórica; las frases de bloqueo total de código por H02 se sustituyen por el pipeline anterior.

# Cambios del arnés

## 0.1.0 del 1 de noviembre de 2026

Creación del arnés inicial por encargo de continuación de Ecclesia. Se añaden reglas siempre/nunca, cinco plantillas, checklist, contexto de proyecto y reglas de dependencias para un monolito modular. Se incorporan validación de OpenAPI, comprobación de trazabilidad, lint, formato y pruebas positivas/negativas de las herramientas. El hook inicial protege entregas documentales y bloquea código de producto hasta integrar su puerta de calidad.

Motivo: el ZIP de requisitos no contenía arnés y sus 23 preguntas siguen abiertas. Esta versión impide tratar suposiciones como respuestas y evita confundir revisión documental con pruebas del sistema. Módulo de referencia, pruebas de producto, cobertura y portabilidad académica pendientes. Los resultados reales se registran en evidencias del proyecto; no se inventan errores recurrentes del alumno.

## 0.2.0 del 1 de noviembre de 2026 — revisión 02

Correcciones incrementales autorizadas a partir de la auditoría real de revisión 01. H03: snapshot exacta del índice con cotejo de blobs, preservación de cambios, rechazo de referencias externas y fijación SHA-256 de la versión del arnés. Instalador compatible con alias cortos de rutas Windows y conservación de hooks ajenos. H04: TypeScript fijado, análisis previo a compilación e inventario de fuentes comparado con grafo. H05: límites hacia composición y carpetas permitidas. H11: ADR/bitácora obligatorios y matriz independiente de seguridad efectiva del contrato.

Se añaden regresiones positivas/negativas y muestras contractuales de H06/H07/H08/H13. Contrato y matriz vigente H12 documentados en el proyecto; 23 PC y cinco ADR continúan pendientes. Se conservan evidencias e historial 0.1.0 sin convertirlos en resultados de 0.2.0. H02 y cobertura de producto siguen pendientes. No se crean commits/remotos ni se atribuye revisión humana.

El runner limpia el contexto heredado de node:test para ejecutar realmente las pruebas internas del hook durante regresiones. Se verifica el conteo ejecutado y se rechazan rutas que colisionan al materializarlas y enlaces en el índice. Esta mejora surgió de revisar salidas reales, no de un fallo atribuido al alumno.
