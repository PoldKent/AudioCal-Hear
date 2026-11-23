# AudioCal Hear 3 — Privacidad y datos locales

[English](PRIVACY.md) · **Español** · Revisión: 23 de noviembre de 2026.

## Resumen

Hear 3 es una aplicación web estática de personalización auditiva **experimental** alojada en GitHub Pages. El examen principal no requiere cuenta, inicio de sesión, micrófono ni archivos de música. El código de la aplicación no contiene un servicio propio de analíticas ni una API de subida de perfiles o de respuestas; las solicitudes de alojamiento a GitHub se tratan conforme a las políticas independientes de ese proveedor.

## Qué guarda el navegador y cuándo

- **Continuidad automática de una prueba:** mientras haces el barrido y los tonos, Hear puede conservar un *checkpoint* en el almacenamiento local del navegador (o en almacenamiento de la pestaña si el primero no está disponible). Contiene el dispositivo/tipo de EQ declarado, las frecuencias y niveles digitales de los tonos, las respuestas, el estado de recuperación, el historial de respuestas anuladas y las indicaciones **«Demasiado fuerte»** vinculadas a tonos verificados. Esto permite continuar una prueba sin reproducir audio automáticamente. Esta copia de progreso no necesita que guardes el EQ final.
- **Resultado opcional:** el resultado y los perfiles se agregan al catálogo local únicamente cuando eliges «Guardar resultado» y confirmas la operación. El archivo puede contener historial de pruebas, valores de EQ, anotaciones y cambios posteriores.
- **Preferencias:** el idioma, la apariencia, el tipo de equipo y la distribución de bandas pueden recordarse localmente. Una marca de sonoridad histórica de versiones anteriores puede seguir existiendo en almacenamiento de pestaña hasta borrarse.
- **Fotos y herramientas avanzadas:** las fotografías opcionales del equipo y los diagnósticos técnicos se gestionan localmente de acuerdo con el flujo que hayas elegido. No publiques esos archivos en incidencias abiertas.
- **Modo sin conexión:** solo se solicita instalar recursos estáticos sin conexión si activas esa opción. No es una copia de seguridad de tus respuestas, fotos o historial.

No se cifra automáticamente el contenido del almacenamiento local ni los respaldos descargados. El algoritmo de comprobación de integridad detecta algunos daños accidentales, **no** proporciona autenticación criptográfica ni confidencialidad.

## Exportar, conservar y eliminar

Puedes copiar o descargar el EQ en TXT, CSV o PNG, y exportar datos de respaldo desde las herramientas secundarias. Los archivos descargados quedan fuera del alcance de la aplicación y deben eliminarse por separado.

Puedes descartar una prueba incompleta desde «¿Quieres empezar desde cero?» o gestionar las claves conocidas desde [Privacidad y datos](hear3-privacy/). Esa herramienta muestra un alcance previo y exige confirmación para borrar; no afirma eliminar copias en otros dispositivos, navegadores, archivos descargados o registros de alojamiento. **Cierra otras pestañas de Hear** antes de borrar, para evitar que vuelvan a guardar datos.

Las claves heredadas de Hear 2 se conservan salvo eliminación explícita en una herramienta que las incluya. Si el navegador borra sus datos del sitio, los resultados no respaldados pueden desaparecer. Si compartes un archivo JSON de respaldo o acceso a tu dispositivo, otras personas podrían ver información sensible sobre tus respuestas auditivas.

## Qué NO mide ni envía Hear

Los tonos generados en dBFS **no son mediciones acústicas en dB SPL**. Las respuestas subjetivas y la curva EQ no son resultados clínicos, ni se convierten en un perfil médico. La aplicación no cambia por sí misma el ecualizador de otras aplicaciones ni controla el volumen físico del dispositivo. El micrófono y la música A/B de versiones anteriores no forman parte del examen principal Hear 3.

El alojamiento del sitio en GitHub Pages puede implicar registros de solicitudes, direcciones IP y datos técnicos administrados por GitHub conforme a su [política de privacidad](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). No podemos borrar esos registros desde las opciones de datos locales de Hear.

## Contacto

Para plantear una cuestión de privacidad, solicita un canal privado en [el proyecto de GitHub](https://github.com/PoldKent/AudioCal-Hear). No subas información auditiva personal, fotos, respaldos o datos de contacto sensibles a incidencias públicas.

Cualquier futura incorporación de sincronización remota, cuentas, servicios de terceros o medición acústica necesitará nuevas revisiones de privacidad y seguridad antes de su activación.
