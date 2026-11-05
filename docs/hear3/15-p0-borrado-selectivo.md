# Hear 3.0 — D-059 P0: borrado selectivo local por registro (incremento)

**Fecha:** 2026-11-05. **Decisiones originales:** [D-051, D-059 y D-063 del issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). Este PR no modifica las 63 decisiones aprobadas.

## Alcance implementado

- `src/hear3/catalog-selective-deletion.mjs`: eliminación **individual** de resultados, perfiles o equipos del catálogo V3. Un resultado puede eliminarse por sí solo. El perfil no puede borrarse con resultados asociados sin seleccionar `cascade=true`; un equipo no puede borrarse con perfiles/resultados relacionados sin la misma autorización.
- Vista previa estricta **sin escritura**: informa el número exacto de dispositivos, perfiles y resultados afectados y si se borrará el perfil activo. El borrado requiere acción explícita + confirmación. Una cascada con dependencias exige una segunda confirmación diferenciada.
- Dependencias válidas: se conservan todos los perfiles y resultados que no pertenecen al objetivo seleccionado. La selección de perfil activo se vacía solo si ese perfil será borrado. El contrato de catálogo rechaza referencias huérfanas.
- Verificación de revisión + contenido y nivel de durabilidad antes de ejecutar. Una vista previa obsoleta se rechaza. La propuesta se consume al guardar; no es reutilizable.
- Si la escritura no queda verificada en el almacenamiento del dispositivo, el resultado advierte explícitamente que la eliminación podría ser temporal. No se promete borrado definitivo en almacenamiento externo ni se considera una copia de sesión/volátil equivalente a confirmación local.
- Formulario experimental en `tests/fixtures/hear3-catalog-pilot.html` accesible desde la vista previa Hear 3.0, con controles de teclado, etiquetas y mensajes. Los nombres se renderizan como texto seguro.

## Pruebas

- Node: borrado individual, cascada por perfil/equipo, preservación de entidades ajenas y V2, rechazo de vista previa obsoleta, eliminación no autorizada, fallo de almacenamiento, continuidad del estado inconcluso.
- Playwright: confirmación, cascadas separadas, persistencia tras recarga, inmutabilidad del legado, prevención de sobrescritura y etiquetas HTML no ejecutables.
- Exigir CI de contratos V3, tests Node, paquete Hear 2.0, regresión Android/iPhone/escritorio antes de fusionar.

## Exclusiones y límites

- Esto **no completa D-059**: faltan gestión global de todos los datos Hear (incluidas claves V2 y checkpoints), borrado de fotografías autorizadas (aún sin módulo de imagen definitivo), retención de temporales, políticas de consentimiento remoto y auditoría de almacenamiento restringido.
- No cifra ni autentica respaldos exportados. Los archivos que el usuario descargó no se pueden borrar desde el navegador.
- Detección de previsualización obsoleta **no es transacción entre pestañas**; una implementación transaccional con bloqueo/verificación persistente sigue pendiente.
- La interfaz oficial Hear 2.0 y el motor de sonido no cambian. La vista previa continúa como beta experimental sin garantías de SPL ni calibración real; la puerta D-063=C no está cumplida.

## Rollback

Revertir el PR retira el control de borrado y su módulo del piloto, sin borrar datos V2, perfiles V3 ni respaldos. Verificar `npm run verify`, CI de navegadores y GitHub Pages. No se autoelimina ninguna clave persistida.
