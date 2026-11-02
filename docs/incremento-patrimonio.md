# Gate del incremento de patrimonio

2 de noviembre de 2026. Bases: aplicación b23b6b62e2dd3ec8ce7531fd075a4965928e6961 y arnés 453eb8368090e3f83b066905087ec0625e1859e3. Reglas leídas en P067–076/P092–093, RF07–12 y ADR005; no hay respuestas nuevas de cliente.

Snapshots incompletos se rechazan antes de instalar dependencias o repetir herramientas. Los completos ejecutan el mismo gate íntegro. Las regresiones de eliminación preparada comprueban este rechazo; el margen de tiempo de la suite se amplía para sus escenarios adicionales, sin reducir ninguna aserción.

`npm run check -- ../proyecto-ecclesia` conserva todas las regresiones previas. Exige cuarta suite, migración aditiva y tres vistas de patrimonio. Además del mínimo de pruebas, verifica presencia y éxito de las regresiones del ejemplo original, concurrencia, rollback de auditoría, búsqueda sobre misma pieza, CSRF y actualización desde esquema anterior. No delega el resultado al script test del producto.

Contratos: DTO ejecutable de patrimonio en ambas especificaciones; matriz de permisos intacta: público lee, solo ADMIN_IGLESIA propio captura. Regresiones negativas de fecha exclusiva, booleano, campos, versión y datos extra; índice decimal como cadena. RF11 activación conserva estado de diseño pendiente.

Índice Git: exige también suite/migración/formulario preparados y rechaza una alteración de la bonificación INAH en el blob aunque working tree conserve la fórmula correcta. El rechazo proviene de ejecutar las pruebas reales, no de buscar texto de la fórmula. Se mantiene materialización exacta y preservación del índice/working tree. No se desactiva gate ni se rebaja cobertura.

Smoke del servidor compilado: añade ranking API/EJS, consulta de objetos y rechazo anónimo de gestión patrimonial. PostgreSQL aislado, cuatro migraciones y doble seed; no usa bases del alumno. Sin descarga geográfica en pruebas. Límites funcionales y resultados en `../proyecto-ecclesia/docs/incremento-patrimonio.md` y `estado-producto.md`.
