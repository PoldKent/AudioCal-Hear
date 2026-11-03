# Hear 2.0 — registro de validación en dispositivos reales

**Estado inicial: sin ensayos físicos registrados.** Copia esta plantilla por dispositivo/sesión y completa solo lo que realmente probaste. No implica certificación acústica, clínica ni médica.

## 1. Contexto reproducible

| Campo | Valor (completar) |
|---|---|
| Fecha y zona horaria | |
| Commit/versión visible de Hear | |
| Dispositivo de prueba (Android/iPhone/PC, modelo genérico) | |
| SO y navegador | |
| Auriculares, automóvil estacionado o parlantes (modelo) | |
| Conexión y salida seleccionada (Bluetooth/AUX/cable) | |
| Formato y número de bandas del EQ | |
| Escala física y equivalencia documentada, si existe | |
| Entorno/posición y fuentes de ruido | |
| Volumen físico inicial cómodo y fijo | |
| Accesibilidad (ninguna/TalkBack/VoiceOver/teclado) | |

**Seguridad antes de empezar:** volumen bajo, cómodo y constante; EQ externo neutro; nunca subir volumen para buscar tonos inaudibles. No probar mientras se conduce. Detener ante molestia, zumbidos, dolor o distorsión. dBFS digital **no** mide dB SPL ni la capacidad física aislada del equipo.

## 2. Matriz de comprobación

Marca **Aprobado**, **Falló**, **No probado** o **No aplica**. Añade observaciones verificables, sin datos personales de audición.

| Prueba física o funcional | Resultado | Observación / incidencia |
|---|---|---|
| Ruta de salida elegida: el sonido se escucha en el dispositivo correcto | No probado | |
| Bluetooth se mantiene al iniciar, detener, cambiar de pantalla y reanudar | No probado | |
| La prueba izquierda solo se escucha en izquierda y derecha solo en derecha (auriculares) | No probado | |
| El tono se detiene al pulsar Detener, al cambiar de pestaña o al bloquear/ocultar la página | No probado | |
| Volumen cómodo durante toda la sesión, sin saltos ni distorsión perceptible | No probado | |
| Las respuestas Sí/No y los límites no inventan umbrales ni correcciones automáticas | No probado | |
| Test completo y recuperación tras recarga | No probado | |
| Una sola curva de EQ: barras, copia, PNG y TXT muestran la misma ganancia | No probado | |
| Transferencia a otro ecualizador solo cuando frecuencia y escala están verificadas | No probado | |
| Comparación musical con EQ activado/desactivado, sin forzar una preferencia | No probado | |
| Micrófono opcional: sin permiso solicitado al inicio, denegación no bloqueante y pista liberada | No probado | |
| Respaldo JSON y restauración en el navegador de prueba | No probado | |
| El diseño cabe en pantalla sin desplazamiento horizontal indeseado | No probado | |
| TalkBack/VoiceOver: foco, anuncios de frecuencia/oído, controles y pasos comprensibles | No probado | |
| Los ocho idiomas mantienen etiquetas coherentes sin alterar valores ni perfiles | No probado | |

### Escenarios mínimos de hardware

1. Auriculares **Soundcore**, 10 bandas, test de cada oído en un Android real; repetir con otra marca de auriculares si está disponible.
2. iPhone real con Safari/VoiceOver y salida compatible. Registrar si no está disponible en vez de marcar aprobado.
3. Automóvil **estacionado**, ecualizador real de siete bandas, motor apagado y volumen cómodo fijo.
4. Parlantes con ecualizador real de cinco bandas, posición de escucha fija.
5. Perfil personalizado de cuatro bandas: verificar únicamente correspondencias documentadas, no asumir filtros o dB equivalentes.

## 3. Anomalías y decisión

- **ID / escenario:**
- **Pasos concretos para reproducir:**
- **Esperado:**
- **Observado:**
- **Frecuencia:** siempre / intermitente / una vez
- **Impacto:** seguridad de sonido / pérdida de evidencia / navegación-accesibilidad / presentación
- **Severidad propuesta:** bloqueante / alta / media / baja
- **Evidencia permitida:** captura recortada y anonimizada, versiones y configuración técnica; **sin** grabaciones privadas, exportaciones JSON, nombres ni audiogramas personales
- **Estado final:** pendiente / solucionado en software / requiere repetición en hardware

### Puerta de cierre

El [issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26) permanece abierto hasta contar con registros de ensayos físicos suficientes. La CI verde **no** sustituye rutas Bluetooth reales, SPL calibrado, seguridad percibida ni pruebas con lectores de pantalla reales. No afirmar equivalencia con HearID ni compensación acústica objetiva sin validación de medición.
