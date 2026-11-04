## Entrega del 4 de noviembre de 2026 — RF05 geográfico

Desde esta carpeta: npm ci y **npm run check -- ../proyecto-ecclesia**. Conserva las 380 pruebas previas del producto y 97 del arnés; añade suite PostgreSQL INEGI, contratos/fuentes/migración/vista y smoke compilado sobre CT20 efímero, sin usar DATABASE_URL ajena. El producto mantiene UI aprobada y Teams excluido. [Flujo, comandos y guion](../proyecto-ecclesia/README.md), [resultados finales](../proyecto-ecclesia/docs/estado-producto.md). Los resultados anteriores que siguen son históricos; RF05 geográfico no significa catálogo nacional completo.

Validación final UI/RF04/RF11: `npm run check -- ../proyecto-ecclesia`, salida 0, **97/97 arnés y 380/380 producto**, sin omitidas. **51 escenarios del índice** preservados (uno válido, 50 rechazos). PostgreSQL 18.6, diez migraciones, dos bases efímeras, doble seed y smoke compilado CSS/CSP/cierre/criterios/huellas CT20. 35.5 conservado. Recorrido visual separado en el estado del producto; PC04/08 provisionales y RF05 nacional pendiente.

## Incremento final: interfaz, RF04 y RF11

Desde aquí: `npm run check -- ../proyecto-ecclesia`. Conserva las suites y regresiones anteriores; exige assets CSS/SVG locales, componentes EJS, décima migración/suite, contratos de cierre y criterios, concurrencia, rollback, permisos y cálculo exacto. El smoke compilado añade CSS/CSP, cierre/reapertura y huellas de datos CT20 preservadas, activación y uso inmediato por ranking. Las regresiones del índice rechazan también CSS/vistas/suite/migración ausentes y activación sin concurrencia.

RF04: Coordinación/administrador propio. RF11: solo Coordinación. No se amplían permisos sobre solicitudes ni captura patrimonial. PC04/08 provisionales y RF05 nacional pendiente. El recorrido visual del navegador se registra por separado en el producto; el gate HTTP no afirma ser una prueba móvil física.

Validación integral CT20 ejecutada con `npm run check -- ../proyecto-ecclesia`, salida 0: **94/94 pruebas del arnés y 359/359 del producto**, ninguna omitida. Conservadas las 93/343 anteriores. **44 escenarios del índice**: válido aceptado y 43 alteraciones rechazadas, índice/archivos conservados en todos. PostgreSQL 18.6 real en dos bases efímeras, nueve migraciones, doble seed, smoke CT20 compilado y smokes previos aprobados. 48/48 fuentes sin violaciones; cobertura de líneas 98.89% y 35.5 intacto. El arnés permaneció estable durante esta repetición. [Ejecuciones y diagnósticos](../proyecto-ecclesia/docs/estado-producto.md). Sin aceptación humana/docente atribuida.

CT20 — 3 de noviembre de 2026: el gate exige carga/ejecutor, nueve migraciones, ocho localidades con fuentes originales y la suite de 16 casos de demo/RF02. Crea una segunda base ecclesia_demo_test en el mismo PostgreSQL efímero, conserva el seed mínimo y agrega smoke de la ficha compilada con datos CT20. Las copias Git excluyen .demo y lo comprueban antes de preparar archivos; los fixtures históricos sin aplicación siguen verificando solo herramientas. La regresión modifica únicamente el índice para perder un objeto y exige rechazo por distribución/relaciones. Se conservan todos los checks anteriores. [Uso y controles de la aplicación](../proyecto-ecclesia/docs/demo-ct20.md), [brechas obligatorias](../proyecto-ecclesia/docs/brechas-obligatorias.md).

Validación RF25–31 del 3 de noviembre de 2026: `npm run check -- ../proyecto-ecclesia` terminó con salida 0: **93/93 pruebas del arnés y 343/343 del producto**, conservando las 89/315 anteriores. Producto válido sin omitidas; PostgreSQL 18.6 real, ocho migraciones, doble seed, smoke compilado y 35.5 intacto. Cobertura de líneas 98.89%, 48/48 fuentes analizadas sin violaciones. Los **36 escenarios de índice** aceptaron el válido y rechazaron 35 fallos preparados, preservando índice/archivos en todos. Incluye frontera temporal alterada y prueba fallida pese a script que retorna cero. [Resultados, navegador separado, supuestos y pendientes](../proyecto-ecclesia/docs/estado-producto.md).

El fixture de frontera se formatea antes de prepararlo para exigir rechazo por la regla temporal; el primer diagnóstico que solo rechazó formato no se acredita como ese control. Precomprobación de obligatorios usando exclusivamente el inventario del índice: solo rechaza índices incompletos antes de materializar; los completos conservan cotejo de cada blob y gate completo. Vitest se detiene ante el primer fallo de una copia inválida, mientras el producto válido sigue obligado a todos los mínimos y cero omitidas. Limpieza PostgreSQL temporal con reintentos acotados para bloqueos transitorios de Windows. PC14–19 siguen pendientes, sin aceptación docente ni ampliación provisional de Teams.

RF25–31: gate exige octava suite `tests/solicitudes.test.ts`, migración/seis vistas y regresiones de privacidad, rate limit PostgreSQL, reloj/vencimiento, concurrencia, rollback, CSRF/XSS y actualización con datos previos. Contrato contra respuestas HTTP reales, smoke compilado y mutación de frontera temporal solo en índice. [Uso y supuestos técnicos del producto](../proyecto-ecclesia/docs/adr/010.md). No habilita inventario, correo ni permisos adicionales; PC14–19 siguen abiertas.

Validación RF22–24 del 3 de noviembre de 2026: `npm run check -- ../proyecto-ecclesia` terminó con salida 0: **89/89 pruebas del arnés y 315/315 del producto**, sin omitidas. PostgreSQL 18.6 real aislado, siete migraciones, doble seed y smoke financiero compilado; cobertura de líneas 99.28%. Los 27 escenarios de índice aceptaron el válido y rechazaron 26 fallos preparados conservando índice/archivos. Se conserva 35.5 y todos los módulos anteriores. El índice funcional se validó además de forma independiente. Código del arnés 74738d3 y producto 02be60a; actualización posterior solo de documentación. PC-13/19 y Teams provisional siguen abiertos.

RF22–24: gate exige la séptima suite `tests/diezmos.test.ts`, migración/vistas, regresiones contables reales y contrato sin ampliar permisos. Smoke compilado: captura/corrección, duplicado/versión obsoleta, total exacto, historial, EJS y denegación anónima. La regresión del índice altera un centavo sin tocar la copia de trabajo y comprueba el rechazo. [Uso y supuestos del producto](https://github.com/hola0202bhola-bit/ecclesia-sistema/blob/main/docs/adr/009.md).

Validación RF16–21 del 3 de noviembre de 2026: `npm run check -- ../proyecto-ecclesia` terminó con salida 0, **86/86 pruebas del arnés y 293/293 del producto**. PostgreSQL real, seis migraciones, smoke HTTP y 22 escenarios de índice con preservación comprobada. Se conserva el ejemplo 35.5 y las suites anteriores; PC10–12 y Teams provisional siguen sin confirmar.

Agenda RF16–21: el gate exige tests/agenda.test.ts, migración aditiva y vistas, contratos con permisos explícitos, PostgreSQL/zonas/DST/sustituciones y smoke HTTP compilado de misas. El índice debe rechazar desactivar traslapes aunque el archivo de trabajo esté correcto. [Subalcance del producto](../proyecto-ecclesia/docs/adr/008.md). Teams provisional sin implementar.

Continuación vigente: [Servicios y pláticas RF13–15](docs/incremento-servicios.md). Gate exige quinta suite PostgreSQL, modalidades, transacciones/seguridad, contrato y UI; conserva todas las regresiones anteriores.

# Arnés Codex de Ecclesia

Continuación vigente: [Patrimonio e índice](docs/incremento-patrimonio.md). Gate exige las cuatro suites, ejemplo 35.5, migración y UI, seguridad, rollback, PostgreSQL y rechazo de fórmula alterada en el índice. Las instrucciones de instalación y preservación de snapshots siguientes siguen vigentes.

Continuación vigente: [Iglesias web/catálogos e identidad](docs/incremento-identidad.md). Gate con tres suites de producto, fuentes oficiales, migración aditiva y vistas; se conservan permisos y bloqueos. Dos entregas prioritarias: aplicación y arnés; no se exige cierre formal de Fase 0. Se conserva la verificación de arquitectura/contratos/índice y se incorporan cuentas/sesiones reales y sus regresiones. Estado funcional y evidencia: `../proyecto-ecclesia/docs/estado-producto.md` y `docs/evidencia-identidad.md` en producto.

Clonar como hermanos `proyecto-ecclesia` y `arnes-codex`; Node 24, `npm ci` en ambos, `npm run generate` en producto. Desde este arnés ejecutar `npm run check -- ../proyecto-ecclesia`. No necesita base de datos externa ni cuentas del alumno: PostgreSQL aislado y datos ficticios. Tras gate/revisión, `node scripts/install-hook.mjs ../proyecto-ecclesia` instala hook local sin sobrescribir ajenos; --refresh solo tras revisar cambios legítimos del arnés. Commits nuevos y publicación sin force push autorizados; comprobar SHA remoto.

## Antecedente conservado: R1/R2/R3

# Arnés Codex — estado tras R1/R2/R3

1 de noviembre de 2026, America/Mexico_City. Publicación real: [ecclesia-arnes-codex](https://github.com/hola0202bhola-bit/ecclesia-arnes-codex), base `3d107dab51140b23c594d7da73e5ba9ca82bef7f`; producto [ecclesia-sistema](https://github.com/hola0202bhola-bit/ecclesia-sistema), base `fb3ffc78affdad76ae61b1d5eda7a6694dc5d0b3`. Ambos SHA se comprobaron al clonar de GitHub. Los SHA son bases publicadas, no afirmaciones sobre la subida de este incremento.

Pipeline vigente: lint/formato, 75 pruebas de herramientas, contratos, inventario/arquitectura y producto real con PostgreSQL, migración, doble seed, cobertura y servidor compilado. R1 añade regresiones de consulta literal en el producto; el test del índice del arnés exige 70 pruebas de producto, conservando el rechazo de errores de tipos, suite eliminada, migración rota y test fallido aunque package test salga cero.

Clonar los repositorios en carpetas hermanas con nombres locales `proyecto-ecclesia` y `arnes-codex`:

```powershell
git -c core.autocrlf=true clone https://github.com/hola0202bhola-bit/ecclesia-sistema.git proyecto-ecclesia
git -c core.autocrlf=true clone https://github.com/hola0202bhola-bit/ecclesia-arnes-codex.git arnes-codex
cd proyecto-ecclesia
npm ci
npm run generate
cd ../arnes-codex
npm ci
npm run check -- ../proyecto-ecclesia
node scripts/install-hook.mjs ../proyecto-ecclesia
cd ../proyecto-ecclesia
git hook run pre-commit
```

Node 24 y locks exactos. `.gitattributes` conserva texto LF con `core.autocrlf=true`, y binarios sin conversión. Para un clon viejo con trabajo propio, guardar y revisar cambios antes de actualizar; preferir un clon nuevo. No restaurar archivos ni normalizar en masa sobre cambios pendientes. El hook se instala localmente; no viaja con Git. Tras revisar un cambio legítimo del arnés y ejecutar el gate, refrescarlo explícitamente con `--refresh`; no sobrescribir un hook ajeno.

[Evidencias y trazabilidad vigentes](docs/estado-r1-r3.md). Las rutas antiguas `evidencias-revision02/03` son referencias al paquete externo de entrega, ausente en estos repositorios; no son enlaces utilizables ni dependencias del gate. Los registros siguientes se conservan por historia, con sus límites y resultados propios.

H01 sigue abierto por falta de respuestas/validación del cliente. H02 tiene núcleo técnico demostrado, con aceptación humana/académica y PC02/04/19 pendientes. H08 parcial: validación real solo del incremento, políticas y otros dominios pendientes. H09 publicación cerrada para ambos SHA base; historial desde semana 1 residual sin dispensa. No se declara Fase 0 aprobada ni se inicia Fase 1. R4/dependencias se difiere a un incremento separado.

## Documentación histórica íntegra — revisiones 01/02/03

El estado vigente anterior reemplaza las descripciones antiguas de ausencia total de producto o repositorios. Su texto se conserva a continuación tal como fue registrado.

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
