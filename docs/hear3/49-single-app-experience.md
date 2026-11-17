# AudioCal Hear · una aplicación pública

Fecha: 17 de noviembre de 2026.

## Decisión de interfaz

El producto abre directamente en la raíz `/` como una aplicación de uso normal, no como una página de vista previa. El usuario tiene un único inicio con navegación consistente: Inicio, Examen, Mi ecualizador, Historial y Ajustes.

No se ofrecen enlaces públicos para escoger entre Hear 2 y Hear 3 ni tarjetas para probar pilotos de ingeniería. Las rutas antiguas de vista previa redirigen a la aplicación. `/hear2/` se retiene únicamente como salida técnica de recuperación — sin enlace en la aplicación — para preservar material histórico y pruebas de rollback.

## Funcionalidad real

- `/`: panel de actividad, reanudación si hay checkpoint verificable, recuento de perfiles y EQ, configuración de tema y caché estática offline voluntaria.
- `/hear3-exam/`: examen de barrido y tonos, selección de 2–31 frecuencias de EQ, interrupción voluntaria, recuperación, cálculo matemático de EQ orientativo y guardado confirmado.
- `/hear3-eq-editor/`: revisar/editar/restaurar/exportar curvas guardadas sin aplicar automáticamente.
- `/hear3-library/`: historial, exportación, importación confirmada y borrado selectivo. Importación de formatos históricos en sección avanzada optativa.
- Privacidad, diagnósticos y restauración de archivos con mismo menú y apariencia.
- La misma preferencia claro/oscuro se aplica a cada sección.
- Offline solo con consentimiento: inicio, estilos, scripts y páginas estáticas; no respuestas auditivas, fotos ni perfiles de usuario.

## Invariantes

1. Nada reproduce audio por navegar; cada sonido exige acción explícita.
2. No cambiar `localStorage` heredado por visitar una pantalla.
3. Nunca prometer SPL, certificación acústica, aplicación de preset o diagnóstico médico.
4. Conservar validación de backups, consentimiento y bloqueo multi-pestaña.
5. `stableReleaseClaim:false` permanece hasta la evidencia D-063; la ausencia de un rótulo técnico de beta en el producto no convierte automáticamente al software en una versión certificada.
6. Revisar automáticamente comportamiento en escritorio 4:3, 21:9, Android Chromium y iPhone WebKit simulado. Pruebas físicas continúan pendientes.

## Compatibilidad y vuelta atrás

El HTML de recuperación interno se sigue generando byte a byte con `npm run build`. Las URL antiguas de vista previa redirigen a `/`. Los datos locales no se borran por navegar; antes de importar, reemplazar o eliminar, el usuario debe respaldar sus archivos. Un despliegue fallido se puede revertir al commit anterior sin migraciones automáticas.

## Evidencia

`tests/hear3-production-routes.test.mjs` verifica que la raíz es una aplicación y no un selector, conserva los motores funcionales de examen y archivo, y comprueba que no hay enlace a la versión anterior. Las pruebas Playwright verifican navegación, recuperación, guardado, EQ, apariencia, caches y persistencia.
