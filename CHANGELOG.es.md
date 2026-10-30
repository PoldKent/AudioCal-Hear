# Historial de cambios

[English](CHANGELOG.md) | **Español**

## v1.8.0 — 2026-10-30

- Nuevo rango digital configurable de −24 a −84 dBFS, inicio seguro predeterminado de −36 dBFS, confirmaciones al aproximarse a −24 y advertencias en el mínimo.
- Respuestas explícitas escucho/no escucho, búsqueda aproximada de 12 dB, ajuste de 1 dB y dos tonos de confirmación; hasta 60 segundos de reproducción por primera prueba de frecuencia.
- Se conserva la opción «Lo seguía escuchando» al alcanzar el mínimo sin generar recortes EQ automáticos.
- Preparación guiada de tres pasos, micrófono opcional para ruido relativo no calibrado, modo rápido de hasta seis frecuencias y modo completo, auriculares por oído predeterminados y gráfica no clínica izquierda/derecha.
- Se mantienen los ecualizadores de 7 y 10 bandas de las fotografías, los demás formatos y los perfiles anteriores.
- Comprobaciones de sintaxis, adaptación de pantalla, traducciones y simulación de umbrales; pendiente validación acústica real.

## v1.7.0 — 2026-10-30

- Nuevo módulo opcional de **Equilibrio tonal inteligente**: dos comparaciones musicales A/B por banda, invirtiendo el orden y afinando en la verificación.
- Se aplican **±2 dB** solo con respuestas coherentes, **±1 dB** con una preferencia respaldada parcialmente y **0 dB** con respuestas contradictorias o iguales. Recortes limitados a −6 dB y aumentos a +3 dB mediante sesiones repetidas.
- Los datos auditivos antiguos siguen siendo compatibles y se guardan ajustes de balance e historial de decisiones por equipo.
- Al terminar el tono se pregunta si aún era audible; oírlo hasta el final **no provoca recortes automáticos**.
- Margen de salida fijo entre A/B; la sonoridad percibida no queda perfectamente igualada.
- Comprobaciones en Chromium simulado para móvil, escritorio, filtros de audio y persistencia local; faltan pruebas con hardware Bluetooth real.

## v1.6.1 — 2026-10-30

- El indicador «Sin instalar» se alinea a la izquierda en su propia fila para móviles estrechos, incluidos los de proporción 9:21.
- Tamaño adaptable del contenido y distribución en dos columnas en Configuración y Ajustes para pantallas de escritorio 4:3 a 21:9.
- Eliminados espacios vacíos innecesarios junto al reproductor musical en pantallas ultrapanorámicas.
- Verificados varios tamaños y ocho traducciones sin desbordamiento horizontal.
- Sin alterar los algoritmos de audio, perfiles guardados ni frecuencias.

## v1.6 — 2026-10-30

- Localización integrada para ocho idiomas (español, inglés, francés, portugués, italiano, alemán, chino simplificado y japonés), con selector persistente y detección del idioma del navegador.
- Traducidas las pantallas principales, avisos de seguridad, mensajes y etiquetas de accesibilidad; se respetan los nombres que escribió el usuario.
- Eliminados una función duplicada, estados y constantes sin uso, reglas CSS antiguas y procesamiento redundante del deslizador.
- Sin modificar el motor auditivo, los algoritmos de EQ ni la compatibilidad de los perfiles anteriores.
- Pruebas con los ocho idiomas en Chromium móvil simulado, examen de tonos y controles de EQ.

## v1.5 — 2026-10-30

- Configuración rediseñada con tarjetas de dispositivo y ecualizador, opciones directas de escucha y verificación, y resumen compacto de duración.
- El perfil activo es protagonista; los respaldos y la lista de frecuencias quedan en paneles plegables.
- Nuevo editor de EQ: tocar una banda para seleccionarla y ajustar con deslizador o botones ±, sin reiniciar la música.
- Valores detallados y estadísticas disponibles al expandir sus paneles; pantalla principal más compacta.
- Compatibilidad con perfiles previos y motor de prueba auditiva conservados.

## v1.4 — 2026-10-30

- Tres rondas opcionales de preferencias musicales A/B (graves, voces y agudos), guardadas por separado del examen auditivo.
- Aviso de frecuencias sin umbral utilizable y opción de repetir solo esas bandas.
- Se evita calcular la compensación auditiva si menos del 60% de las bandas tienen resultados utilizables; siguen activos los ajustes de preferencias y los manuales.
- Los cambios manuales de EQ ya no reinician la reproducción de música.
- Aviso del rango ±6 dB exclusivamente para el ecualizador original de automóvil de 7 bandas.
- Advertencias más claras sobre el uso de volumen cómodo y los límites de precisión.

## v1.3 — 2026-10-30

- Nueva prueba adaptativa: saltos de hasta 6 dB al principio y ajustes de 1 dB al final, con 3 segundos de escucha por nivel.
- Máximo de 42 segundos en la primera pasada; la verificación opcional añade hasta 15 segundos: **57 segundos por frecuencia y oído**.
- Una pasada por defecto y actualización de los avisos de duración y las indicaciones del examen.
- Si no se encuentra el umbral, se registra como no determinado, sin inventar un resultado.
- Se conservan los perfiles guardados anteriormente.

## v1.2 — 2026-10-30

- Aviso de duración estimada en Configuración, actualizado al elegir bandas, canales, repeticiones o frecuencias propias.
- Máximo del barrido calculado a partir de 41 niveles × 3 segundos × número de muestras.
- Tiempo pendiente visible en el examen; estimación personalizada a partir de dos umbrales medidos, cuando existan.
- Se registra el tiempo de cada prueba, manteniendo la compatibilidad con perfiles anteriores.
- Sin cambios en el motor de generación de tonos ni en el algoritmo de EQ.

## v1.1 — 2026-10-30

- 3 segundos por nivel, descenso de 1 dB y visualización de la cuenta regresiva.

## v1.0 — 2026-10-30

- Examen auditivo con tonos descendentes, perfiles y resultados en dB.
- Perfiles de ecualizadores de 7 y 10 bandas, estándares adicionales y personalizado.
- Escucha A/B con archivo de audio local, exportación e importación.