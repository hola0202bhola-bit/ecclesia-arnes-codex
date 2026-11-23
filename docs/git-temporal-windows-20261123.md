# Git temporal y rutas del hook — 23/11/2026

La revisión combinada de los PR #3/#4 de la aplicación no completó el gate anterior. No se atribuye ese fallo al producto ni se suman sus pruebas separadas como un gate aprobado.

## Causa reproducida y corrección

Con TEMP separado del arnés, Git/MSYS puede representar el repositorio temporal bajo /tmp. El instalador anterior calculaba `relative(repo, home)` en Node/Windows y recorría esa ruta con `cd` de sh. Atravesar los padres del punto de montaje no conduce al mismo destino. Una reproducción focalizada con el instalador original falla con `cd: ../../../ecclesia-arnes-codex: No such file or directory`.

Git ejecuta pre-commit desde la raíz del árbol de trabajo. El bootstrap usa ahora `process.cwd()` y `resolve()` de Node para obtener ambos destinos nativos, sin recorrer padres con sh. Conserva ruta relativa para que las dos carpetas puedan trasladarse juntas; las rutas absolutas entre unidades también las resuelve Node. No cambia fingerprint ni autorización de --refresh, materialización/cotejo de blobs, lock offline, pruebas, umbrales o exclusiones.

Una regresión crea el repositorio dentro de un TEMP propio con espacios y apóstrofo, y ejecuta el hook real con ese mismo TEMP. Se comprobó que falla con el instalador original; debe pasar con el corregido. Los escenarios anteriores conservan sus aserciones de aceptación/rechazo y preservación del índice/directorio.

## Fallos de entorno distintos

En el proceso restringido de esta sesión Windows impidió iniciar sh con NtCreateDirectoryObject/0xC0000022. La misma prueba con permisos normales de Windows alcanzó y reprodujo el defecto de rutas. La comprobación final debe ejecutarse con permisos que permitan Git y PostgreSQL efímero, sin modificar permisos globales del sistema.

El Permission denied sobre objetos Git de la revisión anterior fue un fallo de preparación antes de validar producto. La causa exacta de aquel rechazo de archivo no se ha demostrado: no debe confundirse con el defecto de rutas ni afirmarse corregida por desactivar core.fscache. Las pruebas locales de init/add con contenido repetido pasaron tanto con configuración normal como con fscache=false. No se incorpora ese cambio de configuración ni reintento silencioso al arnés. Cualquier fallo persistente o desconocido debe detener el gate y conservar su salida.

La primera pasada completa de esta corrección volvió a fallar en add, antes del hook de producto: 110/111 arnés, sin omisiones. Una reproducción exacta de seis preparaciones obtuvo tres rechazos (uno con configuración normal y dos con fscache=false). El destino del objeto no existía, el directorio permitía una escritura de diagnóstico y hash-object pudo guardar después el mismo contenido. Se demuestra un rechazo transitorio al finalizar objetos, independiente de la caché; no se identificó el proceso o filtro de Windows que lo ocasiona. El [código de Git](https://github.com/git/git/blob/master/object-file.c) ubica ese mensaje en la finalización mediante enlace/rename, no en la validación de la aplicación.

El helper git-fixture limita la recuperación a git add de copias sintéticas en Windows y al diagnóstico exacto de objeto suelto con Permission denied. Como máximo cuatro intentos, con esperas de 200/400/800 ms; registra cada fallo previo en la salida. Un cuarto fallo conserva el estado no cero y aborta. No repite hooks, errores de validación, permisos de archivos fuente, bloqueo del índice, fallos de inicio ni mensajes adicionales desconocidos. Seis regresiones comprueban esos límites. Tras preparar el índice se ejecutan sin cambios todos los controles y cotejos de blobs; recuperar una preparación no equivale a aprobarlos.

La primera caché offline anterior estaba incompleta. En una copia limpia se prepara con `npm ci --ignore-scripts --no-audit --no-fund` en ambos repositorios, usando la misma caché que heredarán los snapshots. TLS permanece verificado; en Windows puede usarse NODE_USE_SYSTEM_CA=1. No se elimina --offline ni se enlazan dependencias del working tree al snapshot.

## Reproducción

Instalar los locks en dos copias hermanas limpias; definir TEMP/TMP en una carpeta de trabajo separada y accesible, y una caché npm propia. Ejecutar desde el arnés `npm run check -- ../ecclesia-sistema`. No debe ser necesario situar TEMP por encima del arnés. Conservar logs, árboles de entrada, huellas antes/después y los 67 escenarios del índice. Un fallo de entorno no es un gate aprobado.

Documentación primaria: [Git githooks](https://git-scm.com/docs/githooks), [rutas de MSYS2](https://www.msys2.org/docs/filesystem-paths/). No se realizan fusiones, despliegues ni conexiones a bases reales; la aceptación docente continúa pendiente.
