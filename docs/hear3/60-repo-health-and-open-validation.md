# Hear 3 · Depuración transversal del repositorio (18/11/2026)

## Controles nuevos y alcance
`npm run audit:repo` recorre sin modificar archivos ni escribir datos locales los documentos públicos y los módulos de `src/hear3/`. `npm run verify` incorpora el comando tras la integridad de build y pruebas Node.

Detecta:
- divergencia entre `src/hear3-entry.html` y `index.html`;
- rutas relativas y recursos CSS/JS estáticos inexistentes desde las pantallas públicas;
- importaciones ESM relativas que no apuntan a módulos locales;
- etiquetas `data-hear-i18n` ausentes de algún idioma del menú principal;
- archivos offline inexistentes, rutas duplicadas o versión de caché incoherente entre controlador de cliente y service worker;
- uso de `localStorage.clear()` o `sessionStorage.clear()` en el código Hear 3;
- un cambio no justificado de `stableReleaseClaim` a `true`.

La auditoría **no elimina archivos históricos ni presupone que los módulos antiguos no se utilizan**. No descarga recursos, modifica perfiles o archivos, ejecuta sonido, ni certifica compatibilidad acústica, XSS, CSP, WCAG o seguridad física.

## Evolución del producto y estado pendiente

Se preserva un solo acceso público a Hear 3 con recuperación del motor histórico Hear 2. Se aplicaron en PR #91 el refactor visual sin pérdida y en PR #92 la revisión segura de la banda inmediatamente anterior. La herramienta avanzada de sanitización fotográfica se gestiona por separado en PR #93. Estos son **avances comprobables**, no el cierre de los 63 requisitos del issue #30.

**Bloqueos que requieren trabajo adicional o evidencia externa:**
1. D-035 / D-047: atribución verificable por canal, síntesis L/R con hardware real y protocolo perceptivo.
2. D-039 a D-041: validez del modelo de ganancia del EQ con corpus contrastado, SPL y headroom/clipping reales.
3. D-044 / D-045 / D-048: reconocimiento específico por fabricante/modelo; fotografía opcional sin inventar equivalencias.
4. D-021: la revisión selectiva actual solo aplica a la última banda completada sin respuestas posteriores, no una edición arbitraria de historiales.
5. D-026 / D-058: localización total de mensajes técnicos a ocho idiomas y auditoría WCAG asistiva con usuarios/equipos.
6. D-063: trece pruebas físicas y ensayos de seguridad pendientes según `release-evidence-gate.json`.

Las capacidades históricas Hear 1.x que las decisiones de producto excluyen de Hear 3 (como música A/B obligatoria y selector rápido/completo) no se recuperan artificialmente durante la depuración. Mantener `stableReleaseClaim:false` hasta documentación de evidencia física y aprobación de producto.

## Proceso de calidad
Para cada PR: `npm run verify`, contratos, paquete legado 2.0, matriz browser Android/iPhone/escritorio y evaluación de regresiones offline/archivos. El nuevo auditor reduce regresiones de rutas, pero nunca sustituye las pruebas con dispositivos reales.
