# AudioCal Hear

[English](README.md) · **Español**

### Escucha. Ajusta. Disfruta.

**AudioCal Hear** es un asistente web gratuito, adaptable a celulares, para personalizar tu experiencia de audio. Permite explorar umbrales auditivos percibidos, comparar preferencias musicales y obtener **ajustes sugeridos de ecualización** para auriculares, parlantes y sistemas de sonido de automóviles, sin crear una cuenta ni instalar aplicaciones para abrir la página.

**[Abrir AudioCal Hear](https://poldkent.github.io/AudioCal-Hear/)** · [Historial de cambios](CHANGELOG.es.md) · [Notas de lanzamiento](RELEASE_NOTES.md)

> **Versión preliminar pública · v1.6 · octubre de 2026.** La aplicación está disponible para probarla; no está validada como examen médico de audición ni calibración acústica objetiva.

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

## Tecnología y documentación

El proyecto está desarrollado en un único archivo **HTML + CSS + JavaScript**, mediante Web Audio API y sin dependencias de ejecución. Se publica como sitio estático en GitHub Pages; también es posible guardar el archivo HTML y abrirlo sin Internet, según el navegador. No es un audiómetro ni mide niveles de presión sonora.

- [Documentación en inglés](README.md)
- [Notas de lanzamiento · English / Español](RELEASE_NOTES.md)
- [Auditoría · Español](AUDIT.es.md) / [English](AUDIT.md)
- [Historial de versiones · Español](CHANGELOG.es.md) / [English](CHANGELOG.md)

**Repositorio:** https://github.com/PoldKent/AudioCal-Hear
