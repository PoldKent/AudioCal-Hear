# AudioCal Hear 2.0 — pruebas con la versión actual

**La PR #29 fue fusionada en `main` el 2 de noviembre de 2026.** La antigua guía para PR #25 y la rama apilada `feat/hear-v2-inline-loudness` ya no representa la versión actual.

## Cómo abrir una copia local

1. Desde el [repositorio](https://github.com/PoldKent/AudioCal-Hear), descarga el ZIP de `main` y extráelo en una carpeta distinta a tu instalación habitual.
2. Con Node.js 20 o superior ejecuta `npm run beta` desde la raíz; abre `http://127.0.0.1:8765/`. También funciona `node tools/serve-beta.mjs`, sin instalar paquetes adicionales.
3. Para un futuro paquete de una PR, busca **Checks → AudioCal Hear 2.0 beta bundle** en esa PR. Los artefactos anteriores son instantáneas históricas, no entregas automáticas de la versión vigente.

El sitio de GitHub Pages y `localhost` tienen almacenamientos locales independientes. Exporta tus perfiles como JSON antes de copiar, borrar o cambiar de origen.

## Pruebas prioritarias

- Preparar un dispositivo real, comprobar canales y mantener volumen físico bajo, cómodo y constante.
- Completar el examen con barrido previo opcional; confirmar que el botón de frecuencia anterior no borra otras frecuencias y que el primer tono inaudible reintenta +3 dBFS hasta el límite de seguridad.
- Comprobar umbrales por banda, explicación de fiabilidad y **un solo EQ editable**; verificar PNG, TXT, importación/exportación y recarga.
- No interpretar 0 dB de ganancia como ausencia de medición: inspeccionar la calidad y el contraste de los datos originales.
- **Solo después**, si se desea, desplegar la comparación musical y cargar un archivo propio. La música y los refinamientos opcionales no deben bloquear los resultados del examen.

## Límites y reporte

No es audiometría clínica, ni mide dB SPL; no puede establecer por sí sola la respuesta en frecuencia de un dispositivo externo ni controlar su ecualizador. La validación física de Bluetooth, seguridad y percepción sigue pendiente en [issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26). Reporta únicamente información técnica no sensible. Ante dolor, zumbidos o distorsión detén la prueba y no subas el volumen físico.
