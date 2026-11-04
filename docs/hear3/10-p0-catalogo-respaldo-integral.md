# Hear 3.0 · P0 D-051 — Catálogo local y respaldo completo de registros V3

**Estado:** nuevo contrato y almacenamiento **aislados** en rama de desarrollo; la aplicación pública no utiliza estos módulos. **Requisitos:** D-042–053, D-059–060, D-063 y específicamente D-051=D/C.

## Información preservada

El catálogo versionado `hear3-catalog-v1` incorpora tres colecciones con referencias verificadas:
- `devices`: identificadores, nombres y categoría de los equipos (auriculares, automóvil, altavoces, ecualizador de aplicación e interfaz de audio).
- `profiles`: identificadores únicos, equipo asociado, nombre y configuración gráfica con 2–31 bandas, frecuencias, procedencia e información verificable de controles. El esquema no considera el equipo calibrado por el mero hecho de haber ingresado las bandas.
- `results`: sesiones históricas referidas a un perfil, fecha, carácter provisional/inconcluso, procedencia experimental/manual/legado, EQ original **separado** de la versión editada, observaciones de tonos por canal y registro de cambios de ganancia. No se calcula automáticamente un EQ ni se afirma que una ganancia sea acústicamente segura por guardarla.

Incluye una referencia opcional a `activeProfileId`. El contrato rechaza IDs duplicados, referencias rotas, bandas de EQ no compatibles, campos desconocidos, datos de fotos embebidas, pruebas inventadas y esquemas futuros que no conoce; nunca descarta silenciosamente información extraña para que el archivo «parezca válido».

## Persistencia y respaldo

`src/hear3/catalog-backup-store.mjs` usa dos copias alternas en almacenamiento local con verificación de lectura y checksum de corrupción accidental. Si no es posible verificar la escritura, se intenta almacenamiento de sesión y finalmente copia **volátil** exportable con advertencia. En caso de corrupción sin copia íntegra, preserva los datos dañados y trabaja temporalmente, sin sobreescritura silenciosa.

La exportación estructurada `hear3-catalog-backup-v1` incluye los **tres conjuntos** del catálogo y sus relaciones. La integridad FNV-1a es **solo detección de daño accidental**, nunca autenticidad, cifrado ni protección contra un archivo malicioso.

Importación en dos pasos: `preview(text,{mode})` (sin escribir) y `commit({userInitiated:true,confirmReplace})`. Hay dos modos explícitos:
- `merge-new` (predeterminado): añadir registros solamente si todos sus identificadores son nuevos y las referencias son válidas; cualquier colisión bloquea la operación en lugar de escoger un ganador silencioso.
- `replace`: reemplazar el catálogo entero tras una confirmación **independiente** si hay datos existentes. La vista previa expone el número de dispositivos, perfiles y resultados entrantes y resultantes.

Antes de importar se compara revisión, contenido y durabilidad para rechazar vistas previas desactualizadas. La comprobación **no es transacción atómica entre pestañas**; tal garantía requiere un diseño adicional basado en almacenamiento transaccional, que sigue pendiente.

El módulo no produce sonido, no ejecuta un examen, no cambia la selección de salida y no transmite nada a servidores.

## Límites y compatibilidad del legado

El sitio Hear 2.0 utiliza hoy `audiocal-hear-profiles-v1`, un esquema distinto, con campos y observaciones históricas propios. **No se toca, borra ni convierte automáticamente**: la transformación segura del formato V2, la preservación de todos sus campos y la compatibilidad de ida/vuelta requieren una migración especificada y probada por separado. Este PR introduce infraestructura de catálogo para Hear 3.0, **no afirma que el historial V2 ya se haya transferido**.

No es todavía una interfaz de administración final D-051: faltan navegación, selección de perfiles y resultados, borrado individual/global con gestión de referencias compartidas, pruebas de concurrencia entre pestañas, exportaciones descargables/lectura en UI, pruebas de navegadores con almacenamiento bloqueado y validación de migración V2.

## Criterios de aceptación incluidos

`tests/hear3-catalog-backup.test.mjs` incluye 19 pruebas Node sobre integridad referencial, conservación de resultados/EQ original y editado, vista previa sin escritura, importación de registros nuevos, rechazo de duplicados, confirmación de reemplazo, checksum, comparaciones de revisión, copias corruptas, salida de almacenamiento temporal, límites y aislamiento respecto del almacén heredado de Hear 2.0.

**Puerta D-063:** el CI de GitHub, pruebas browser y validación del flujo completo deberán ser confirmados antes de cualquier fusión o declaración de un P0 «completo». El catálogo no sustituye al algoritmo de EQ pendiente, ni acredita protección acústica mediante dBFS.
