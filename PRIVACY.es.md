# AudioCal Hear — Política de privacidad

[English](PRIVACY.md) · **Español** · Aplicable a la versión preliminar v1.6 revisada el 30 de octubre de 2026.

## Resumen

AudioCal Hear es actualmente una aplicación **estática que funciona en el navegador**. Su código no incluye cuentas propias, analíticas de AudioCal Hear, píxeles de seguimiento, solicitudes de red para enviar perfiles ni bases de datos remotas controladas por el proyecto. Esta descripción se refiere al **código actual**, no a posibles versiones futuras ni al funcionamiento independiente del alojamiento de GitHub.

## Comprobación opcional del micrófono (v1.8)

Solo si pulsas expresamente **Comprobar ruido relativo**, el navegador solicita permiso para el micrófono y analiza brevemente la señal de audio **en memoria** para generar una indicación relativa. La aplicación no guarda grabaciones, no envía muestras a servidores ni afirma medir dB SPL acústicos calibrados. El micrófono se detiene al terminar. Puedes omitirlo y continuar. Los permisos del sistema operativo y del navegador no dependen de AudioCal Hear.

## Qué se guarda en tu dispositivo

- Nombres de equipos y perfiles, frecuencias del ecualizador, respuestas del examen, ajustes de EQ y preferencias musicales en el **localStorage** del navegador.
- El idioma elegido también se recuerda en el almacenamiento local.
- Los archivos de audio que selecciones para comparar A/B se reproducen y procesan **en el navegador**. La versión actual no los envía a un servidor administrado por AudioCal Hear.
- Puedes descargar un **respaldo JSON** que incluye datos del perfil. Debes protegerlo: la exportación no cifra el archivo.

La información sobre tu sensibilidad auditiva puede ser personal o sensible. **Cualquier persona con acceso a tu teléfono, navegador o respaldo exportado podría acceder a esos datos.** El borrado de datos del navegador, las ventanas privadas y el cambio de dispositivo pueden eliminar o separar los perfiles. Para borrar los perfiles locales puedes utilizar las opciones disponibles de borrado/reinicio en la app o eliminar los datos del sitio desde el navegador. Debes borrar los archivos exportados por separado.

## Qué datos puede tratar GitHub Pages

El sitio oficial está alojado en **GitHub Pages**. GitHub puede procesar información técnica de alojamiento y seguridad (por ejemplo, solicitudes, direcciones IP y características del navegador) de acuerdo con sus propias políticas: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.

AudioCal Hear no controla el tratamiento independiente de GitHub, la sincronización de tu navegador ni los datos que compartas por tu cuenta en incidencias públicas, mensajes o servicios de terceros.

## Sin recopilación clínica oculta

La app **no realiza exámenes médicos auditivos** ni ofrece interpretaciones clínicas. Los resultados locales son estimaciones generadas por el usuario sobre escucha y preferencias, no una historia clínica.

## Contacto y actualizaciones

Para consultas sobre privacidad solicita un canal privado mediante https://github.com/PoldKent/AudioCal-Hear. No publiques resultados auditivos, respaldos JSON, datos de contacto privados ni otra información sensible en las incidencias públicas.

Si futuras versiones incorporan cuentas, analíticas, almacenamiento remoto u otros proveedores, esta política deberá actualizarse e informarse a los usuarios antes de utilizar esas funciones.
