# Hear 3.0 · Cambio de entrada principal a beta con reversión explícita a Hear 2.0

**Fecha:** 17/11/2026. **Estado:** plan de publicación de **beta experimental**, no versión estable ni calibración acústica validada. [Decisiones D-063 y puerta de evidencia](release-evidence-gate.json).

## Rutas y contrato de la transición

- `/` y `/index.html`: página de transición con redirección HTML accesible a `/hear3-preview/`, **Hear 3.0 beta** como entrada principal y alternativa manual visible si la redirección falla. La redirección no reproduce audio, no usa consentimiento implícito para importar V2 ni toca claves de navegador.
- `/hear3-preview/`: inicio experimental guiado, examen integrado, EQ provisional y otras herramientas. **No** presentar como audiometría o ecualizador calibrado, ni habilitar aplicación automática.
- `/hear2/` y `/hear2/index.html`: HTML autocontenido, generado de la plantilla/JS/CSS/I18n originales Hear 2.0. No se eliminan funciones, datos, exportación ni perfiles. El vínculo de regreso a beta se reorienta a `../hear3-preview/`.
- Ambos comparten el mismo **origen HTTPS**, de modo que `localStorage` V2 continúa accesible. Sin embargo, el almacenamiento puede ser borrado por el usuario, el sistema o el navegador: no hay migración invisible ni promesa de persistencia. Guardar respaldos externos independientes es un requisito antes de borrados/reemplazos.
- `package.json` se identifica como `3.0.0-beta.1`. **No** se crea tag v3.0.0 estable y el antiguo HTML continúa identificándose como Hear 2.0 v1.11.0.
- `src/index.template.html` continúa siendo fuente del standalone Hear 2.0; `src/hear3-entry.html` es fuente de la entrada V3 beta. `npm run build` genera `hear2/index.html` + `index.html`; `npm run verify` comprueba la identidad exacta y ejecuta pruebas.
- El ZIP local Hear2 mantiene `index.html` independiente, copiando `hear2/index.html` en el workflow beta; el servidor local `serve-beta.mjs` sigue siendo monocarpeta/offline.

## Pruebas y evidencia necesarias para habilitar esta beta principal

1. CI Node/contratos y `npm run check:build` exige bytes exactos de raíz y Hear 2 legacy.
2. Integridad estática inspecciona el JavaScript antiguo y ocho idiomas en `hear2/index.html`, y la ruta/avisos/respaldo explícitos en el root beta.
3. Playwright en Android Chromium, iPhone WebKit simulado y escritorio 4:3/21:9: la URL oficial abre Hear3; vuelta a Hear2 ejecuta el HTML completo; crear un perfil V2, alternar entre versiones, recargar, conservar los mismos bytes de `localStorage` y recuperar funciones originales. Todos los tests del Hear2 antiguo se ejecutan en `/hear2/`.
4. Comprobar que `/hear3-preview/` no inicia ningún tono ni ejecuta migraciones. Importaciones V2/V3 requieren vista previa, respaldo y autorización individual.
5. Publicar por el pipeline GitHub Pages habitual después de CI verde en SHA exacto, luego verificar manualmente `/`, `/hear2/`, recursos y ruta de recuperación real, y confirmar logs de build/deploy.

## Mitigación específica para iPhone/Safari WebKit: escrituras con pestañas abiertas

En el run CI #44145490121 se observó, dos veces, que **dos pestañas WebKit anunciaban un commit V2 persistido en una prueba concurrente**. La causa precisa (Web Locks, visibilidad de localStorage u otra) aún no está certificada. Una beta no debe permitir ese caso sin control.

`src/hear3/coordinated-catalog-writer.mjs` incorpora por eso una **comprobación conservadora de presencia de otra pestaña** mediante `BroadcastChannel` antes del bloqueo Web Locks en WebKit (iOS/macOS Safari). Cuando responde otra pestaña, o si BroadcastChannel no está disponible, **se rechaza la operación local**. El usuario debe cerrar las otras pestañas de Hear 3 y repetir la revisión, sin guardar automáticamente. La UI sigue mostrando error; las pruebas entre pestañas en WebKit deben verificar **cero cambios** y no esperar una escritura vencedora. En Chromium con CAS/Web Locks, el segundo escritor obsoleto se rechaza.

Esta mitigación **no es una transacción atómica ni una prueba de exclusividad física**. Un navegador suspendido puede impedir que otra pestaña responda al sondeo; la entrega de mensajes entre pestañas no es garantizada ni entre navegadores/perfiles distintos. Los backups V2/V3 continúan siendo obligatorios antes de operaciones destructivas. No acreditar D-063, ni escribir que se resolvió definitivamente la causa técnica de WebKit.

## Rollback real del acceso y del software

**Primero** conservar copias exportadas del historial V2 y catálogo V3, de existir. Para el usuario que solo quiera volver a la experiencia anterior, abrir `/hear2/`: **no borra ni transforma** `/hear3-preview/`, sus perfiles, originales o archivos. Un cambio de interfaz no exige borrar el almacenamiento compartido.

Para revertir globalmente el acceso oficial al antiguo Hear2, aplicar reversión de este PR y desplegar nuevamente el root anterior después de ejecutar `npm run verify` y la matriz navegador. Si el cambio se hizo tras otros commits, revertir puntualmente routing/build/workflows, no revertir por error mejoras posteriores. No prometer restaurar datos locales perdidos ni deshacer una importación V2/V3 únicamente con despliegue GitHub.

La integridad de copias remotas, cierres abruptos, actividad concurrente y recuperación ante apagado físico sigue exigiendo pruebas propias. Ninguna redirección supone migración completa del historial.

## Bloqueos de lanzamiento estable que NO elimina este PR

`stableReleaseClaim:false` y `autoApplyAllowed:false` siguen obligatorios. Las 60 decisiones P0 y 13 auditorías físicas del gate no reciben estados `verified` por este despliegue; quedan pendientes SPL y ruta real, seguridad DSP e intersample clipping, comparaciones perceptivas, historial V2 con archivos originales, accesibilidad asistiva, privacidad de imágenes y recuperación tras fallos físicos. **El resultado es una beta principal reversible, no Hear 3.0 estable**.

Si alguna matriz crítica falla, mantener el PR sin merge y la raíz oficial original hasta corregirla. Si el despliegue posterior falla, activar rollback del routing y preservar el acceso `/hear2/` y todos los datos.
