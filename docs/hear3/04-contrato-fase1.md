# Hear 3.0 — Fase 1: contratos y adaptador Web Audio aislado

**Aprobación global:** 4 de noviembre de 2026, [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). **Estado:** implementación inicial en [PR #31](https://github.com/PoldKent/AudioCal-Hear/pull/31) (borrador); sin integración en la UI pública de Hear 2.0.

## Componentes entregados

- `src/hear3/session-contract.mjs`: estado puro de una sesión, observaciones, límites digitales autorizados, invalidación de tonos interrumpidos, comprobación de ruta y reanudación explícita.
- `src/hear3/device-profile-contract.mjs`: bandas gráficas de 2 a 31 con frecuencias propias, procedencia, control físico separado de dB y compatibilidad sin suponer validación acústica.
- `src/hear3/web-audio-adapter.mjs`: adaptador real **aislado** de Web Audio con oscilador sinusoidal, ganancia calculada a partir del nivel digital autorizado, separación L/R solo donde se admite, comprobación Nyquist, duración limitada, cancelación de `AudioContext.resume()` tardío, parada mediante ganancia cero y desconexión de nodos, limpieza por `visibilitychange` y `pagehide`.
- `src/hear3/audio-session-controller.mjs`: conecta sesión con adaptador; rechaza respuestas antes del inicio audible, detiene tonos al responder, pausa ante rutas o interrupciones y trata tonos expirados sin respuesta como **datos no concluyentes**, nunca como `not-heard`.
- Las cuatro suites `tests/hear3-*.test.mjs` incluyen **23 pruebas unitarias**: 5 de sesión, 4 de perfiles, 7 del adaptador y 7 del controlador.
- `.github/workflows/hear3-contracts.yml`: automatiza `npm run verify` en PR y cambios de rama que incluyan estos módulos.

## Verificación realizada y pendiente

- Para este incremento se ejecutaron **14/14 pruebas locales** del adaptador y del controlador con Node 22. Las **9 pruebas iniciales** de sesión y perfiles fueron verificadas localmente en el incremento anterior.
- **Pendientes de confirmar desde GitHub:** ejecución de `npm run verify` sobre el repositorio completo y resultados del workflow.
- **Pendientes de integración:** pruebas con Web Audio de navegador, latencia de parada real, Bluetooth y salida seleccionada, escenarios de suspensión, modo offline y matriz real de dispositivos.

## Límites de seguridad obligatorios

- El adaptador puede llevar la ganancia digital a cero en el siguiente ciclo de procesamiento, **pero no acredita silencio instantáneo en el auricular ni seguridad en dB SPL**. La cadena física y el sistema operativo pueden introducir retardos.
- Ningún componente de esta fase identifica o modifica volumen físico, eleva topes preautorizados ni amplía compatibilidad de salida sin comprobación.
- La versión pública **no usa estos nuevos módulos** todavía. Los resultados y funciones del motor de Hear 2.0 no cambian por incorporar el PR.
- D-039–041/D-047: algoritmos y síntesis de EQ quedan sujetos a investigación; D-049=B/C mantiene solo exportaciones universales; D-052=A/C no autoriza generador PEQ.

## Próximas puertas

1. Confirmar CI, revisar tests, incluir pruebas de navegador con mocks y pruebas manuales reales.
2. Integrar gradualmente el controlador con UI y planificación de tonos, **sin alterar main** antes de revisar el PR.
3. Validar interrupciones con hardware y límites preautorizados. Preservar D-006=A.
4. No declarar Hear 3.0 estable hasta cumplir **todos** los P0 de D-063=C, incluidas pruebas críticas, límites, compatibilidad y reversión.
