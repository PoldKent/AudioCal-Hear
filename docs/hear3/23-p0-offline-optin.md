# Hear 3.0 — D-060 P0: recursos estáticos optativos para uso offline

**Fecha:** 05/11/2026. **Estado:** piloto de resiliencia, no funcionamiento offline universal ni release estable. Decisiones D-051, D-054, D-057, D-059, D-060, D-062 y D-063 del [issue maestro #30](https://github.com/PoldKent/AudioCal-Hear/issues/30).

## Incremento implementado

- `hear3-offline-manifest.json` define una lista **exacta** de recursos públicos y estáticos: páginas de la vista previa y privacidad, cinco pilotos y módulos JavaScript V3 necesarios. No hay perfiles, resultados, fotografías, voces, solicitudes personales, backend ni claves de almacenamiento en esta lista.
- `hear3-offline-sw.js` es un service worker **optativo**. Una vez instalado, conserva una caché de recursos conocidos y solo intercepta lecturas GET de rutas exactas permitidas; el resto de la aplicación, incluido Hear 2.0, no se cachea ni se intercepta por su manejador específico. Las respuestas nuevas se prefieren cuando hay conexión y actualizan la caché; ante un fallo real de red se intenta la copia íntegra.
- `src/hear3/offline-optin.mjs` comprueba que el origen sea seguro, que el navegador exponga Service Workers/Cache Storage, valida el manifiesto y solo informa «recursos verificados» tras comprobar todos los archivos almacenados. Las instalaciones parciales, bloqueadas o no verificadas **no** deben anunciarse como exitosas.
- La página `hear3-preview/` ofrece controles explícitos para guardar los pilotos **solo tras un click**, y para retirar el trabajador y las cachés de Hear 3.0. La desinstalación verifica el nombre exacto del worker antes de darlo de baja y solo elimina caches con prefijo `audiocal-hear3-prototype-static-`; conserva las de otras aplicaciones.
- El modo offline no solicita sonido ni activa tests durante registro/recuperación. Las sesiones del examen continúan usando su almacenamiento local separado, con sus propios controles de durabilidad; cachear código no equivale a guardar datos personales ni a aprobar su uso clínico.

## Pruebas y aceptación técnica

- Node: integridad y existencia del manifiesto; rechazo de rutas fuera del piloto, duplicados, recorrido de directorios, límites; capacidades disponibles; cache verificada; fallback sin declaraciones falsas; aislamiento de datos ajenos.
- Playwright: visita a la vista previa sin registro ni sonido; instalación tras click, verificación de todos los recursos, navegación sin red por la vista previa, el piloto integrado y privacidad; retirada de la caché V3 sin borrar perfiles V2 ni caches de otras aplicaciones.
- Las pruebas de navegador se ejecutan por matriz Android Chromium 9×21, iPhone WebKit, desktop 4:3 y 21:9. La compatibilidad depende de las APIs expuestas y, si falta una API esencial, el control no debe prometer offline. Los emuladores no reemplazan ensayos físicos de almacenamiento/cuota y Bluetooth.
- La ruta GitHub Pages vive debajo del prefijo del repositorio; localhost usa `/`. Las URL se construyen relativas al alcance efectivo, sin hardcodear una raíz incorrecta para Pages.

## Limitaciones y trabajo P0 abierto

- Aunque el bundle haya sido guardado, **la caché puede ser desalojada sin aviso** por el navegador y un origen puede sufrir cuotas, revocación o cambios de capacidades. No garantizamos persistencia del offline, instalación universal ni la misma política en Safari/iOS. Se necesitan pruebas en dispositivos físicos y con cachés deterioradas.
- Una nueva versión del sitio puede llegar cuando vuelve la red; la estrategia es network-first para los recursos exactos y la actualización del worker/manifiesto debe verificarse en las siguientes versiones. No se garantiza un cambio de versión atómico de todos los recursos mientras hay pestañas abiertas.
- El service worker necesita alcance del proyecto para atender a los pilotos ubicados en directorios hermanos, pero **no modifica** la lógica de peticiones de Hear 2.0. El control de borrado de claves de privacidad D-059 es distinto de la retirada de esta caché estática; ninguno borra respaldos ya descargados ni datos de otros orígenes.
- No se cachean fuentes externas ni música. La API Web Audio debe seguir siendo compatible y autorizada al momento de reproducir; la disponibilidad offline de la página no acredita SPL ni separación de canales. D-057 y D-063 requieren pruebas reales.
- Este incremento ayuda a D-060, **no la cierra**: quedan pendientes conectividad inestable durante audio, actualización/rollback seguro, pruebas de cuota, offline con almacenamiento restringido y recuperación transaccional entre pestañas, hardware y accesibilidad.

## Rollback

Desregistrar el worker de Hear 3.0 y eliminar solo sus cachés estáticas con el control «Retirar recursos offline»; revertir el PR elimina el nuevo código pero **no siempre desinstala un worker persistente** en navegadores de usuarios. Conservar por ello durante cualquier rollback un procedimiento explícito y probado de retirada/renovación, sin borrar datos personales ni caches ajenas. No publicar Hear 3.0 estable antes de D-063=C.
