# Regla de capas reutilizable

Dominio puro y puertos no importan HTTP, ORM ni infraestructura. Aplicación coordina casos mediante esos puertos. Presentación convierte entradas y salidas, sin reglas ni repositorios. Infraestructura implementa puertos. La composición conecta todo. Ajustar nombres al stack, conservando el sentido de dependencias. La arquitectura concreta y excepciones se revisan en cada proyecto; no basta una expresión regular para probar ausencia de negocio en un controlador.

## Precisiones comprobables de revisión 02

Solo composition puede construir adaptadores de varias capas y módulos. Ninguna capa inferior importa composition. Todo archivo de src debe estar en composition, modules/<módulo>/{domain,application,presentation,infrastructure} o shared/{domain,application,presentation,infrastructure}. Una fuente aislada en otra carpeta también falla. No se admiten cruces internos entre módulos ni shared hacia módulos; las excepciones necesitan revisión explícita, no renombrar una carpeta. El inventario de fuentes se coteja con el grafo para impedir éxito por omisión de TypeScript. Esto no demuestra ausencia de reglas de negocio escritas dentro de un controlador.
