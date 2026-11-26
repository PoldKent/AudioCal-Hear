# AudioCal Hear — Auditoría vigente del repositorio

[English](AUDIT.md) · **Español** · 26/11/2026

Base: [commit publicado e5bdc69](https://github.com/PoldKent/AudioCal-Hear/commit/e5bdc69d8ee537e891dcc79de839c511931c0963). Revisión de fuentes, documentación y navegador simulado, no prueba de penetración independiente, certificación WCAG ni calibración acústica.

| Área | Hallazgo / acción |
|---|---|
| Publicación | [Despliegue Pages](https://github.com/PoldKent/AudioCal-Hear/actions/runs/45869971878) exitoso; #105 y #106 fusionadas, sin PR abiertas en la comprobación inicial |
| Navegadores | Escritorio 21:9 (240 aprobadas), escritorio 4:3 y Android aprobados; iPhone aprobado al revisar. [Matriz](https://github.com/PoldKent/AudioCal-Hear/actions/runs/45869972411) |
| Documentación | README y guía de desarrollo distinguen la web modular Hear 3 del respaldo histórico Hear 2. Las descripciones históricas siguen accesibles. |
| Apoyo | Guía bilingüe, metadatos de financiación de GitHub y enlaces traducidos en Ayuda; datos de depósito exactos de [Stickers Sonoros](https://github.com/PoldKent/stickers-sonoros/blob/main/SUPPORT.md). Sin pago ni transferencia automática. |
| Privacidad | Borrado delimitado, limpieza de imagen en BFCache, diario de restauración y registros separados del EQ original/manual; sin borrado indiscriminado. |
| Sin conexión | Manifiesto estático y versión de caché sincronizada; sin guardar datos personales ni enlaces externos de apoyo. |
| Pendientes | Examen técnico, historial y editor guardado parcialmente traducidos; equivalencias por modelo y síntesis por canales sin evidencia suficiente. Sin certificación acústica ni de accesibilidad independiente. |

La revisión nueva de colaboración/documentación requiere sus propios resultados de CI: [Actions](https://github.com/PoldKent/AudioCal-Hear/actions) e [incidencia #90](https://github.com/PoldKent/AudioCal-Hear/issues/90). La aceptación del hardware está registrada en #96; se mantiene `stableReleaseClaim:false`. No se deduce exactitud clínica, SPL real ni compatibilidad universal.

## Auditoría histórica (30/10/2026)


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
