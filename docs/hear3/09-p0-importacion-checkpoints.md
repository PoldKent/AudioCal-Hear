# Hear 3.0 — P0: revisión e importación de checkpoints locales

**Fuente:** [decisiones D-051, D-054, D-059, D-060 y D-063](https://github.com/PoldKent/AudioCal-Hear/issues/30). **Alcance:** piloto interno y respaldo de **una sesión por perfil**, no respaldo global de dispositivos, historial y ajustes.

## Incremento implementado

- `src/hear3/local-checkpoint-store.mjs` ahora incorpora a sus exportaciones JSON un marcador `integrity: {algorithm:"fnv1a32",value:"..."}` calculado sobre el checkpoint exacto. Detecta alteraciones **accidentales**, **no** es firma criptográfica, autentificación ni cifrado.
- `src/hear3/checkpoint-backup-transfer.mjs` implementa un flujo de **dos pasos**:
  1. `preview(backupText)`: exige JSON y formato conocido, tamaño limitado (1 MiB de texto), esquema de sesión vigente, **mismo perfil y mismos límites digitales**, checksum si está presente y evidencia de respuestas válida. Devuelve cantidad de observaciones, si reemplazaría otra copia, condición de recuperación y advertencias; **no escribe nada**.
  2. `commit({userInitiated:true,confirmReplace})`: requiere una acción explícita, confirmación adicional si hay datos preexistentes, compara el estado local actual con la vista previa para rechazar cambios observables entre ambos pasos, y usa el sistema local verificado para guardar. Si no existe almacenamiento compatible, devuelve `volatile` con advertencia; nunca asegura persistencia sin escritura.
- Un archivo de exportación **anterior**, sin checksum, puede revisarse con validación de esquema, pero la vista previa declara expresamente `legacy-unverified`.
- Importar **no reanuda ni reproduce tonos**. El piloto restaura manualmente la sesión con comprobación de ruta obligatoria y sin autoplay. El archivo no se envía a ningún servidor.
- Piloto `tests/fixtures/hear3-audio-pilot.html`: selector local JSON, botón «Revisar respaldo», descripción de reemplazo y confirmación separada antes de importar. Se desactiva el importador después de iniciar una sesión nueva, para evitar sobreescribir progreso en curso.

## Pruebas de aceptación

- `tests/hear3-checkpoint-backup-transfer.test.mjs`: **15 casos** sobre formato, consentimiento, integridad, compatibilidad de perfiles y límites, reemplazo, corrupción, cambios entre vista previa y escritura, límites de tamaño, aislamiento de perfiles y almacenamiento bloqueado.
- `tests/browser/hear3-audio-pilot.spec.cjs`: **4 casos nuevos** para revisión/importación real en navegador: restauración sin sonido, rechazo de sobrescrituras no confirmadas, archivo dañado y bloqueo del importador durante sesión activa.
- El servidor local solo expone el nuevo módulo mediante una ruta permitida de pruebas.

## Riesgos y funciones todavía pendientes

- **No es un respaldo integral de D-051**. Falta inventario, importación/exportación de varios dispositivos, perfiles y resultados históricos completos, preservación de sus vínculos y migraciones de esquema. No usar este checkpoint como sustituto de la función completa.
- **El hash no autentica un archivo malicioso**. El archivo debe proceder de una fuente confiable; la revisión del esquema rechaza campos y evidencia no compatibles. Nunca se muestran contenidos de archivo usando HTML sin sanear.
- La protección frente a escrituras simultáneas compara estados antes del commit, pero **no es una transacción atómica entre pestañas**: sigue pendiente una estrategia de bloqueo o almacenamiento transaccional para producción.
- No se ha validado el importador en dispositivos físicos, modos privados, memoria escasa, cortes de corriente y transferencias entre navegadores reales.
- Tampoco se ha implementado recuperación integral offline, gestión global de datos ni la interfaz oficial de Hear 3.0.

**Puerta D-063:** no etiquetar Hear 3.0 como estable hasta completar todos los P0 y validar límites, accesibilidad, restauración, privacidad, pruebas críticas y rollback. Esta entrega queda en PR de desarrollo hasta CI satisfactorio.
