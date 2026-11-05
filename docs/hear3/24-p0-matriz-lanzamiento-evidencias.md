# Hear 3.0 — D-063 P0: matriz de liberación y evidencia física verificable

**Fecha de corte:** 2026-11-05. **Fuente normativa:** [decisiones aprobadas D-001–D-063](https://github.com/PoldKent/AudioCal-Hear/issues/30). **Esta matriz no acredita una liberación estable.** Los resultados de CI del código no demuestran seguridad acústica física, cumplimiento WCAG ni ausencia de pérdida de datos.

## Fuente verificable y condición de salida

- `docs/hear3/release-evidence-gate.json` contiene **las 63 decisiones** en orden, con su prioridad y su estado. D-011 y D-013 tienen P2; D-012 tiene P3 según el issue original; **60 decisiones son P0** y requieren validación para el lanzamiento estable. El estado `prototype` solo indica que existen incrementos o ensayos técnicos, no que el requisito haya superado la aceptación final.
- `src/hear3/release-evidence-gate.mjs` evalúa que todas las decisiones obligatorias, los informes y las auditorías estén representados. Si se marca `stableReleaseClaim:true` cuando falta evidencia, la comprobación rechaza la manifestación de estabilidad. **La validación estructural no verifica si una referencia fue falsificada ni sustituye una revisión humana independiente.**
- `tests/hear3-release-evidence-gate.test.mjs` comprueba recuentos/prioridades, rechaza omisiones o cambios de prioridad, bloquea la declaración de estabilidad con P0 o auditorías pendientes, y ensaya un formato sintético totalmente verificado. El caso sintético no implica que exista evidencia real.
- La puerta D-063=C exige: **60/60 P0 verificados**, pruebas críticas automatizadas correctas para el SHA del release, **13 auditorías reales verificadas**, documentación de riesgos/limitaciones, plan de reversión ensayado, y revisión humana de evidencias.

## 13 auditorías obligatorias de aceptación

| ID del manifiesto | Evidencia mínima pendiente |
| --- | --- |
| `physical-android` | Prueba en Android físico, navegador identificado, detención/pausa y progresión de tonos |
| `physical-ios` | iPhone/Safari real, límites de APIs, interrupciones y offline |
| `physical-desktop` | Escritorio real y dispositivo de audio identificado por el usuario |
| `physical-bluetooth-route` | Desconexión Bluetooth, cambio de dispositivo, suspensión/llamadas observables |
| `physical-headphones-lr` | Verificación perceptiva de canales L/R cuando se habilite por oído; alternativa conjunta |
| `physical-levels` | Seguridad acústica, nivel físico, calibración/limitaciones y protocolo de parada documentado |
| `perceptual-comparison` | Dos tonos consecutivos, respuestas y condiciones de incertidumbre con usuarios/equipos |
| `eq-calibration` | Política EQ investigada, headroom, clipping, controles físicos y no amplificación injustificada |
| `accessibility-wcag` | Auditoría WCAG 2.2 AA con teclado, contraste, lector de pantalla y movimiento reducido |
| `offline-storage` | Modo sin red, fallos de cuota/permisos, reparación/cambios de versión y persistencia real |
| `privacy-images` | Retención/eliminación de fotos, alcance V2/V3, respaldo local e inexistencia de envío no autorizado |
| `migration-legacy` | Importación V2 íntegra/no destructiva y restauración desde respaldo válido |
| `rollback-production` | Reversión y recuperación de sitios/worker/cache sin pérdida de datos de usuarios |

## Procedimiento reproducible y registro de evidencia

Para cada P0, relacionar el requisito con una función y archivo exactos, prueba automatizada, prueba real pertinente y resultado observable. Para cada ensayo físico registrar sin datos personales:

1. Fecha, revisores, modelo genérico de equipo, versión de sistema/navegador, tipo de salida y ruta visible/confirmada.
2. SHA de código probado, URL/ID de Actions, procedimiento exacto y qué estaba previsto observar.
3. Resultado observado (aprobado/fallido/bloqueado), logs **anonimizados y revisados antes de compartir**, incidencia asociada y limitación conocida.
4. Evidencia trazable a un issue/PR/documento de este repositorio, no solo la afirmación del probador. Ningún audio físico se prueba a volúmenes elevados en busca de límites; detener ante molestias.

El registro de prueba manual debe evitar datos clínicos, nombres personales, fotografía de personas, identificadores de dispositivos o rutas locales sensibles. La selección de salida del navegador y su amplitud dBFS **no prueban por sí solas** qué transductor está activo ni el nivel dB SPL sobre el oído.

## Consideraciones sobre automatización

Las pruebas de Playwright en Pixel/Chromium, iPhone/WebKit y escritorio **emulan el navegador** y son valiosas para regresiones de UI/código, pero no son pruebas acústicas reales. No atribuir la misma evidencia a ambas categorías. Mantener tests en CI y un registro separado para experimentos físicos.

Los P0 que aún no tienen políticas definitivas —D-039/D-040 del EQ, D-035 canales, D-059 imágenes y privacidad integral, D-060 offline/quotas y D-063 mismo— no pueden marcarse `verified` por el solo hecho de integrar un prototipo. La versión Hear 2.0 puede seguir operando mientras la vista previa Hear 3.0 progresa por PR.

## Regla de rollback antes del release

Conservar una copia de un commit estable de Hear 2.0, verificar que una reversión de páginas se publica correctamente y probar navegación por sus rutas. Si la web experimental emplea service workers, **revertir los archivos no desinstala automáticamente un trabajador ya registrado**; se requiere un plan real de migración o retirada de la caché optativa, con confirmación y preservación de perfiles. Documentar también reversiones fallidas, soporte offline y recuperación desde backups locales.

**Estado registrado al crear esta matriz:** `stableReleaseClaim:false`. La puerta D-063=C permanece abierta. Actualizar la matriz solo después de obtener y revisar evidencia real.
