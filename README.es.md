# AudioCal Hear

[English](README.md) · **Español**

### Escucha. Ajusta. Disfruta.

**AudioCal Hear** es un asistente web gratuito, adaptable a celulares, para personalizar tu experiencia de audio. Permite explorar umbrales auditivos percibidos, comparar preferencias musicales y obtener **ajustes sugeridos de ecualización** para auriculares, parlantes y sistemas de sonido de automóviles, sin crear una cuenta ni instalar aplicaciones para abrir la página.

**[Abrir AudioCal Hear](https://poldkent.github.io/AudioCal-Hear/)** · [Pre-release v1.8.2](https://github.com/PoldKent/AudioCal-Hear/releases/tag/v1.8.2) · [Auditoría](AUDIT.es.md) · [Notas de mantenimiento](RELEASE_NOTES_v1.8.1.md) · [Historial de cambios](CHANGELOG.es.md) · [Notas de lanzamiento](RELEASE_NOTES.md)

> **Versión preliminar pública · v1.8.2 · octubre de 2026.** La aplicación está disponible para probarla; no está validada como examen médico de audición ni calibración acústica objetiva.

## Mejoras de estabilidad — v1.8.1

Validación de respaldos (límite de 2 MB), diferenciación entre bandas estimadas y realmente medidas, mayor margen digital considerando los filtros en conjunto, corrección de reproducción al cambiar de pantalla y eliminación de código sin uso. Se mantienen los ocho idiomas, perfiles y ecualizadores. Consulta la [auditoría](AUDIT.es.md) y [notas de v1.8.1](RELEASE_NOTES_v1.8.1.md). La comprobación con hardware real sigue pendiente.

## Novedades de AudioCal Hear v1.8

- Rango digital ampliado a **−24…−84 dBFS**, comenzando por defecto en **−36 dBFS**; límites configurables y advertencias antes de niveles más altos. **dBFS no equivale al volumen acústico en el oído**.
- Respuestas explícitas **«Sí lo escucho» / «Ya no lo escucho»**, búsqueda de 12 dB, ajuste de 1 dB y confirmaciones. Si alcanzas el mínimo existe **«Lo seguía escuchando»**, sin reducción automática del EQ.
- Preparación guiada y comprobación opcional de ruido relativo con micrófono, sin afirmar valores dB SPL absolutos.
- Prueba rápida de frecuencias representativas o completa de todas las bandas. Para auriculares, ambos oídos por separado son la opción predeterminada y se muestra una gráfica comparativa.
- Máximo de **60 segundos de tonos por frecuencia en la primera búsqueda**; no incluye tiempo para responder. Se mantienen los perfiles, ecualizadores personalizados y ocho idiomas.

[Notas completas de la v1.8](RELEASE_NOTES_v1.8.md). La validación con hardware Bluetooth real sigue pendiente.

## Actualización responsive — v1.6.1

- **Celulares estrechos (9:21):** el distintivo «Sin instalar» aparece en una segunda línea alineada a la izquierda, sin salir del encuadre ni desaparecer.
- **Escritorios 4:3 a 21:9:** anchura adaptable, Configuración en dos columnas cuando hay espacio y Ajustes con ecualizador y reproductor musical en columnas independientes. Los formatos 4:3 más compactos conservan una lectura cómoda.
- Se mantienen los ocho idiomas, los perfiles locales y el motor actual de calibración/ecualización.
- Comprobaciones realizadas en Chromium simulado a 360 × 840, 393 × 917, 430 × 960, 1024 × 768, 1280 × 960, 1920 × 1080 y 2560 × 1080, además de ocho variantes de idioma del distintivo.

## Novedad v1.7.0 — equilibrio tonal inteligente

**Seguir escuchando el pitido hasta el último nivel no significa que debamos reducir esa frecuencia.** La prueba ahora registra cuándo el sonido seguía audible y cuándo el resultado fue incierto. Son mediciones **sin umbral confirmado**, no evidencia de volumen excesivo.

En **Ajustes → Equilibrio tonal inteligente**, selecciona y reproduce tu propia música. Para cada frecuencia sugerida, compara **A y B dos veces** sin cambiar el volumen del teléfono. La segunda prueba invierte el orden y utiliza una diferencia menor. También puedes elegir cualquier banda aunque no tenga umbral medido.

- Dos preferencias coherentes: **±2 dB**; una sola preferencia y una respuesta neutral: **±1 dB**.
- Respuestas contradictorias o iguales: **no se modifica** la banda.
- Para llegar a un recorte de hasta **−6 dB** se necesitan varias sesiones de comprobación; los aumentos por esta función se limitan a **+3 dB**.
- Umbrales, preferencias musicales y ajustes de equilibrio se guardan por separado en cada perfil, manteniendo la compatibilidad de los perfiles anteriores.

El reproductor conserva un nivel general de salida fijo y margen contra saturación entre A y B, pero **no garantiza una sonoridad percibida idéntica**. Es una herramienta subjetiva de comodidad y equilibrio, no una audiometría clínica ni una medición objetiva. Nunca aumentes el volumen para perseguir tonos inaudibles.

**Mejora del umbral auditivo v1.8.2:** una respuesta contradictoria activa comprobaciones adicionales en niveles vecinos; ya no descarta de inmediato toda la frecuencia. Si no se confirma el límite, puedes repetir solo esa frecuencia, sin inventar ganancias de EQ. [Notas bilingües](RELEASE_NOTES_v1.8.2.md).

## Funciones principales

- **Prueba auditiva guiada:** sonidos descendentes que se mantienen 3 segundos en cada nivel digital; búsqueda inicial rápida y luego pasos de 1 dB cerca del umbral.
- **Personalización musical:** comparación A/B de graves, voces y agudos, con ajustes individuales editables.
- **Ecualizadores compatibles:** modelo de automóvil de 7 bandas (64, 160, 400, 1.000, 2.500, 6.250, 15.625 Hz), auriculares de 10 bandas (30, 60, 120, 250, 500, 1k, 2k, 4k, 8k, 16k Hz), otros formatos de 5/7/10/15/31 bandas y frecuencias personalizadas.
- **Perfiles independientes:** ajustes guardados por equipo y opción de exportar/importar copias de respaldo.
- **Ocho idiomas:** español, inglés, francés, portugués, italiano, alemán, chino simplificado y japonés.
- **Compatible con celular:** reproduce audio por la salida configurada en el teléfono, incluidos dispositivos Bluetooth compatibles.

La prueba adaptativa utiliza como máximo **42 segundos de reproducción automática** en la primera pasada por frecuencia y oído, y hasta **15 segundos adicionales** en la verificación opcional. Las pausas y repeticiones manuales no están incluidas. Un umbral puede quedar *sin determinar* y no se sustituyen los resultados ausentes por mediciones inventadas.

## Cómo utilizarla

1. Abre **https://poldkent.github.io/AudioCal-Hear/** desde tu celular con un navegador moderno.
2. Conecta los auriculares, parlantes o el automóvil desde la configuración Bluetooth/audio del teléfono. Para probar el automóvil, permanece **estacionado**.
3. Selecciona equipo, ecualizador y modo. Utiliza un **volumen bajo, cómodo y fijo**, en un ambiente silencioso.
4. Marca cuándo dejas de escuchar cada tono. Nunca aumentes el volumen para perseguir un sonido que no escuchas.
5. Compara con tu música, revisa las recomendaciones y copia **manualmente** los valores al ecualizador de tu dispositivo.

La app no detecta todos los modelos Bluetooth, no controla el ecualizador global del teléfono ni modifica automáticamente equipos externos. Sus recomendaciones pueden no producir una mejoría perceptible o preferible en todos los dispositivos.

## Seguridad auditiva y límites de precisión

**Nunca realices la prueba con volumen máximo.** Detén la reproducción si aparece incomodidad, dolor o zumbidos. Mantén sesiones breves y un volumen seguro: la exposición excesiva puede dañar la audición. Los valores **dBFS** son niveles digitales y **no** son decibelios acústicos medidos en el oído.

**AudioCal Hear no es una prueba médica de audición, un audífono terapéutico ni un sustituto de un profesional de audiología.** Los umbrales y curvas son aproximados y dependen del oído, dispositivo, ajuste físico, ruido ambiental y volumen. Consulta a un profesional si tienes preocupaciones auditivas.

## Privacidad

La aplicación actual es una página estática **sin cuentas de AudioCal Hear, sin analíticas propias y sin servidor de perfiles controlado por la app**. Tus perfiles y preferencias se guardan en el almacenamiento local del navegador. La música elegida se procesa en el propio navegador. Puedes exportar respaldos; otras personas con acceso a tu dispositivo, navegador o archivos exportados podrían consultarlos. GitHub, como proveedor de alojamiento, puede tratar datos técnicos de acceso conforme a sus propias políticas.

[Política de privacidad](PRIVACY.es.md) · [Privacy notice](PRIVACY.md).

## Derechos de autor y condiciones legales

**© 2026 PoldKent — Todos los derechos reservados, en la medida legalmente aplicable a los derechos que le correspondan.**

**Que la aplicación sea gratuita y el repositorio público no significa que el código sea de licencia abierta.** Se publica el repositorio para transparencia, evaluación y consulta; **no se concede una licencia general para copiar, modificar, redistribuir, alojar o explotar comercialmente su código, diseño o identidad visual**. Se permite utilizar la aplicación alojada oficialmente con fines personales y no comerciales, según las condiciones publicadas y la legislación aplicable.

Las condiciones de GitHub permiten, de manera independiente, ver y hacer *fork* de repositorios públicos dentro de su servicio. Ningún aviso de este repositorio elimina esos derechos ni impide físicamente que alguien copie el HTML público. Se respetan las excepciones legales obligatorias y los derechos de terceros.

AudioCal Hear es un proyecto independiente, **sin afiliación, patrocinio ni respaldo de Soundcore, Anker ni de fabricantes de audio**. Las marcas de terceros utilizadas para identificar equipos pertenecen a sus respectivos titulares. No se afirma que el nombre **AudioCal Hear** sea una marca registrada.

[Aviso de derechos reservados](LICENSE.md) · [Condiciones de uso](TERMS.es.md) · [Terms in English](TERMS.md) · [Política de contribuciones](CONTRIBUTING.es.md).

**Última auditoría técnica:** [Informe de depuración y optimización (30/10/2026)](AUDIT_2026-10-30.md). Se distinguen las correcciones aplicadas de las pruebas con hardware aún pendientes.

## Código modular y pruebas automáticas

Las fuentes editables están organizadas en [`src/`](src/): plantilla HTML, CSS, traducciones y seis módulos JavaScript de desarrollo. Un compilador sin dependencias externas genera **exactamente el mismo `index.html` independiente**, conservando su uso por GitHub Pages o directamente desde el celular.

Para modificarlo: `npm run build` y después `npm run verify` (Node.js 20+, sin necesidad de `npm install`). [Matriz de pruebas Android, iPhone y escritorio](BROWSER_QA.md) · [Resultados automáticos](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/browser-ui.yml) · [Guía de desarrollo bilingüe](DEV_GUIDE.md) · [Informe de refactorización y pruebas](AUDIT_2026-10-31.md) · [Verificación automática en GitHub](https://github.com/PoldKent/AudioCal-Hear/actions/workflows/source-tests.yml).

## Tecnología y documentación

El proyecto está desarrollado en un único archivo **HTML + CSS + JavaScript**, mediante Web Audio API y sin dependencias de ejecución. Se publica como sitio estático en GitHub Pages; también es posible guardar el archivo HTML y abrirlo sin Internet, según el navegador. No es un audiómetro ni mide niveles de presión sonora.

- [Documentación en inglés](README.md)
- [Notas de lanzamiento · English / Español](RELEASE_NOTES.md)
- [Auditoría · Español](AUDIT.es.md) / [English](AUDIT.md)
- [Historial de versiones · Español](CHANGELOG.es.md) / [English](CHANGELOG.md)

**Repositorio:** https://github.com/PoldKent/AudioCal-Hear
