# Hear 3 · Idiomas de la interfaz principal (18/11/2026)

## Alcance implementado
La aplicación pública existente ofrece un selector de idioma, sin rutas de versiones ni nuevas demos, en Inicio, Examen, Mi ecualizador, Historial, Privacidad, Diagnóstico y Restauración. Idiomas disponibles en la interfaz principal: **español, inglés, francés, portugués, italiano, alemán, chino simplificado y japonés**.

La preferencia explícita `hear3:ui-language:v1` se guarda solo en el navegador y no altera registros auditivos. La primera visita usa el idioma principal del navegador si está entre los ocho disponibles, con español como fallback. El selector conserva su estado entre rutas, sincroniza pestañas cuando hay eventos de almacenamiento y actualiza `html.lang`, usando `zh-Hans` para chino simplificado.

La traducción ya cubre: navegación común, encabezado y acciones de Inicio, pasos de Examen, panel principal de escucha y sus mensajes dinámicos, respuestas de tono, comparación de dos tonos, verificación de salida al reanudar y encabezados principales de EQ e Historial. También se distribuye como recurso estático en el caché voluntario offline v5.

## Límite explícito — NO es una traducción integral
**No se han traducido todavía todos los párrafos de ayuda técnica, formularios de archivo/importación, diagnósticos, avisos avanzados ni mensajes que genera el motor.** Al seleccionar otro idioma aparece una advertencia en cada sección informando que determinados textos técnicos siguen en español. Por ello D-026 no puede pasar todavía a «verificado» en el gate de lanzamiento; ni es correcto declarar Hear 3 íntegramente localizada.

Las traducciones no alteran valores en dBFS, evidencias, frecuencias Hz, IDs o curvas. No existe traducción remota ni acceso a servidores de traducción. Nunca cambia el EQ ni se inicia sonido al elegir un idioma.

## Evidencia de regresión
- `tests/hear3-app-i18n.test.mjs`: todos los idiomas, presencia de cadenas principales, respuestas diferenciadas, autoselección, preferencias explícitas y fallback.
- `tests/browser/hear3-core-localization.spec.cjs`: navegador en inglés en la primera visita, recorrido Inicio → Examen, selección de los ocho idiomas, persistencia entre Examen → EQ → Historial, repintado del botón de audio sin ejecutar sonido y preservación del registro histórico.
- El resto de pruebas existentes del motor usa `es-BO` como idioma explícito de Playwright, preservando las aserciones anteriores en español; el test dedicado valida la autodetección inglesa por separado.
- No se modifica el motor Web Audio ni el catálogo ni la política de EQ provisional.

## Próximo trabajo bloqueante
Completar localización de toda la interfaz, revisar traducciones con hablantes de cada idioma, probar lectores de pantalla/teclado físicos y comprobar audio/volumen/rutas reales bajo D-063. `stableReleaseClaim:false` permanece sin cambios.
