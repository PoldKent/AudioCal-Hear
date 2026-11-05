# Hear 3.0 · P0 D-051 — Recuperación del último resultado V3 por perfil

**Estado:** incremento independiente, pendiente de revisión de CI. Conserva íntegramente las decisiones D-001 a D-063 del [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Alcance implementado

- Selector puro `selectHear3ProfileHistory(catalog,{profileId})`: valida el contrato completo V3; recupera el último resultado del **perfil activo** de forma predeterminada, o de un perfil seleccionado expresamente.
- Historial ordenado por `capturedAt` descendente y, en empates, por ID estable. Nunca mezcla resultados de otros equipos o perfiles aunque tengan una fecha posterior.
- `listHear3ProfileSummaries`: resúmenes de equipos, perfiles, cantidad de resultados y último resultado por perfil, preservando la vinculación de datos.
- `createHear3CatalogHistoryReader({store})`: lee la instantánea del catálogo sin escribir, y expone revisión, nivel de durabilidad y advertencias de almacenamiento.
- Piloto interno `tests/fixtures/hear3-catalog-pilot.html`: consulta en texto seguro del último resultado del perfil activo con su estado, fecha, EQ original y EQ editado. Un resultado inconcluso no se muestra como calibración validada.

## Límites deliberados

- **No inicia audio**, no reanuda un examen, no cambia el perfil activo y no actualiza datos guardados. No afirma precisión clínica, seguridad acústica o calibración del dispositivo.
- Sin perfil activo, devuelve `no-active-profile` y no elige automáticamente otro por antigüedad; sin resultados, devuelve `no-results`.
- Los resultados se recuperan como copias independientes para evitar que una vista los modifique.
- El histórico V2 continúa íntegro y **sin transformarse** en umbrales, resultados o EQ V3. Este incremento no completa la migración D-051.
- Todavía faltan selección/activación oficial de perfiles, UX de resultados, recuperación de sesión completa, borrado selectivo verificado, integridad entre pestañas y pruebas de hardware.
- La UI oficial de Hear 2.0 no se modifica. La prueba del navegador simula plataformas; no demuestra validación física.

## Evidencia y puerta de aceptación

- Pruebas Node: perfil activo frente a otros equipos, recuperación explícita, fechas/empates, no inferir resultados, esquema corrupto, aislamiento de mutación, durabilidad y ausencia de escritura/audio.
- Pruebas Playwright: primera visita sin historial, recarga y recuperación del perfil activo (sin confundirlo con otro equipo más reciente), y tratamiento seguro de nombres con marcado HTML.
- Antes de fusionar verificar los cuatro workflows vigentes: Source and regression tests, Hear 3.0 contracts, AudioCal Hear 2.0 beta bundle y Browser UI regression en Android Chromium, iPhone WebKit y escritorios 4:3 / 21:9.
- **D-063=C sigue sin satisfacerse**: no publicar ni etiquetar Hear 3.0 como estable.
