# Hear 3.0 beta · Flujo público integrado (17/11/2026)

## Qué se integró

- Acceso principal `/` → `/hear3-preview/` y enlace principal **Comenzar examen experimental** → `/hear3-exam/`.
- `/hear3-exam/` incluye barrido, tonos adaptativos, respuesta inmediata, recuperación de sesión, resultado y EQ acotado provisional, exportación y archivo V3 voluntario con doble confirmación para guardar EQ.
- `/hear3-library/` permite consultar historial, exportar catálogo, importar con vista previa, borrado selectivo explícito y preservación de V2 separada.
- `/hear3-eq-editor/` permite revisar/editar/restaurar la curva provisional archivada, sin aplicación automática.
- `/hear2/` conserva la aplicación anterior íntegra y accesible. El solo hecho de navegar entre versiones no altera las claves V2.
- La instalación offline sigue siendo opcional y únicamente guarda recursos públicos estáticos; nunca respuestas ni imágenes.

## Evidencia de control del código

El HTML de examen y catálogo públicos conserva **exactamente la lógica de módulos** de los pilotos internos, cambiando solo las rutas de importación. Un contrato Node detecta futuras divergencias. Las pruebas de navegador incluyen un recorrido completo de entrada, barrido, tonos, consentimiento, historial, editor y retención de V2 usando audio simulado; no constituyen ensayos acústicos en dispositivos físicos.

## Restricciones que permanecen

**No es Hear 3 estable**. Mantener `stableReleaseClaim:false` y `autoApplyAllowed:false`; no dar a entender que el método de EQ está validado clínicamente o en SPL. Falta verificar seguridad acústica, DSP/headroom y clipping físicos, rutas reales, accesibilidad asistiva, rollback con datos originales y evidencia D-063. El editor no aplica filtros a dispositivos. No migrar historial V2 por defecto, ni convertir medidas históricas en umbrales o resultados V3 sin evidencia.

## Reversión

Si una prueba P0 o la publicación falla, mantener la experiencia Hear 2 en `/hear2/` y revertir únicamente el cambio de navegación/rutas de esta PR para restaurar el estado anterior, sin ejecutar borrados de `localStorage`. Los respaldos descargados se deben conservar por separado.
