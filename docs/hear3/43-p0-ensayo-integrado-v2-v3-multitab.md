# Hear 3.0 — D-051/D-059/D-060: ensayo conjunto de dos respaldos y carrera de pestañas V2

**07/11/2026. Estado:** prueba automatizada de integración en navegador; **no** evidencia de recuperación en hardware físico ni garantía ACID entre dos almacenes.

## Qué verifica

El archivo `tests/browser/hear3-dual-archive-restore.spec.cjs` ejecuta dos casos en Chromium/WebKit y las dimensiones de pantalla de CI:

1. Dos contextos de navegador **aislados** crean cada uno un catálogo V3 con equipo, perfil, EQ original/actual y resultado, además de un historial V2 independiente. El historial incluye medidas diferenciadas por oído, registros de barrido, ajustes y campos desconocidos.
2. Capturan **dos JSON diferentes**: `hear3-catalog-backup-v1` y `hear3-lossless-v2-history-vault-v1`. Verifican que los campos históricos opacos no aparezcan falsamente en el respaldo del catálogo V3.
3. El destino previsualiza y comprueba ambos archivos **antes** de modificar el almacenamiento. Restaura cada uno dentro del protocolo cooperativo Web Locks y mediante confirmaciones expresas simuladas por el test. Recarga y compara exactamente catálogo y texto histórico original; verifica durabilidad local informada.
4. Restaura después los **dos respaldos anteriores del destino**, recarga y compara los datos originales. Las claves históricas de Hear 2.0 de origen y destino permanecen intactas.
5. Dos pestañas del **mismo contexto** intentan guardar dos archivos V2 distintos tras previsualizar la misma revisión. Se exige un único ganador y rechazo por revisión obsoleta, preservando el archivo resultante sin mezcla.

## Limitaciones y política

- La restauración de V2 y V3 son **dos operaciones distintas**. Web Locks serializa escrituras que voluntariamente siguen ese protocolo; no existe commit atómico único para los dos archivos ni garantía frente a scripts que ignoren el bloqueo, cierre brusco o pérdida de energía.
- El verificador FNV-1a solo detecta alteraciones accidentales; no demuestra autenticidad, firma, seguridad criptográfica ni prevención de ataques.
- Persistencia informada por `localStorage` y recarga automatizada no implica permanencia en dispositivos reales, navegación privada o cuotas del sistema.
- Los datos V2 son evidencia opaca íntegra; no se reinterpretan como umbrales auditivos ni curvas EQ clínicamente calibradas.
- No se inicia sonido, no se selecciona salida física, no se activa EQ, no se cambia la página estable Hear 2.0 y **no se deben actualizar a `verified`** los requisitos de D-063 sin las evidencias originales.
- La restitución dual automática al fallar el segundo archivo **no** se implementa; el usuario conserva ambos respaldos previos para restauración manual tras diagnosticar el fallo. Una recuperación realmente transaccional exige un almacén/journal único y ensayos de corte físico.

## Procedimiento técnico posterior

Mantener separados ambos archivos al migrar equipos. Antes de cambiar datos: inspeccionar los dos, conservar copias recuperables y exigir confirmaciones individuales. Después: recargar, contrastar resultados/mediciones originales y validar que la ruta física permanece bloqueada hasta reconfirmación.

Las 13 auditorías de `docs/hear3/release-evidence-gate.json` y el protocolo de `42-p0-protocolo-hardware-y-rollback.md` continúan pendientes de ejecución en laboratorios/dispositivos reales. **No declarar listo Hear 3.0 estable.**
