# Estado y evidencia de R1/R2/R3

Repositorios y SHA base comprobados por clonación desde GitHub el 1 de noviembre de 2026:

- [Arnés](https://github.com/hola0202bhola-bit/ecclesia-arnes-codex/tree/3d107dab51140b23c594d7da73e5ba9ca82bef7f).
- [Producto](https://github.com/hola0202bhola-bit/ecclesia-sistema/tree/fb3ffc78affdad76ae61b1d5eda7a6694dc5d0b3).

Este incremento conserva las versiones del lock, añade .gitattributes y ajusta la regresión positiva del hook para exigir 70 pruebas de producto tras R1. Los 75 tests del arnés incluyen las regresiones de arquitectura/contratos y el hook real con índice válido y cuatro errores preparados. Los fallos provocados en fixtures son el resultado esperado de rechazo, no fallos del gate válido.

Los resultados efectivamente ejecutados están en [verificacion.json](verificacion.json); ver también [el índice de evidencias del producto](https://github.com/hola0202bhola-bit/ecclesia-sistema/blob/main/docs/evidencias-revision04/README.md). La lectura remota final de commits nuevos se informa por separado; no se infiere de los SHA locales ni de estas bases publicadas.

Gate completo ejecutado dos veces con salida 0: copia de trabajo y clones Windows nuevos de los commits R1/R2 con `core.autocrlf=true`. En ambas corridas: 75/75 arnés, 70/70 producto, PostgreSQL 18.6 real, migración, doble seed y smoke compilado. Índice válido aceptado; cuatro errores preparados rechazados, conservando índice y working tree. Siete fuentes medidas: 100% líneas/sentencias/funciones y 96.2% ramas. Las repeticiones internas no se suman como pruebas independientes. Los clones parten de los repositorios locales derivados de GitHub; no acreditan subida de las correcciones.

Las carpetas externas evidencias-revision02/03 de los textos históricos pertenecen al antiguo ZIP `Ecclesia_Fase0_revision_03.zip`; no se incluyeron en los repositorios. No hay enlace local válido hacia ellas ni el gate depende de ellas. No se presentan como ejecuciones actuales. Las evidencias de revisión01 que sí se conservaron están en [el repositorio del producto](https://github.com/hola0202bhola-bit/ecclesia-sistema/tree/fb3ffc78affdad76ae61b1d5eda7a6694dc5d0b3/docs/evidencias).

H01 abierto; H02 aceptación pendiente con PC02/04/19 y revisión humana; H08 parcial; H09 publicación base cerrada e historia P056 residual. No se inventan aprobaciones, retrofechas, bitácoras humanas ni pruebas de móvil/carga/portabilidad/CI remoto. Fase 0 abierta; no Fase 1.
