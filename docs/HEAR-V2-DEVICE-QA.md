# AudioCal Hear 2.0 — validación funcional con equipos reales

**Estado:** protocolo de QA; no es una certificación clínica ni acústica. El flujo de software se prueba automáticamente con perfiles sintéticos; los ensayos con auriculares/personas y dispositivos físicos deben realizarse por separado.

## Preparación y seguridad
- Usar lugar tranquilo y un solo dispositivo de salida. Confirmar izquierda/derecha cuando aplique.
- Ajustar un volumen físico **bajo, cómodo y constante**; nunca subirlo para buscar tonos que no se perciben. Detener inmediatamente ante molestias, zumbidos o distorsión.
- Mantener el ecualizador externo neutro antes de medir. Registrar su configuración previa, tipo de transductor, versión del navegador y ruta de audio.
- Entender que niveles en dBFS digitales **no** son dB SPL en el oído. No utilizar el resultado como audiometría clínica.

## Escenario A — Auriculares Soundcore y otra marca
1. Crear un perfil independiente para cada equipo; seleccionar bandas reales y confirmar los dos canales.
2. Ejecutar el barrido previo (opcional) y registrar si hubo zonas audibles o inconclusas. Sin micrófono en auriculares.
3. Completar el examen adaptativo por oído a volumen constante. Usar la comparación de sonoridad opcional durante una frecuencia, sin interrumpir ni falsear respuestas.
4. En resultados, verificar recuentos por oído, gráfica de mediciones originales y **una sola** superficie de ecualización. No es obligatorio que haya ajustes distintos de cero si la evidencia es insuficiente.
5. Comprobar que la propuesta conservadora del test **ya aparece aplicada** en el único EQ editable (no existe un segundo botón «Aplicar propuesta»); editar una banda, guardar PNG/TXT y exportar JSON. Confirmar que las mediciones originales no cambian.
6. Escuchar la misma canción **desde el reproductor interno de Hear** con el EQ activado y desactivado a sonoridad comparable; registrar preferencia mejor/igual/peor, sin forzar una mejora.
7. Cambiar una banda: comprobar que la opinión anterior deja de considerarse vigente. Recargar, importar perfil y comprobar el estado conservado.

## Escenario B — Automóvil estacionado / equipo físico de 7 bandas
1. Anotar frecuencias de controles, rango de posiciones y la equivalencia dB/posición **solo si está documentada**.
2. Motor apagado, ventanillas cerradas y posición de escucha fija. Volumen moderado.
3. Completar el test del conjunto oído + equipo. Micrófono opcional, con consentimiento explícito y en ubicación fija; no concluir que una frecuencia ausente corresponde a fallo del equipo.
4. Contrastar la recomendación digital con los controles físicos y verificar manualmente que ninguna traducción de unidades sea inventada.

## Escenario C — Parlantes de 5 bandas
1. Configurar las frecuencias observadas en el equipo (por ejemplo 200, 500, 1000, 5000, 12000 Hz) y sus límites físicos reales.
2. Colocar todos los controles a cero, mantener la misma distancia y posición. Repetir el test en otra sesión para comprobar reproducibilidad.
3. Documentar variaciones debidas al ambiente sin confundirlas con la capacidad auditiva personal.

## Escenario D — Preamplificador de guitarra SE-4N
No usar el test de audición para inferir la respuesta del preamplificador. Se requiere un procedimiento específico con señal que atraviese realmente el circuito o una interpretación repetible grabada por interfaz; **pendiente de desarrollo**.

## Criterios de aceptación
- [ ] El perfil auditivo se completa y sus datos sobreviven recarga y exportación/importación.
- [ ] Umbrales medidos, barrido y preferencias guardados como **evidencias distintas**.
- [ ] La comparación de sonoridad nunca se confunde con la respuesta «sí/no» del test adaptativo.
- [ ] No se emite un refuerzo significativo sin evidencia ni se obliga a subir volumen.
- [ ] Un único ecualizador refleja los cambios editados y exportados.
- [ ] Escucha A/B realizada al menos una vez por modo, guardando «mejor», «igual» o «peor» sin sesgo.
- [ ] No se presenta una unidad física de control como dB sin datos.
- [ ] Se han probado Android, iOS/WebKit y escritorio; no hay desplazamiento horizontal inesperado.
- [ ] No hay audio reproduciéndose después de detener/salir, y las pistas del micrófono se liberan.

Utiliza la [plantilla de registro por dispositivo](./HEAR-V2-REAL-DEVICE-REPORT.md) para guardar resultados verificables sin publicar datos sensibles.

## Evidencia que conviene adjuntar
Guardar solamente los perfiles y capturas relevantes, sin nombres personales ni grabaciones privadas: equipo/tipo, versión de Hear, navegador y OS, número de bandas, número de umbrales, capturas antes/después y observaciones de escucha. Reportar incidencias en el [issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26).

**Estado de publicación:** la versión preliminar está publicada en GitHub Pages y pasa CI. La validación acústica y de dispositivos reales es una puerta independiente para declarar el producto verificado; mientras falte, no afirmar equivalencia probada con HearID.


## Ejecutar la versión vigente en un entorno aislado

La PR #29 ya se integró en `main`; los antiguos paquetes de PR #25 y la rama `feat/hear-v2-inline-loudness` no representan necesariamente el estado actual. Descarga `main` y ejecuta `npm run beta` con Node.js 20+ en una carpeta de pruebas. Abre `http://127.0.0.1:8765/`, o consulta [HEAR-V2-BETA.md](./HEAR-V2-BETA.md).

Exporta JSON antes de borrar o cambiar datos de perfil. Los orígenes local y publicado almacenan perfiles de forma independiente. El acceso al micrófono es opcional y exige permiso explícito. No des por completada la validación en hardware solo porque CI esté verde.
