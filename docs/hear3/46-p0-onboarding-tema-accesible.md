# Hear 3.0 — D-017/D-018/D-019/D-025/D-026: beta guiada y apariencia accesible

**Estado:** beta experimental, no aplicación clínica ni publicación estable. No modifica HTML, CSS, scripts, perfiles o flujos de Hear 2.0.

## Apariencia del sistema y selector manual

- La vista previa usa por defecto `prefers-color-scheme` del sistema; ofrece «Según el sistema», «Claro» y «Oscuro» en la cabecera, visible con teclado y pantallas táctiles.
- La elección manual se guarda únicamente en la clave `hear3:ui-theme:v1`; elegir «Según el sistema» elimina la preferencia guardada. La lectura y escritura tienen control de fallo de almacenamiento; no se intenta sincronizar ni compartir datos.
- Cambios de preferencia del sistema reactivan el tema de forma dinámica solo cuando el usuario está en «Según el sistema».
- Variables de alto contraste, superficies claras/oscuras, controles y focos visibles. El contraste WCAG y lectores reales siguen **pendientes de auditoría física/manual**, no se acredita conformidad automáticamente.

## Entrada guiada, sin audio automático

- El botón principal abre el **examen integrado experimental** en vez de enviar a una lista técnica como único punto de partida.
- Tres instrucciones breves aclaran equipo/volumen, control explícito del audio y opción de archivar/revisar un EQ provisional.
- Una lectura local del checkpoint del perfil de piloto `hear3-integrated-pilot` muestra, **si existe copia**, el enlace y la instrucción de pulsar «Recuperar examen guardado». Nunca reanuda audio ni altera sesión sin gesto humano.
- Las herramientas y cinco pilotos técnicos se mantienen disponibles, la versión Hear 2.0 continúa accesible y ninguna carga del inicio mueve controles ni borra datos.

## Pruebas

`tests/browser/hear3-preview-theme-onboarding.spec.cjs`: modo sistema claro/oscuro, cambio dinámico, preferencia persistida y vuelta al sistema, guía, enlaces, cero autoplay y conservación de la clave V2. Todas las matrices Playwright, Node, beta e integridad deben pasar en el SHA exacto para integración.

## Fuera de alcance

No implica audición segura, calibración SPL, garantías de filtrado, dB físicos, UI completa de todos los P0, contraste WCAG AA aprobado, hardware real, ni permiso para cambiar `stableReleaseClaim:false`. Es una mejora de UX aislada dentro de la beta.
