# Hear 3.0 — D-058 · Acceso por teclado, salida de emergencia y mensajes accesibles

**05/11/2026. Estado: mejoras verificables de interacción y regresión automatizada; NO auditoría WCAG 2.2 AA completa ni ensayo con lector de pantalla/tecnología asistiva real.** Issue maestro [#30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Comportamiento implementado

El piloto integrado incorpora un enlace **«Saltar al contenido principal»** visible al enfocarlo con Tab, destino semántico `main` con foco programático y estilos de enfoque para botones, enlaces y campos. La pulsación **Escape** durante el barrido, tono individual o comparación contextual detiene el audio digital y conserva el estado de interrupción; **no registra una respuesta auditiva ni reanuda sonido**. Esta acción es auxiliar a los botones de detención existentes. El piloto aislado de canales izquierdo/derecho también responde a Escape mientras reproduce un tono.

Los estados de audio y comparación con `role=status`/`aria-live=polite` se actualizan **solo si cambia el texto**, evitando reescribir en el DOM un mensaje idéntico cada 120 ms. Las lecturas digitales que se actualizan frecuentemente siguen con `aria-live=off` para no inundar lectores de pantalla. Tras pulsar «Finalizar y ver resumen» se mueve el foco al encabezado del EQ provisional; las instrucciones mantienen la distinción dBFS/dB SPL. No se asigna el oído izquierdo/derecho ni se ajusta volumen real mediante atajos.

## Pruebas

- `tests/browser/hear3-keyboard-accessibility.spec.cjs`: Tab/Enter para saltar al contenido, estados ARIA, Escape en barrido y tono, imposibilidad de generar observaciones falsas, ausencia de modificación de estado por Escape repetido sin audio, y verificación con MutationObserver de que no se reemite un status idéntico en cada tick.
- `tests/browser/hear3-headphone-channel-check.spec.cjs`: Escape detiene el tono izquierdo sin dejar respuesta ni habilitar examen por oído.
- Regresión anterior Node/contratos/beta Hear2 y Android Chromium/iPhone WebKit/desktop 4:3 y 21:9. Estas pruebas no sustituyen la navegación ni percepción de estados con VoiceOver, TalkBack, NVDA u otras tecnologías reales.

## Alcance pendiente para WCAG

Auditar manualmente objetivos WCAG 2.2 AA, contrastes de todos los componentes, reflujo a zoom 200–400%, manejo de modales/dialog nativos, foco durante operaciones fallidas, estados y controles en pantallas móviles reales, reducciones de movimiento y pruebas con lectores de pantalla. La accesibilidad de una app no se certifica únicamente con DOM/Playwright.

## Reversión

Revertir el PR devuelve comportamiento anterior de foco y teclas sin afectar el audio que estaba programado antes, pero pierde la vía adicional Escape de seguridad. No borra perfiles, resultados ni altera Hear 2.0.
