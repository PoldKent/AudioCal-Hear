# AudioCal Hear — Auditoría del código v1.8.1

[English](AUDIT.md) · **Español** · Revisión realizada el 30 de octubre de 2026

## Alcance

Se revisó el HTML/CSS/JavaScript completo de la v1.8.0, los formatos de ecualizador, la reproducción Web Audio, la búsqueda adaptativa de tonos, las recomendaciones, importación/exportación, perfiles locales y localización. Es una **auditoría de código y navegador simulado**, **no** una prueba de penetración independiente, validación médica o acústica calibrada, ni una garantía de compatibilidad Bluetooth real.

## Problemas y correcciones

| Prioridad | Problema | Corrección v1.8.1 |
| --- | --- | --- |
| Alta | Un JSON importado podía contener estructuras de `measures` incorrectas y provocar errores | Normalización de perfiles y medidas; validación de bandas y datos, límite de respaldo de 2 MB, hasta 100 importaciones y 200 perfiles residentes |
| Alta | Las bandas interpoladas podían contarse como mediciones reales tras cambiar de formato | Separar valores medidos de estimados y exigir un mínimo del 60% de bandas **realmente medidas** para proponer compensación auditiva automática |
| Media | El modo rápido anunciaba estimaciones en bandas no examinadas, pero la interpolación no funcionaba allí | Interpolación logarítmica únicamente entre frecuencias observadas, sin extrapolar ni cubrir intervalos mayores a 5 veces la frecuencia |
| Media | La reserva de volumen se basaba en el deslizador más alto, no en la respuesta conjunta de los filtros | Estimación del pico de la **cadena completa** de filtros con margen adicional de 2 dB; presupuesto de volumen fijo durante A/B y bypass |
| Media | Al salir de Ajustes y volver podía reconstruirse el reproductor sin reconectar el procesamiento | Volver a asociar el procesamiento de reproducción cuando cambia el elemento de audio y limpiar conexiones antiguas |
| Media | Había funciones, estados y referencias antiguas sin uso | Eliminados dos ayudantes sin uso, contadores obsoletos y una referencia antigua al temporizador; desconexión de nodos de tono al finalizar |
| Baja | Algunos nuevos avisos de importación y etiquetas no estaban traducidos | Mensajes añadidos a los siete diccionarios adicionales |

Se conservaron las frecuencias originales, el método auditivo principal, los ocho idiomas, las claves de almacenamiento y los perfiles guardados.

## Comprobaciones

- **12 de 12 pruebas de regresión aprobadas:** ocho idiomas, navegación móvil, creación de equipos, examen de tonos con sí/no, importación de JSON, límite de 2 MB, controles de ecualización y siete resoluciones de pantalla (360×840 a 2560×1080)
- **Pruebas del algoritmo aprobadas:** mediciones frente a bandas interpoladas, cobertura real para 31 bandas, valores seguros por defecto, historial de ajustes y estimación de respuesta de filtros superpuestos
- **Prueba del reproductor aprobada:** reproducción WAV local después de salir de Ajustes y volver
- **Sintaxis JavaScript válida**, sin excepciones del navegador en los recorridos examinados

## Lo que todavía falta

- No es posible obtener dB SPL acústicos absolutos a partir de dBFS. Hace falta comprobar **dispositivos físicos** para validar Bluetooth, canales, distorsión, micrófono y comodidad.
- El cálculo de picos toma muestras de la respuesta de frecuencia y añade margen: no garantiza matemáticamente evitar toda saturación.
- El mínimo de cobertura del 60% es un criterio preventivo de software, **no** un estándar audiométrico.
- Las traducciones técnicas merecen revisión por hablantes nativos.
- No se realizó una auditoría independiente de seguridad; los respaldos JSON no están cifrados.

**Seguridad:** Utilizar siempre volumen bajo y cómodo, nunca al máximo, sin aumentarlo para detectar tonos inaudibles. En automóvil, realizar pruebas solo estacionado. La v1.8.1 sigue siendo un **Pre-release público**.

**Enlaces:** [Release](https://github.com/PoldKent/AudioCal-Hear/releases/tag/v1.8.1) · [Aplicación](https://poldkent.github.io/AudioCal-Hear/) · [Pruebas pendientes con hardware](https://github.com/PoldKent/AudioCal-Hear/issues/1)
