# Hear 3.0 · D-051 / D-059 / D-060 — Restauración dual protegida y diario de recuperación

**07/11/2026. Estado: implementación experimental de seguridad de datos. NO transacción ACID, NO verificación de persistencia ante apagado físico y NO autorización para Hear 3.0 estable.**

## Problema

El catálogo nativo **V3** y el historial completo histórico **V2** se almacenan en archivos y claves distintos. Verificar únicamente que ambos se pueden restaurar en secuencia no demuestra que la pareja permanezca coherente si el navegador se cierra, falla una escritura o se agota la cuota entre los dos commits.

## Incremento

`src/hear3/guarded-dual-archive-restore.mjs` ofrece una restauración de una pareja **existente y legible en almacenamiento duradero**:

1. Exige **dos archivos fuente** (catálogo V3 y archivo V2 íntegro), valida los contratos y los checksums accidentales y presenta los recuentos sin modificar almacenamiento.
2. Genera dos copias separadas **del estado anterior**: el catálogo V3 y el historial V2. Solo permite continuar si la UI ha solicitado ambas descargas y el usuario confirma expresamente haberlas guardado fuera del navegador; JavaScript no puede verificar el disco físico del usuario.
3. Mantiene **un mismo Web Lock exclusivo cooperativo** durante la comprobación de revisiones y las dos escrituras; también comprueba que no haya cambiado el contenido V3/V2 respecto de la vista previa. No admite modo inseguro si no hay Web Locks.
4. Antes del primer cambio crea `hear3:dual-restore:v1:journal`, un **marcador mínimo** con identificadores de integridad de las dos parejas y estado `in-progress`; no contiene las medidas, imágenes ni audios originales. Si no puede guardarlo y releerlo, **no restaura**.
5. Guarda V3, exige persistencia informada; después guarda V2, exige persistencia informada. Compara de nuevo la pareja de contenido. Si todo coincide, marca `completed` e intenta retirar el diario.
6. Ante escritura fallida o cierre intermedio, **no oculta** el estado parcial ni ejecuta una reversión silenciosa. En la siguiente carga, la página permite inspeccionar si hay una pareja coherente anterior, nueva o **mixta**. Bloquea otra restauración dual hasta resolver el diario y exige autorización para reconocer una pareja coherente.
7. No toca las claves originales de Hear 2.0 ni interpreta las mediciones V2 como resultados V3. No inicia audio ni EQ.

**Importante:** esta vía protegida se ofrece solo cuando ya existen los **dos** almacenes locales V2/V3 persistentes. Para una primera importación o un perfil sin historial V2, se mantienen los importadores independientes anteriores; no se inventa una copia V2 previa inexistente.

## Límites estrictos

- Los dos `localStorage.setItem` siguen siendo operaciones independientes. Una caída física entre ambas escrituras puede dejar estado mixto. El marcador permite **detectar y bloquear**, no reparar automáticamente con transacción atómica.
- Otros scripts que ignoren el Web Lock pueden introducir escrituras concurrentes; FNV1a32 no ofrece autenticación de origen ni integridad criptográfica.
- Un navegador que borre por cuota todo el origen puede borrar **datos y marcador**; solo las dos copias externas sirven como recuperación robusta.
- Las descargas iniciadas desde UI **no demuestran** que se guardaron en un disco ni que el dispositivo sobrevivirá un apagado.
- Si el estado es mixto, la restitución manual requiere importar los dos respaldos antiguos por separado y comprobarlos. El diario solo se elimina tras verificación de una pareja que coincida con el estado previo o final, y confirmación explícita.
- Ninguna prueba simulada demuestra SPL, rutas L/R, calibración acústica, privacidad temporal en OS, WCAG 2.2 AA, Bluetooth físico ni seguridad auditiva.

## Evidencia de software

- `tests/hear3-guarded-dual-archive-restore.test.mjs`: comprobación completa; fallos controlados V2 y V3, revisión antigua, entradas/diario corruptos, cuotas, estados incoherentes, recuperación manual y residuo del marcador al fallar su eliminación.
- `tests/browser/hear3-dual-restore-ui.spec.cjs`: previsualización y descargas previas a reemplazo, restauración de pareja y recarga, rechazo de recuperación incompleta y señalización de datos parciales en un navegador.
- Regresiones Playwright Android/iPhone/escritorios más contratos/Node y beta Hear 2.0 deben estar **todas verdes en el commit exacto** antes de fusionar.
- La pantalla `/hear3-dual-restore/` permanece aislada: no se incluye en caché offline voluntaria y no se integra en la ruta estable Hear 2.0.

## Próxima puerta

Sigue abierta la matriz de 13 auditorías físicas y 60 decisiones P0 del registro de publicación `docs/hear3/release-evidence-gate.json`. `stableReleaseClaim:false` permanece sin cambios. Los ensayos en Android/iOS y salidas acústicas **reales** deben realizarse con protocolo supervisado; no solicitar pruebas peligrosas al usuario.
