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
