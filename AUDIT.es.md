# AudioCal Hear — Auditoría del código (v1.6)

[English](AUDIT.md) · **Español**

## Alcance

Revisión del HTML/CSS/JavaScript de archivo único de la v1.5 y pruebas de v1.6 en Chromium móvil simulado. Es una revisión de código y navegador, **no** una medición acústica ni una auditoría de seguridad de penetración.

## Limpieza y refactorización

- Eliminada la función duplicada `approxTimeRange()`.
- Eliminados estados/constantes sin uso (`selectedSetup`, `testStep`, `MAX_FREQUENCY`, `TEST_DURATION`) y un acumulador de ganancia innecesario. `showCustom` se calcula localmente.
- Eliminadas referencias antiguas a `#deviceType` y el tratamiento duplicado del deslizador de EQ por `change`; sigue funcionando por `input`.
- Eliminados 10 grupos de reglas CSS obsoletas que ya no se utilizaban.
- Optimizada la traducción precalculando las frases de cada idioma una sola vez.
- Conservadas las claves de almacenamiento de perfiles, el examen adaptativo de tonos de 3 segundos, el algoritmo de ecualización y las frecuencias originales.

## Ocho idiomas

Español, inglés, francés, portugués, italiano, alemán, chino simplificado y japonés. Incluye configuración, navegación, perfiles, pruebas, resultados, seguridad, comparación A/B, mensajes y accesibilidad. El selector se encuentra arriba y guarda la elección localmente. No se traducen los nombres de equipos creados por el usuario. Todas las traducciones están en `index.html`, sin librerías ni Internet.

## Verificación

- Probadas las ocho localizaciones en pantallas móviles de 390 px.
- Sin desbordamiento horizontal inesperado ni excepciones JavaScript durante los flujos comprobados.
- Creación de perfiles, controles de EQ, carga de audio local y conservación del reproductor al cambiar de idioma.
- Ejercitadas la búsqueda rápida y la etapa fina de tonos, con registro de un umbral.

## Limitaciones

- No constituye audiometría clínica ni medición calibrada de parlantes; dBFS digital no equivale a dB SPL acústico.
- La elección Bluetooth y los cambios de EQ del equipo siguen fuera del navegador.
- El selector de archivos y algunos diálogos nativos usan el idioma del sistema.
- Las traducciones, especialmente términos acústicos, deberían revisarse por hablantes nativos.
- Se recomiendan pruebas reales en dispositivos Android/iOS con Bluetooth.

**Seguridad auditiva:** Utiliza un volumen bajo, cómodo y fijo. Nunca hagas la prueba al máximo ni aumentes el volumen para oír un tono que no aparece.
