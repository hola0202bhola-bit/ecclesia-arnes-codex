# Revisión 03 — arnés 0.3.0

1 de noviembre de 2026, America/Mexico_City. Integra módulo Iglesias real: Prisma/generación, compilación estricta, lint/formato, arquitectura de todas las fuentes y PostgreSQL aislado con Vitest/Supertest/cobertura. Mantiene verificaciones de contrato y regresiones históricas. El gate de producto no depende de scripts package.json y verifica cobertura por archivo. Hook materializa índice y prepara lock propio offline sin scripts; no usa node_modules de working tree. Requiere tener caché preparada con npm ci; fallo de instalación es bloqueo, no omisión de producto. No prueba validación docente ni portabilidad a otro dominio.

Instalación: npm ci en ambos hermanos, npm run generate en proyecto, npm run check -- ../proyecto-ecclesia desde arnés. Hook solo en raíz Git independiente después de autorización: node scripts/install-hook.mjs <raíz-proyecto>. Revisar fingerprint y no sobrescribir hook ajeno. No se crearon repositorios de entrega en esta revisión. Evidencias externas de snapshot/producto están en evidencias-revision03/.

Lo siguiente conserva documentación histórica; las frases de bloqueo total de código por H02 se sustituyen por el pipeline anterior.

# Arnés inicial para Codex

Versión 0.1.0, 1 de noviembre de 2026. Carpeta independiente del proyecto, preparada para su propio repositorio. Contiene contexto genérico, reglas para Express, cinco plantillas, checklist, verificaciones iniciales y hook instalable. **No es todavía el arnés v1 completo del curso:** falta el módulo de referencia y la integración de pruebas/cobertura del producto.

## Instalar y comprobar

Prerrequisitos: Node.js 24 LTS, npm, Git para instalar el hook y acceso al registro npm para instalar herramientas. Dependencias de desarrollo fijadas en package-lock.json, sin dependencias de producción.

1. Situar `arnes-codex/` y `proyecto-ecclesia/` como carpetas hermanas.
2. Dentro del arnés, ejecutar `npm ci`.
3. Ejecutar `npm run check -- ../proyecto-ecclesia`.
4. Revisar el resultado y las exclusiones: el verde corresponde a contrato y herramientas, no a sistema implementado.
5. Cuando el proyecto sea un repositorio Git independiente, ejecutar `node scripts/install-hook.mjs ../proyecto-ecclesia`. El instalador rechaza sobrescribir un hook o configuración distinta. Después comprobar con `git hook run pre-commit` desde el proyecto.

Si la red corporativa requiere certificados de Windows, configurar la confianza del runtime según la organización. En esta sesión se usó Node con `--use-system-ca`; no se desactivó la validación TLS. No se copian credenciales ni certificados al paquete.

## Comandos reales de esta versión

| Comando desde el arnés                                  | Alcance                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`                                          | ESLint de scripts y configuración del arnés                                                                        |
| `npm run format:check`                                  | Prettier sobre arnés, sin reescribir fuentes originales                                                            |
| `npm test`                                              | Pruebas del arnés con node:test; incluyen reglas de dependencias con casos positivos y negativos                   |
| `npm run contract -- ../proyecto-ecclesia/openapi.yaml` | Validación estructural de OpenAPI y referencias                                                                    |
| `npm run check -- ../proyecto-ecclesia`                 | Los anteriores y consistencia de artefactos; falla si encuentra código de producto sin puerta de calidad integrada |
| `node scripts/install-hook.mjs <ruta-proyecto>`         | Instala hook local sin publicar ni crear commits                                                                   |

Las pruebas de `node:test` son de las herramientas iniciales. El stack propuesto del producto sigue siendo Vitest y Supertest; no se sustituye su cobertura por estas pruebas. El hook bloquea si aparece `src/` con código de producto, hasta que se integre la puerta de calidad real del producto en una nueva versión revisada del arnés. No ocultar esa falta con un comando que siempre devuelve éxito.

## Reutilizar en otro proyecto

Mantener `core/` genérico y adaptar `stacks/` al stack. Completar `plantilla-proyecto/PROYECTO.md`, añadir su arquitectura y contrato y ensamblar AGENTS.md con las reglas base y del proyecto. Ajustar las comprobaciones documentales si no usa los mismos prefijos; no copiar datos, requisitos o reglas de Ecclesia como dominio de otro cliente. Instalar el hook en ese repositorio y repetir casos negativos. Esta guía no acredita la prueba de portabilidad de semana 8: faltan repositorio pequeño, módulo completo, video y nota de ajustes.

## Componentes y estado

| Componente                                 | Estado actual                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Siempre/nunca y contexto                   | Preparado, revisión humana pendiente                                      |
| Arquitectura y cinco ADR                   | En proyecto; propuestas completas para revisar                            |
| Cinco plantillas                           | Disponibles en core/prompts                                               |
| Reglas de dependencias                     | Configuración y pruebas con fixtures; sin código de Ecclesia para evaluar |
| Lint, formato, contrato, hook              | Herramientas iniciales, resultados en evidencias                          |
| Módulo Iglesias completo                   | Pendiente, no se fabrica como ejemplo sin revisar                         |
| Pruebas, cobertura y arranque del producto | Pendientes                                                                |
| Portabilidad académica                     | Pendiente                                                                 |

## Fuentes de la configuración

[OpenAI Docs sobre AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) confirma el archivo de contexto por proyecto. Las reglas y plantillas de esta entrega se redactaron para este encargo; no se tomó un arnés público completo. La configuración de dependencias se basa en [la documentación de dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md). El contrato usa [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html).

## Revisión 02 — 0.2.0, 1 de noviembre de 2026

El texto 0.1.0 anterior se conserva como historial. Esta revisión corrige H03/H04/H05/H11; el arnés v1 del curso sigue incompleto por H01/H02. TypeScript 5.9.3 y Ajv 8.20.0 son herramientas fijadas del arnés, no una aprobación del stack del producto.

- Ejecutar npm ci y npm run check -- ../proyecto-ecclesia. Para arquitectura aislada: npm run architecture -- <proyecto>. El inventario independiente de fuentes exige analizar cada archivo JS/TS (incluidos tipos, fuentes aisladas y carpetas llamadas dist/coverage dentro de src); cero módulos con fuentes presentes es error.
- El hook instalado ejecuta check-index.mjs. Construye un árbol real con git write-tree, materializa cada blob con git cat-file sin filtros ni checkout y coteja su OID con git hash-object --no-filters. Los archivos sin staging no entran. Una eliminación preparada elimina el archivo del snapshot aunque exista en working tree. No usa stash/reset/add/commit. Conserva índice y working tree; write-tree puede actualizar objetos y caché interna de Git.
- Antes de importar el arnés, el hook coteja SHA-256 de sus archivos contra la versión presente al instalarlo (excluye node_modules y .git; incluye lock). Cambiar scripts/tests/configuración/documentación del arnés exige revisar, ejecutar check y reinstalar explícitamente con node scripts/install-hook.mjs <proyecto> --refresh. Ese flag solo refresca un hook identificado de esta versión; no sobrescribe hooks ajenos. Para el hook 0.1 sin marcador, conservar copia y revisar manualmente su sustitución. La fijación no certifica una aprobación humana ni sustituye la integridad de instalación npm ci.
- npm run check:index -- <repositorio> comprueba directamente su índice. Ejecutarlo sin repositorio Git no es válido. El hook repite lint/formato, pruebas de herramientas y contrato contra la snapshot. Solo excluye hook-regression.test.mjs dentro del propio hook para evitar recursión; la comprobación principal y npm test sí ejecutan los doce casos reales de Git.
- Los tests reciben ECCLESIA_PROJECT con el directorio comprobado; no leen una copia reparada de openapi.yaml para dar verde a otra snapshot. Referencias OpenAPI externas se rechazan para impedir lecturas fuera de ese contenido. Enlaces simbólicos, submódulos y entradas sin resolver se rechazan en esta versión, en vez de validar contenido externo.
- La matriz explícita de seguridad está fijada en stacks/express/ecclesia-security-policy.json y tiene vista en docs/matriz-seguridad-revision02.md. Compara ruta/método, ID, roles, esquemas y todas las alternativas OR de security. Una ruta nueva o un cambio de permisos exige revisión de esa matriz; PC-19 sigue pendiente. El conteo RF/PC/operaciones no es cobertura de seguridad.

Se conservan los cinco casos JavaScript anteriores. Las nuevas regresiones incluyen TypeScript, composición, carpeta no permitida, inventario y exposición privada; las muestras de contrato cubren H06/H07/H08/H13. Las evidencias vigentes se encuentran en ../evidencias-revision02/. No son pruebas de servidor, transacciones, aislamiento de usuarios, BD, cobertura o aceptación de Iglesias.

La instalación en esta revisión notificó avisos moderados de la cadena de ESLint/minimatch; consultar el diagnóstico guardado. Se actualizó Ajv para retirar el aviso de la versión inicialmente probada. No se aplicó npm audit fix --force ni se degradó ESLint. El modo offline de audit no acredita ausencia de avisos.

Soporte técnico contrastado con la documentación primaria de dependency-cruiser: https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md (tsPreCompilationDeps requiere TypeScript resoluble junto a la herramienta).

El runner elimina NODE_TEST_CONTEXT heredado al iniciar sus pruebas: un hook invocado desde una regresión debe ejecutar su suite interna, sin que node:test la omita por contexto recursivo. Las regresiones lo comprueban. Se rechazan además colisiones de mayúsculas y nombres no materializables de forma portable; nunca se colapsan dos blobs distintos en una misma ruta de Windows.
