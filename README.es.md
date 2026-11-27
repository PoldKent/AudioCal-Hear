# AudioCal Hear

[English](README.md) · **Español**

### Escucha. Ajusta. Disfruta.

Herramienta web gratuita y experimental de escucha y personalización de EQ para auriculares, parlantes y automóviles estacionados. No requiere cuenta, instalación ni pago.

[**Abrir Hear 3**](https://poldkent.github.io/AudioCal-Hear/) · [Resultados guardados](https://poldkent.github.io/AudioCal-Hear/hear3-library/) · [Editar un EQ guardado](https://poldkent.github.io/AudioCal-Hear/hear3-eq-editor/) · [Apoyar el proyecto](SUPPORT.md#español)

[![Pruebas de código y regresión](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/source-tests.yml/badge.svg)](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/source-tests.yml) [![Pruebas de navegador](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml/badge.svg)](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml)

## Cómo utilizar Hear 3

1. Selecciona tu equipo y frecuencias reales de EQ: 4, 5, 7, 10, 15 o 31 bandas, o 2–31 frecuencias personalizadas. Cinco bandas por defecto.
2. Ajusta y confirma expresamente un volumen físico bajo, cómodo y fijo. Nunca subas el volumen para perseguir un tono inaudible.
3. Escucha el barrido opcional; inicia cada tono y responde: lo escucho bien, no lo escucho o demasiado fuerte. Puedes detener el sonido en cualquier momento.
4. Revisa el EQ experimental. Corrige una frecuencia anterior sin perder las demás respuestas o edita el borrador manualmente en pasos de 0,5 dB dentro del límite de la categoría. Deshaz, rehace o recupera la curva original.
5. Copia valores, exporta TXT/CSV/PNG o guarda expresamente el resultado. Introduce los valores compatibles en tu equipo manualmente. Las observaciones, el EQ original y los cambios manuales se conservan por separado.

## Funciones actuales

| Área | Hear 3 |
|---|---|
| Escucha | Barrido opcional de 20 segundos, tonos iniciados por el usuario, corrección selectiva e interrupción |
| EQ | Sugerencias experimentales acotadas, borrador editable, original conservado, exportaciones |
| Datos | Historial local, archivo histórico, restauración doble explícita, borrado delimitado |
| Privacidad | Procesamiento local de imágenes, sin subidas automáticas, backend ni analítica propia |
| Interfaz | Diseño adaptable, temas del sistema/claro/oscuro, ocho idiomas; algunas rutas técnicas y errores internos aún están parcialmente traducidos |
| Sin conexión | Caché opcional del navegador; Hear 3 no es un HTML único independiente |

[Auditoría vigente](AUDIT.es.md) · [Control de evidencias](docs/hear3/release-evidence-gate.json) · [Estado del software](docs/hear3/62-software-closure-and-release-gate.md)

## Seguridad y privacidad

Esta ayuda experimental de escucha no es un audiómetro, dispositivo médico, prueba calibrada ni sustituto de un audiólogo. Los dBFS digitales no equivalen a dB SPL acústicos. Detén el sonido si causa incomodidad, dolor o zumbidos. Nunca pruebes al volumen máximo. No se aplica EQ automáticamente. No se han establecido equivalencias físicas por modelo ni validez clínica; se mantiene `stableReleaseClaim:false`. La aceptación del hardware por el responsable está registrada en [la incidencia #96](https://github.com/PoldKent/AudioCal-Hear/issues/96), no como informe independiente de mediciones.

Perfiles y archivos permanecen locales salvo exportación. La app no cifra respaldos. GitHub puede procesar datos técnicos de acceso conforme a sus políticas. [Privacidad](PRIVACY.es.md) · [Condiciones](TERMS.es.md).

## Desarrollo

Usa Node.js 22, referencia de CI. Ejecuta `npm run build` y `npm run verify` desde la raíz. La entrada pública se copia de `src/hear3-entry.html`; los módulos ES y CSS compartido están en `src/hear3/`. El HTML histórico de Hear 2 se genera por separado para recuperación; los marcadores de vista previa redirigen al inicio. [Guía de desarrollo](DEV_GUIDE.md) · [Pruebas de navegador](BROWSER_QA.md) · [CI](https://github.com/PoldKent/AudioCal-Hear/actions).

## Apoyo y colaboración

La aplicación oficial sigue siendo gratuita. Los aportes voluntarios no desbloquean funciones ni prioridad. [USDC o BBTC por Ethereum (ERC-20): instrucciones y verificación](SUPPORT.md#español). Comunica errores o propón mejoras en [GitHub Issues](https://github.com/PoldKent/AudioCal-Hear/issues) sin compartir datos privados. [Política de contribuciones](CONTRIBUTING.es.md).

## Derechos e historial

© 2026 PoldKent — Derechos reservados en la medida legalmente aplicable. El código visible públicamente no implica licencia de código abierto. Se respetan las condiciones de GitHub para repositorios públicos y las excepciones legales obligatorias. Proyecto independiente sin afiliación ni respaldo de fabricantes. [Derechos](LICENSE.md) · [Condiciones](TERMS.es.md) · [Historial](CHANGELOG.es.md) · [Notas históricas](https://github.com/PoldKent/AudioCal-Hear/releases) · [README anterior y funciones históricas](https://github.com/PoldKent/AudioCal-Hear/blob/e5bdc69d8ee537e891dcc79de839c511931c0963/README.es.md).
