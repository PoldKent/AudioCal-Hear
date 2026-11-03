# Hear 2.0 — accesibilidad y traducciones: validación manual pendiente

Estado: **pendiente de ejecutar en dispositivos reales**. Este documento no certifica compatibilidad con lectores de pantalla ni exactitud lingüística.

## Protocolo de aceptación

1. En un teléfono Android real, activar **TalkBack** y recorrer con gestos los apartados Configurar, Prueba, Ajustes y Perfiles. Confirmar orden de foco, lectura de las frecuencias y estado de botones, ausencia de anuncios repetitivos y acceso al EQ por controles discretos.
2. En iPhone real, activar **VoiceOver** y repetir el recorrido, incluyendo el control deslizante de frecuencia, las secciones desplegables, la transferencia y el reproductor de audio.
3. Con teclado, usar Tab / Shift+Tab para acceder a «Saltar al contenido», seleccionar una banda con Enter/Espacio y modificar su ganancia con las flechas. Verificar el foco al abrir/cerrar paneles y al cambiar de pantalla.
4. Activar reducción de movimiento y comprobar desplazamientos, vista móvil y navegación sin animaciones molestas.
5. Cambiar sucesivamente entre español, inglés, francés, portugués, italiano, alemán, chino y japonés en resultados completos e incompletos. Leer títulos, alertas dinámicas, rangos dBFS, advertencias de seguridad, botones, etiquetas accesibles y exportaciones. Comprobar que valores numéricos, nombres de perfiles y mediciones no se alteran.
6. Confirmar que las funciones esenciales siguen disponibles sin subir música: test adaptativo, cambio de frecuencia anterior, EQ editable, copia, PNG, TXT, perfiles y evidencia.
7. En la comparación de música, comprobar que el control de bypass anuncia tanto el texto como su estado activado/desactivado. No duplicar ecualizadores activos.

Para registrar un ensayo real sin datos personales, utiliza la [plantilla de reporte por dispositivo](./HEAR-V2-REAL-DEVICE-REPORT.md).

## Registro de resultados

Para cada dispositivo anotar modelo, navegador, versión del sistema, lector de pantalla, idioma, fecha, pasos ejecutados, resultado (aprobado/falló/no probado), capturas o vídeo, incidencia y corrección.

**Las suites automáticas** de Node y Playwright no sustituyen estas comprobaciones. El aislamiento real de canales, las rutas Bluetooth, la respuesta acústica y la seguridad del volumen necesitan pruebas con hardware según [issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26).

## Accesibilidad de navegación y prueba auditiva (pendiente de verificación manual)

- Al pulsar una pestaña, el foco del lector debe pasar al título de la sección seleccionada.
- Durante el test, comprobar que al responder «Sí» o «No» con teclado se mantiene el foco en un control válido para continuar. El cambio de frecuencia debe anunciarse una sola vez, sin recitar toda la pantalla ni interrumpir el tono.
- Confirmar que el indicador de progreso anuncia su porcentaje y que la frecuencia de prueba es un encabezado navegable.
- Verificar en TalkBack y VoiceOver reales que los avisos de estado no se pierden ni se duplican. Las pruebas automatizadas solo cubren la estructura y el foco en navegador simulado.
