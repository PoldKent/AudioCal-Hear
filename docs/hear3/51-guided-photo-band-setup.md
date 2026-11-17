# AudioCal Hear · Preparación con fotografía y etapas guiadas

## Experiencia única, sin otra versión
Hear mantiene su única entrada pública y su motor de examen original. En `/hear3-exam/` se integra una guía con cuatro etapas visibles (equipo, barrido, tonos y ecualizador) que refleja el estado del motor existente. La navegación únicamente desplaza la vista, no responde tonos ni adelanta etapas del audio. Durante un tono, un barrido o una comparación en reproducción, impide navegar hasta que el sonido se haya detenido.

## Reconocimiento fotográfico prudente
En la configuración de equipo, el usuario puede seleccionar una foto JPG/PNG/WebP local de hasta 8 MB. La imagen solo se previsualiza en un canvas del navegador; Hear no envía la foto por red ni la guarda en perfiles, respaldos o caches. El usuario puede descartarla, limpiando el canvas de memoria.

- Si el navegador **dispone de `TextDetector`**, se intentará reconocer etiquetas. El soporte es variable, así que nunca constituye un requisito para poder realizar el examen.
- Se aceptan propuestas de **2 a 31** frecuencias realmente ordenadas entre **20 y 20.000 Hz**, sin duplicados y con etiquetas Hz/kHz o correspondencia exacta con los dos conjuntos de referencia previamente declarados por el usuario. Las ganancias, códigos de modelo o números ambiguos no se transforman en frecuencias verificadas.
- El motor de prueba **no acepta datos de la foto automáticamente**. Primero se selecciona «Usar estas frecuencias para revisarlas» para copiar los números al formulario personalizado; después se debe pulsar «Confirmar las bandas del EQ». Sin esas acciones las bandas no cambian.
- Si el navegador no dispone de OCR o el OCR es dudoso, la foto permanece temporalmente a la vista para transcripción manual de bandas, sin instalar dependencias ni enviar información a servicios externos.
- El botón de configuraciones de referencia para automóvil o auriculares también requiere elección y confirmación. Ninguna vía presume el modelo, escala física, ganancia segura o filtros reales del equipo.

## Regresión y privacidad
- Node: parsing restrictivo de etiquetas, rechazo de frecuencias ambiguas, duplicadas, fuera de orden o fuera de rango; referencia conocida y no certificada.
- Playwright: cámara simulada con detección compatible, navegador sin detector, formulario y confirmación, limpieza visual, navegación sin reproducir sonido.
- Los scripts se integran en la lista de recursos públicos y en la descarga sin conexión voluntaria; ninguna foto forma parte de la lista.
- Sin cambios en el bloque del motor original comparado con su fixture; no se modifica la lógica acústica probada.

## Pendientes que no deben confundirse con esta mejora
El reconocimiento de imágenes no es universal ni constituye detección física automática del hardware. Todavía requieren trabajo la traducción íntegra a ocho idiomas, validación WCAG en dispositivos reales, equivalencias de controles específicos, pruebas acústicas de SPL/headroom/Bluetooth, migración sin pérdidas de todos los registros antiguos y condiciones D-063. El indicador `stableReleaseClaim:false` sigue vigente.
