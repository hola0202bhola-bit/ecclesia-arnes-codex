# Arquitectura del arnés — revisión 03

Vista vigente, 2026-11-01: check.mjs coordina herramientas, contrato general y subconjunto ejecutable, inventario/grafo de ocho fuentes y gate real de Iglesias. check-product.mjs fija generación Prisma, tipos/compilación, lint/formato y run-product-tests.mjs: PostgreSQL temporal real, migración/seed, Vitest/Supertest, cobertura por fuente y smoke HTTP del servidor compilado. El gate no delega su aceptación a scripts test de package.json.

El hook conserva materialización/cotejo de blobs del índice y fingerprint de versión del arnés. Para producto prepara node_modules en el snapshot con npm ci --offline --ignore-scripts desde su lock, sin enlazar dependencias de la copia de trabajo. Si falta caché falla explícitamente. No modifica el índice ni los archivos de trabajo; los procesos y directorios de prueba son temporales. Las doce regresiones históricas usan fixtures sin producto; otra prueba agregada cubre cinco escenarios completos de índice con producto.

Solo src/composition/server.ts se excluye de cobertura instrumentada y se comprueba con smoke HTTP separado. El núcleo Iglesias usa su propio contexto/ADR; los nombres de PC, schemas y rutas del gate todavía requieren adaptación al cambiar dominio. No se acredita por ello portabilidad académica.

Lo siguiente es descripción histórica de la versión inicial. Sus frases de producto pendiente se sustituyen por la vista vigente anterior.

El arnés se mantiene en un repositorio separado del producto. Separa acuerdos reutilizables, configuración del stack y contexto de cada proyecto, conforme a P135 y P165 del enunciado de Ecclesia.

```text
core/                 acuerdos, patrones, cinco prompts y checklist
stacks/express/       configuración comprobable de dependencias
plantilla-proyecto/   guía de contexto que adapta el alumno
scripts/              validación del contrato, artefactos y hook
tests/                pruebas positivas y negativas de las herramientas
package-lock.json     versiones reproducibles de las herramientas
```

`scripts/check.mjs` coordina lint, formato, pruebas de las herramientas, validación del contrato y trazabilidad. `install-hook.mjs` conecta esa comprobación al repositorio objetivo sin hacer commits. La versión 0.1 protege la entrega documental y bloquea código de producto hasta integrar una puerta de calidad que ejecute las comprobaciones reales del sistema. Los siete casos actuales usan fixtures JavaScript y contratos de prueba; no miden cobertura de un producto TypeScript.

Las reglas del producto se mantienen en su propio `docs/ARCHITECTURE.md` y sus ADR. La instancia de Ecclesia propone módulos por dominio y cuatro capas, pero esa decisión no se convierte en un requisito de otro cliente al reutilizar el arnés. Los prefijos RF y PC y el contrato JSON compatible con YAML que revisa el comprobador documental deben adaptarse si el proyecto siguiente usa otra convención.

El módulo completo de referencia y la integración de las pruebas Vitest/Supertest del producto están pendientes. Esta arquitectura del arnés no certifica la portabilidad final exigida por el curso.
