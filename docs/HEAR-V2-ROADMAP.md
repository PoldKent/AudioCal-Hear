# AudioCal Hear 2.0 — estado verificable y trabajo pendiente

**Actualización:** 2026-11-02. La PR [#29](https://github.com/PoldKent/AudioCal-Hear/pull/29) fusionó en `main` el trabajo previamente apilado en #22, #23, #24, #25, #27 y #28. No volver a fusionar esas PR como si estuvieran pendientes.

## Ruta principal

1. Configurar el dispositivo y las frecuencias y escala reales del EQ (4/5/7/10/personalizadas).
2. Comprobar canales, usar volumen físico bajo, cómodo y fijo; barrido previo opcional, más lento en extremos por debajo de 250 Hz y desde 15 kHz.
3. Completar las respuestas adaptativas por oído y frecuencia; permitir volver a la anterior sin borrar mediciones independientes. Un primer «No» permite reintentar gradualmente con +3 dBFS dentro de límites digitales seguros.
4. Mostrar umbrales digitales registrados y confianza, separados de las ganancias EQ. Ofrecer **un único EQ editable**, propuesta conservadora, copia/PNG/TXT e instrucciones de aplicación.
5. Guardar e importar/exportar perfiles. Solo después, y de forma opcional, comparar música, realizar sonoridad A/B o transferir valores a hardware.

## Verificado por automatización

Las comprobaciones de fuente, integridad de la app y navegador para el commit integrado en `main` finalizaron correctamente el 2026-11-02. Eso confirma consistencia de software, no calibración acústica, precisión clínica ni hardware Bluetooth real. Un EQ en 0 dB puede ser correcto cuando la evidencia no justifica modificación: no forzar ganancias para conseguir una gráfica con cambios.

## Pendiente de validación

- **P0:** probar diez bandas por oído en auriculares, siete en vehículo estacionado y cinco en parlantes reales; confirmar ruta Bluetooth, seguridad de volumen, permisos de micrófono, persistencia e importación/exportación ([issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26)).
- **P0:** reproducir casos de umbrales presentes pero EQ neutro: cobertura, discrepancias entre oídos, calidad de evidencias y ausencia legítima de contraste. No convertir diferencias dBFS directamente en ganancias acústicas.
- **P1:** comprobar accesibilidad móvil, localización en ocho idiomas y que las opciones de música/refinamiento no interrumpen el flujo principal. Seguir retirando únicamente duplicaciones y código sin referencias verificadas.
- **P2:** estudiar por separado respuesta de sala/equipo con protocolo físico validado, instrumentos con entrada real y posibles integraciones con APIs documentadas. No prometer aplicaciones universales ni equivalencia HearID sin evidencia.

## Criterio de finalización

CI verde **y** validación en dispositivos reales con reproducción segura y resultados interpretables. Nunca presentar dBFS como dB SPL, afirmar audiometría clínica, ni indicar elevar el volumen físico para alcanzar frecuencias inaudibles. Mantener [el issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26) abierto hasta las pruebas físicas.
