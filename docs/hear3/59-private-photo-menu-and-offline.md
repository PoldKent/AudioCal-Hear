# Hear 3 — herramienta de imágenes privadas integrada (18/11/2026)

## Corrección de funcionalidad y navegación
La herramienta preexistente `/hear3-photo-privacy/` permitía recodificar de forma local una imagen del EQ para retirar metadatos de origen, pero estaba presentada como piloto independiente con un enlace al antiguo preview. Esta actualización:

- Mantiene su lógica local y permisos: ninguna imagen se sube ni se guarda automáticamente, la inspección depende del botón, el PNG es nuevo y se revocan las URLs al descartar/navegar.
- Usa el mismo encabezado, tema claro/oscuro e idioma de navegación de Hear 3, sin crear una app paralela ni permitir que se infiera un dispositivo real a partir de píxeles.
- Ofrece acceso desde **Inicio → Ajustes → Datos, privacidad y ayuda → Preparar una imagen privada del ecualizador**; también permite regresar a ajustes o preparación de bandas.
- Añade la página y el módulo estático al manifiesto offline opcional; versión **v8** coherente entre cliente, service worker y prueba de navegador.
- Traduce el nuevo nombre de herramienta en los ocho idiomas de navegación. Los textos técnicos de esta pantalla siguen principalmente en español y se advierte públicamente que la localización total está pendiente.
- Aclara los README: la reproducción musical A/B es histórica de Hear 1.x, no un paso obligatorio de Hear 3.

## QA
- Comprobar `npm run verify`, cuatro navegadores, operación de fotografía local, rechazo de SVG, ausencia de POST, borrado de vista previa y URL temporal, navegación de regreso y apertura offline voluntaria.
- Mantener `stableReleaseClaim:false`: ni recodificar una imagen ni pasar Playwright certifican el equipo, su EQ, el audio físico, el SPL o la privacidad de archivos externos.

## Deuda fuera de alcance
Calibración y perfiles por fabricante/modelo, traducción integral de formularios y soporte, auditoría WCAG asistiva, actualización de una app externa y validación acústica física de D-063. No eliminar el módulo de imagen ni el rollback histórico sin comprobar sus dependencias.
