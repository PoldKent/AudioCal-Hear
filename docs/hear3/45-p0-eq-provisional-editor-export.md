# Hear 3.0 · D-023/D-024/D-039–041/D-049/D-050/D-051 — EQ provisional archivado, editable y exportable

**Estado: flujo funcional experimental — pendiente de pruebas de hardware, SPL, filtros y seguridad física.** La versión estable Hear 2.0 y el registro `stableReleaseClaim:false` permanecen intactos.

## Flujo de usuario

1. Terminar el examen adaptativo de barrido y tonos con evidencia conjunta verificable. El algoritmo `bounded-hybrid-subjective-contrast-v1` deriva una **hipótesis matemática** dentro de ±3 dB para auriculares/aplicaciones/interfaces o ±2 dB para parlantes/automóviles. No es calibración ni equivalencia física.
2. En «Guardar respuestas en el historial V3», la opción **Guardar también el EQ matemático provisional** está desmarcada por defecto. Sin seleccionarla, el comportamiento y los datos del archivo V3 permanecen idénticos: `status:inconclusive`, `originalEq:[]`, `currentEq:[]`.
3. Al marcarla, el motor recalcula contra las observaciones originales bajo validaciones de perfil, canal, estado y límites. Solo se permite `status:provisional`, y la página exige **dos confirmaciones**. Guarda un único EQ conjunto con original/current idénticos; no se crean umbrales SPL ni se aplica audio.
4. Desde `/hear3-eq-editor/`, elegir un resultado archivado, revisar el gráfico de barras por frecuencia y los valores; editar en pasos de 0,5 dB dentro de la política de investigación; **previsualizar** cada diferencia; confirmar guardar con Web Lock y revisión de versión V3. Ningún control se modifica antes de confirmar.
5. La opción «Restaurar originales» también requiere previsualización y consentimiento; cada banda cambiada agrega al `editHistory` auditable `fromGainDb`/`toGainDb`/`at`. Nunca sobrescribe `originalEq`, resultados ajenos ni almacenamiento Hear 2.0.
6. Copiar TXT o descargar TXT/CSV/JSON/PNG **solo desde los valores persistidos**, con aviso de hipótesis no validada. No existe descarga de presets físicos ni aplicación automática.

## Límites y protecciones

- La ruta completa se mantiene **separada del HTML estable Hear 2.0** y no integra Web Audio ni redes. La única mutación es el catálogo local V3, coordinado entre pestañas cooperativas por Web Locks y CAS; un editor sin Web Locks rechaza el guardado.
- El contrato del catálogo aún no almacena el origen detallado del cálculo de cada banda; el informe histórico contiene únicamente frecuencias, estado `provisional`, observaciones y cambios. El JSON de investigación generado al terminar el test sí conserva la fuente de banda. No inventar trazabilidad acústica o física inexistente.
- Los límites de ganancia ±2/±3 dB **no son límites acústicos validados**. No hay transferencia al EQ físico, ni calibración de SPL, medición de clipping, margen intersample, Q/fase real ni interpretación clínica. No usar estas salidas como recomendaciones definitivas de salud auditiva.
- Las copias externas TXT/CSV/JSON/PNG no están cifradas, ni se borran con el navegador, ni son ficheros de configuración listos para un equipo.
- Si la persistencia del navegador falla o la cuota se agota, el editor informa que la escritura no quedó persistida; ante cambios simultáneos, obliga a revisar.
- Solo se editan resultados `provisional` de `experimental-tone-test` con bandas y pasos conformes al modelo. No se editan historiales V2 ni resultados inconclusos.
- Aún no se realizaron ensayos acústicos físicos ni auditoría WCAG AA completa. Se requiere completar las 13 auditorías físicas y los 60 P0 formales antes de una publicación estable (D-063).

## Verificaciones

- Node: tests históricos y nuevos `tests/hear3-provisional-eq-editor.test.mjs` y casos `tests/hear3-adaptive-catalog-archive.test.mjs` para opt-in, límite, rechazo de valores, readback, reversión, conflicto y almacenamiento volátil.
- Playwright: `tests/browser/hear3-provisional-eq-editor.spec.cjs` y `tests/browser/hear3-adaptive-archive.spec.cjs` ejercitan interfaz real, confirmaciones, edición y descarga, recarga, rollback y conservación de V2.
- Exigir todas las matrices CI y paquete Hear 2.0 verdes en SHA exacto antes de integrar.
