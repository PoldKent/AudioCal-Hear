# Hear 3.0 — D-051/D-054/D-055/D-058/D-060/D-063: recuperación, rollback y matriz de aceptación física

**Fecha de preparación: 05/11/2026. Estado:** pruebas de navegador reproducibles y **protocolo de verificación física pendiente de ejecutar**. No es un acta de aprobación, no prueba hardware real, no autoriza publicar Hear3 estable y no debe inducir al usuario a realizar QA adicional obligatorio. [Decisiones #30](https://github.com/PoldKent/AudioCal-Hear/issues/30) · [QA técnico interno #26](https://github.com/PoldKent/AudioCal-Hear/issues/26).

## Ensayo automatizado ejecutable

`tests/browser/hear3-cross-browser-rollback-rehearsal.spec.cjs` prueba:

1. En un contexto independiente A, crear un catálogo de V3 con dispositivo, perfil, dos bandas, resultado original/actual y perfil activo. Exportar respaldo íntegro.
2. En un contexto B distinto, crear primero otro catálogo; exportar una copia de rollback del estado anterior.
3. Importar el respaldo A en B usando **modo reemplazo con confirmación**, recargar y validar exacta equivalencia de catálogo y persistencia local. No abrir un AudioContext ni iniciar sonido como efecto de importar.
4. Seleccionar y confirmar un **rollback manual** al respaldo original de B, recargar y verificar que B recupera el estado exacto de origen. Comprobar que la fuente A no se modificó.
5. Verificar que negar un reemplazo no borra registros y que manipular un checksum FNV rechaza la importación sin cambios parciales.
6. Simular denegación de escritura del navegador y verificar que el resultado informa `persistedOnDevice:false` en lugar de afirmar una restauración durable.

**Importante:** Playwright usa motores Chromium/WebKit automatizados y almacenamiento reproducible en la infraestructura CI. Esto prueba lógica del navegador, **no** corte de alimentación, persistencia en iOS/Android físicos, almacenamiento privado ni recuperación después de un fallo real. Un checksum FNV detecta daños accidentales, no garantiza autenticidad.

## Protocolo técnico físico obligatorio antes de D-063=C

Para cada combinación representativa de **Android físico, iPhone/iPad físico, Windows/macOS físico**, y para las rutas compatibles **auriculares con cable, auriculares Bluetooth, parlantes y sistema de automóvil**, el responsable técnico debe **registrar** versión exacta, navegador, sistema operativo, modelo/ruta física, dispositivo de medición, calibración vigente, operador, fecha, ID de prueba, resultados y evidencia revisable. No rellenar la matriz por deducción de un simulador.

| Área de evidencia | Ensayo y condición de aceptación a verificar físicamente |
|---|---|
| Salida y niveles | Medir presión sonora real con instrumental calibrado bajo estímulos y volúmenes deliberados, confrontar dBFS con la señal PCM, controlar niveles por ruta; nunca inferir dB SPL desde dBFS |
| Separación L/R | Confirmar qué transductor físico recibe cada estímulo y qué ocurre al conectar auriculares mono, modificar balance o aplicar mezclas/mono del SO |
| Bluetooth y rutas | Con tono activo y sin tono, alternar/hacer perder la salida, iniciar una llamada, fondo/primer plano, suspender Web Audio; comprobar silencio, bloqueo de respuesta y reconfirmación antes de continuar |
| EQ | Capturar respuesta real por banda, centros, ancho/Q, fase, límites físicos, ganancia en cascada, picos entre muestras, clipping, THD/ruido y margen de preamp del dispositivo; comparar con el modelo ideal antes de transferir valores |
| Preferencias/percepción | Comparación ciega y consentida entre curvas candidatas, documentar variabilidad/rechazos; la neutralidad o incertidumbre nunca se interpretan como pérdida o mejora audiométrica |
| V2 | Probar exportaciones de versiones reales diversas, historiales multi-perfil/mono/binaural, registros desconocidos, archivos corruptos, faltantes, migración íntegra opaca y reimportación sin crear resultados clínicos V3 |
| Multi-pestaña | Ensayar revisión obsoleta, fallos de bloqueo, navegación privada, cierres abruptos y escritores no cooperantes; documentar riesgos residuales y durabilidad |
| Privacidad de fotografías | Comprobar EXIF/GPS y metadatos de diferentes formatos/cámaras; distinguir metadatos ocultos de información visible en píxeles; evaluar memoria, persistencia temporal y borrado de URLs |
| Accesibilidad | NVDA/VoiceOver/TalkBack reales, teclado sin ratón, foco, zoom 200/400%, contraste, estado durante tonos, acceso a detención y WCAG 2.2 AA con informe de auditor |
| Offline/almacenamiento | Opt-in voluntario de cache, pérdida de conectividad, expulsión del navegador, cierre de app, falta de cuota, datos corruptos; verificar exportabilidad y señal de durabilidad |
| Restauración y rollback | Crear **dos** archivos de respaldo independientes del catálogo V3 y del origen histórico V2; cerrar/reabrir navegador real, migrar a otro dispositivo con origen distinto, inspeccionar + confirmar, recuperar exactos resultados/observaciones/perfiles, revertir manualmente a la copia anterior |
| Incidencias | Hacer que una escritura falle después de comenzar, perder energía durante guardado y simular pérdida de dispositivo; evaluar copias redundantes, archivos descargados y recuperación sin reinterpretación de respuestas |
| Aprobación final | Cada uno de los 60 P0 y 13 grupos de auditoría física debe disponer de evidencia revisada y accesible; ejecutar regresión crítica, probar rollback y **mantener** `stableReleaseClaim:false` hasta aprobación |

## Procedimiento de seguridad para el ensayo físico

Cualquier prueba de salida acústica debe planearse con equipos de medición calibrados, niveles físicos conservadores y límites específicos definidos por responsables técnicos; detener inmediatamente ante incomodidad, distorsión o cambio imprevisto de ruta. No exponer a participantes ni usuarios a tonos máximos sin una política acústica validada. No pedir a usuarios finales que hagan de laboratorio.

**Plan de aceptación formal:** los 13 grupos de auditoría de `docs/hear3/release-evidence-gate.json` permanecen `pending` hasta evidencias verificadas por revisores. El hecho de que Playwright apruebe recuperación, redibujado, privacidad, filtros digitales y teclado **no convierte ninguna auditoría física a `verified`**. La prueba de aceptación tiene que revisar el objeto de evidencia original, no solo su URL.

## Reversión de software

- Hear 2.0 permanece como aplicación estable y no se sustituye automáticamente.
- Para revertir Hear3 a nivel de código, revertir los PR experimentales relevantes, publicar de nuevo la versión anterior y volver a ejecutar CI/postdeploy en el SHA de reversión.
- **No borrar** catálogos o el archivo V2 antes de exportar y verificar las dos copias. Si hay error de cuota o bloqueo, no continuar con una sustitución no durable.
- No prometer que GitHub Pages revierta `localStorage`: el código y los datos de navegador son capas diferentes.
- Si una operación cambia el esquema, exigir plan de migración reversible o copia exportable anterior antes del lanzamiento.

## Fuera de alcance de este incremento

No se han ejecutado mediciones físicas ni ensayos de apagado real. El algoritmo EQ experimental conserva `autoApplyAllowed:false` y `validatedForProduction:false`. Las rutas físicas no están certificadas. WCAG AA no está auditado por una persona con lector de pantalla. La condición D-063=C sigue bloqueada.
