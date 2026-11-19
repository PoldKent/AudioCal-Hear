# Hear 3 · Estado de cierre del software y puerta de publicación estable

**Revisión de alcance: 19/11/2026.** Repositorio `PoldKent/AudioCal-Hear`. Esta página sustituye la expectativa de «100 % terminado» por una separación comprobable entre **aplicación web funcional** y **verificación acústica/operativa de hardware**. No certifica ensayos que no se hayan ejecutado.

## Experiencia pública entregada

| Área | Capacidad integrada | Limitación explícita |
| --- | --- | --- |
| Inicio | Una acción dominante; examen sin cuenta, menú secundario de ayuda | Los ajustes técnicos nunca bloquean el recorrido normal |
| Audio | Confirmación de volumen físico bajo, barrido logarítmico de 20 s, salto/paro, tonos independientes, tres respuestas perceptivas, respuesta inmediata | dBFS digital NO es SPL físico ni medida clínica |
| Examen | Bandas de 2–31 frecuencias declaradas, confirmación de contradicciones, checkpoints recuperables sin autoplay | Recuperar requiere acción y verificación de salida; no garantiza identidad del dispositivo |
| Resultado | Un EQ conjunto experimental acotado, gráfica vertical, valores exactos en texto, revisión de procedencia, guía manual | Ganancias no validadas para equipo específico, sin PEQ/filtro Q inventado |
| Exportación | Copiar, descargar TXT, CSV y PNG, guardado opcional con confirmación | No aplica la curva automáticamente |
| Historial | Editor real tras guardar, catálogo, copias/restauración, salvaguarda de los datos Hear 2 | No sincroniza datos en nube ni crea cuentas |
| Privacidad | Foto voluntaria local, herramientas de diagnóstico locales, descarga offline por consentimiento | Los datos locales dependen de almacenamiento del navegador |
| Localización | Recorrido principal traducido en español, inglés, francés, portugués, italiano, alemán, chino simplificado y japonés | Las páginas técnicas y textos avanzados continúan parcialmente en español |
| Responsive | Comprobaciones de escritorio 4:3/21:9, Android y WebKit en CI | Simulación de navegador no sustituye ensayos físicos |

## Integridad de EQ y seguridad

- El barrido continuo **solo prioriza las confirmaciones**, no genera umbrales ni ganancias por sí solo.
- «Se escucha bien»: mantener bandas sin contradicción a 0 dB; «no se escucha»: una subida de solo +0,5 dB exige intentos suficientes y techo digital autorizado; «demasiado fuerte»: propuesta de recorte máximo de 1 dB, con parada física de señal al responder. Las otras bandas utilizan los contrastes subjetivos verificables del motor acotado.
- Límites por dispositivo del modelo existente: máximo nominal 2 dB para automóvil/altavoces y 3 dB para las otras categorías, sin garantías de headroom ni protección acústica física.
- Respuestas inválidas, IDs falsos, tonos retirados o barridos interrumpidos no pueden inventar evidencia verificada. Un resultado sin calibración se etiqueta como hipótesis orientativa, nunca como diagnóstico.
- La adaptación gráfica y temporal no sustituye la fuente Web Audio del tono. El contador visual **es aproximado** y solo el motor de audio decide si el tono sigue sonando.

## Verificación de software (criterios, no certificado de hardware)

**Pipeline exigida para publicar:** `npm run verify`, `Hear 3.0 contracts`, `AudioCal Hear 2.0 beta bundle`, `Static app integrity` y matriz Playwright `android-9x21-chromium`, `iphone-webkit`, `desktop-4x3`, `desktop-21x9`. Las pruebas cubren inicio seguro, barrido y paro, respuesta de tonos, EQ idéntico en pantalla/descarga/archivo, no duplicación, recuperación, idiomas, CSV/PNG, offline, privacidad y regresiones del motor heredado. Cada nueva versión debe superar la matriz sobre su **commit exacto** antes de fusionar.

**Fallos intermitentes investigados:** en una ejecución sobre `main` del 19/11, WebKit observó una expiración sintética del tono de comprobación estéreo antes de Escape. Se separó el temporizador falso de la prueba de Escape, sin retrasar o deshabilitar la interrupción real de audio. Si la prueba antigua de consola también falla en ejecución de `main`, debe conservarse el fallo con artefactos y corregirse antes de declarar el commit libre de regresiones.

## Pendiente que NO puede cerrarse con código o simulaciones

La puerta [D-063](release-evidence-gate.json) sigue abierta y con `stableReleaseClaim:false`. Sus **13 auditorías** continúan sin evidencia física verificada: Android, Safari/iPhone, escritorio, rutas Bluetooth, separación L/R, niveles acústicos reales/dB SPL, percepción comparativa, EQ/headroom/clipping, WCAG 2.2 AA con tecnología asistiva, almacenamiento offline real, privacidad de imágenes, migración V2 con muestras y reversión de producción.

**Otras investigaciones condicionadas a dispositivos y evidencias:** validez comparativa del modelo de EQ, síntesis por oído, catálogo de fabricantes y conversiones fiables a controles físicos. No se fabricarán mediciones, calibraciones, modelos de dispositivo ni resultados de usuarios.

### Requisitos para reclamar «estable y completamente validado»

Cada auditoría debe incluir identificador de dispositivo, SO/navegador, versión de Hear, condiciones, método, resultado observado/esperado y artefacto no personal. La reversión debe ensayarse realmente, y la revisión de accesibilidad y seguridad debe registrar sus excepciones. **Solo después** de revisar toda la evidencia, la autorización del producto puede considerar cambiar `stableReleaseClaim` a `true`.

## Reversión conservadora

- El sitio se publica desde `main` por GitHub Pages. Conservar commit anterior y artefacto de despliegue para identificar una reversión exacta.
- Para una regresión grave de audio o privacidad, dejar de publicar la versión afectada y desplegar el commit previamente validado mediante el flujo documentado; no borrar los datos locales de usuarios ni ejecutar migraciones destructivas.
- Los registros de Hear 2 continúan intactos bajo sus propias claves. La caché offline de Hear usa un prefijo aislado que puede revocarse desde la interfaz; esa revocación no sustituye una prueba física de rollback.
- Este procedimiento es una instrucción de recuperación: **NO** constituye por sí mismo un rollback ensayado. La auditoría `rollback-production` permanece pendiente.

**Fuentes de seguimiento:** [auditoría #90](https://github.com/PoldKent/AudioCal-Hear/issues/90), [puerta D-063 #96](https://github.com/PoldKent/AudioCal-Hear/issues/96), [investigación técnica #26](https://github.com/PoldKent/AudioCal-Hear/issues/26).
