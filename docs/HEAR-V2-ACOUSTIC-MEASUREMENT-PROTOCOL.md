# Hear 2.0 — protocolo de medición del equipo y del entorno

**Estado: protocolo técnico definido, ensayos físicos NO ejecutados.** Este procedimiento es externo al examen perceptivo de Hear. No activa compensación de respuesta ni promete dB SPL reales dentro de la aplicación. El seguimiento sigue en [#26](https://github.com/PoldKent/AudioCal-Hear/issues/26).

## 1. Qué se puede y qué no se puede medir

| Cadena | Observación válida | Conclusión prohibida sin más evidencia |
|---|---|---|
| Sonido reproducido por parlante/auto, captado por micrófono en una posición | Respuesta **del conjunto altavoz + electrónica + sala + posición** en esa cadena | «Respuesta aislada del altavoz» o «déficit de audición del usuario» |
| Salida y entrada de una interfaz a nivel de línea a través de un EQ/preamplificador | Transferencia eléctrica **del circuito y de la configuración usados** | Nivel SPL, capacidad auditiva o respuesta de una caja conectada a otro sistema |
| Tonos subjetivos del examen Hear en auriculares | Detección perceptiva en **dBFS digitales** bajo condiciones registradas | Audiograma clínico, SPL oído, curva de respuesta objetiva o corrección automática física |

**No restar** umbrales de Hear a curvas de micrófono ni interpretar el mismo número de dB como equivalente entre cadenas. Toda comparación es relativa a un estado de referencia con conexiones, volumen y posición constantes.

## 2. Materiales y seguridad

1. PC con software de medición, por ejemplo [Room EQ Wizard (REW)](https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html); anotar versión, SO y salida elegida.
2. Micrófono de medición con archivo de calibración específico del equipo (por ejemplo un UMIK con archivo por número de serie) y soporte fijo. Seleccionar orientación **0° hacia la fuente** con su archivo correspondiente; usar 90° hacia el techo y su archivo específico solo si el procedimiento de sala adoptado lo necesita. No intercambiar archivos de orientación.
3. Si se utiliza interfaz con micrófono XLR, disponer de calibración apropiada del micrófono y de la interfaz; **calibrar la respuesta de interfaz por loopback cuando corresponda**, con alimentación fantasma desactivada en conexiones de línea, evitando monitorización/realimentación accidental. Un USB de medición con calibración propia no requiere el mismo loopback de entrada analógica.
4. Sala suficientemente silenciosa, posición estable, EQ inicial neutro, volumen bajo y cómodo. Automóvil siempre **estacionado**, sin conducción durante el ensayo.
5. Detener ante ruido molesto, distorsión, recorte o cualquier signo de riesgo. No elegir un «SPL objetivo» arbitrario ni elevar volumen físico para obtener frecuencias inaudibles. No conectar **salidas de potencia/terminales de parlante** directamente a entradas de línea.

Referencias técnicas de configuración: [REW, entrada y calibración](https://www.roomeqwizard.com/betahelp/help/html/calsoundcard.html); [miniDSP, UMIK con REW](https://www.minidsp.com/applications/acoustic-measurements/umik-1-setup-with-rew/); [orientación UMIK](https://support.minidsp.com/support/solutions/articles/47000681633-which-direction-should-i-point-the-umik-1).

## 3. Procedimiento A — respuesta relativa de automóvil y parlantes

1. **Identificar cadena**: fuente y formato de reproducción, códec Bluetooth/AUX/cable si se conoce, equipo, altavoces activos, controles EQ, frecuencia de muestreo (por ejemplo 48 kHz), procesamiento externo y posición de escucha. Desactivar ecualizaciones automáticas/AGC si es posible y registrar cualquier DSP que no se pueda desactivar.
2. **Referencia**: con los controles a cero, registrar ruido de fondo sin señal y repetirlo al final. Ajustar la salida a un nivel medible sin recorte, manteniendo el volumen físico idéntico en toda la serie. Si el fondo tapa parte de la respuesta, marcar esa banda como *no concluyente*, no aumentar el nivel hasta causar molestias.
3. **Micrófono**: fijar orientación y altura. Medir primero la posición principal de escucha, luego al menos dos posiciones cercanas documentadas; anotar distancias/variación, sin afirmar que se midió todo el recinto.
4. **Barridos**: con el mismo rango, ganancia, ventana temporal y suavizado de análisis, obtener al menos dos barridos repetidos en cada posición. Guardar capturas/exportaciones de curvas y distinguir variación entre repeticiones de variación entre posiciones.
5. **Control físico individual**: volver a la posición principal. Cambiar una sola banda del EQ del equipo a la vez, conservar el resto neutro y repetir barrido al mismo nivel. Restaurar cero antes de cambiar otra. Calcular solo diferencias relativas entre la respuesta «control cambiado» y la «respuesta neutra», por frecuencia y posición, documentando signo y límite.
6. **Interpretación**: registrar desviaciones de ruido, saturación, cancelaciones por sala, interferencias Bluetooth o cambios de nivel como *limitaciones*, no como pruebas de pérdida auditiva ni como ganancia de EQ equivalente. No recomendar automáticamente una posición física si se desconocen centro, ancho/Q, tipo de filtro y rango real de ese control.

## 4. Procedimiento B — transferencia eléctrica de EQ o preamplificador

1. Separar este ensayo del test auditivo. Elegir fuente de prueba adecuada a la entrada del circuito (nivel de instrumento/alta impedancia si aplica; interfaz y caja reamp compatible cuando se necesite). Nunca aplicar señales de nivel de parlante a una entrada de línea.
2. Capturar una señal de referencia **sin** pasar por el circuito, luego la misma señal **a través** del EQ/preamplificador, con rutas y niveles apropiados y sin recorte.
3. Repetir con controles neutros y con **una sola banda modificada**. Comparar curvas de transferencia, nivel global y presencia de saturación/ruido. Etiquetar todos los resultados como eléctricos y relativos a esa cadena.
4. Para un dispositivo como el **SE-4N**, investigar primero conexiones, impedancias y límites en el manual del fabricante. No reutilizar tonos de Hear como medición del preamplificador; no implementar automatización física sin hardware y trazabilidad.

## 5. Registro mínimo por sesión

- Fecha, versión de REW/herramienta, OS, salida real, conexión, dispositivo, muestra de señal, frecuencia de muestreo y ganancia física fija.
- Micrófono e interfaz (identificadores internos, **no publicar número de serie**), archivo/calibración aplicado, orientación, altura, distancia, posiciones y nivel de ruido base.
- Repeticiones en condición neutra y modificada; configuración de ventana, suavizado y unidades (relativas o calibradas por cadena). Capturas y archivos de medición originales almacenados localmente.
- Frecuencia nominal de cada banda física, ganancia o número de posiciones y, si está documentado, ancho/Q y tipo de filtro. Las bandas sin equivalencia quedan sin mapear.
- Incidencias de seguridad, recorte, discrepancias entre repeticiones y entre posiciones. Marcar «No probado» para todo lo no ejecutado.

## 6. Puertas antes de integrar resultados en Hear

- **Fase 1 (diseño):** este protocolo existe y distingue cadenas; **no** prueba que la medición sea válida.
- **Fase 2 (hardware):** recopilar medidas repetidas con calibración identificada, ruido de referencia, ajustes físicos verificados y evidencia de seguridad.
- **Fase 3 (interpretación):** revisión técnica de la reproducibilidad, equivalencias reales de frecuencia/Q/unidades y limitaciones por sala/posición.
- **Fase 4 (software, decisión futura):** solo después considerar un modo independiente de respuesta del equipo, con consentimiento y etiquetas claras. No mezclar con umbrales auditivos ni publicar corrección universal/SPL sin cadena calibrada.

**La primera medición física, el diseño del modo para instrumentos y la equivalencia de filtros siguen pendientes.** Para ensayos de uso final ver [registro por dispositivo](./HEAR-V2-REAL-DEVICE-REPORT.md).
