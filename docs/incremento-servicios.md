# Gate del incremento servicios y pláticas

2 de noviembre de 2026. Producto: [ecclesia-sistema](https://github.com/hola0202bhola-bit/ecclesia-sistema). Fuente y uso en `../proyecto-ecclesia/docs/incremento-servicios.md`; RF13–15/P078–079. Se conservan las suites de Iglesias, Identidad, gestión/INEGI y Patrimonio, incluido el ejemplo exacto 35.5.

El pipeline exige `tests/servicios.test.ts`, la migración aditiva `202611020002_servicios`, las dos vistas y la comprobación de tipos de la suite. Comprueba resultados semánticos de modalidades, dos ediciones simultáneas por recurso, rollback de auditoría, CSRF/Origin, escape EJS y actualización desde esquema previo. No se acredita el módulo sumando casos triviales ni aumentando mínimos históricos: la nueva suite necesita sus operaciones y escenarios reales.

El smoke del servidor compilado comprueba las dos consultas públicas JSON/EJS y el rechazo de gestión anónima. Contrato y matriz mantienen GET público y POST/PATCH de administrador; solo se añaden lecturas de tipos. Las pruebas del índice rechazan suite/migración/formulario ausentes y modalidad alterada en el índice aunque el archivo de trabajo sea correcto; verifican conservación del índice/archivos. Las regresiones previas permanecen.

Ejecutar `npm run check -- ../proyecto-ecclesia`. Reportes locales reproducibles en producto `evidence/` y `coverage/`, excluidos de Git. Resultado integral documentado en `../proyecto-ecclesia/docs/estado-producto.md`. No acredita inscripción, reserva, agenda individual, cantidades finales ni aceptación académica.
