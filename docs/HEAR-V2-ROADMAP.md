# AudioCal Hear 2.0 — ruta principal y decisiones actuales

**Actualización:** 2026-11-03. El objetivo del producto es **responder a tonos y obtener un ecualizador utilizable**, sin pruebas externas repetitivas ni comparar música A/B. [Contrato aprobado](./HEAR-V2-PRODUCT-DECISIONS.md).

## Camino principal

1. Elegir dispositivo y las bandas reales de su EQ (4, 5, 7, 10 o personalizadas).
2. Con volumen físico bajo y constante, realizar el test adaptativo de **tonos por frecuencia** y registrar niveles digitales escuchados.
3. Calcular un único EQ directamente de las diferencias relativas entre los umbrales escuchados en este examen. No bloquear la propuesta por ANC, ventana, sala o un segundo test. Ganancia automática limitada a ±3 dB, ±2 dB en bandas extremas, y 0 dB si falta evidencia o hay discrepancia entre oídos.
4. Mostrar ganancias concretas, editar, copiar, exportar PNG/TXT y transferir manualmente a un equipo según su escala de controles realmente conocida. No crear una curva alternativa ni transformar dBFS en dB SPL.
5. Guardar perfiles y exportar/importar respaldos. Conservar datos históricos de A/B solo por compatibilidad, sin que modifiquen el EQ actual.

## No forma parte del recorrido

- Cargar canciones, escuchar A frente a B, completar pruebas de sonoridad relativa adicionales ni responder cuestionarios de música.
- Completar mediciones acústicas, Bluetooth o validaciones con equipos reales como obligación del usuario.
- Repetir el examen entero solo porque el algoritmo anterior devolvía 0 dB.

## Verificación automatizada

La prueba de código controla límites, preservación de mediciones, personalización manual y generación desde perfiles sintéticos; Playwright revisa la UI en navegadores de móvil y escritorio. Un EQ completamente neutro puede ser coherente para datos efectivamente uniformes, pero las barreras artificiales de cobertura y contexto ya no impiden un resultado cuando existen contrastes entre tonos.

## Límites y pendientes técnicos internos

- Los umbrales en dBFS representan detección en una cadena concreta y no permiten diagnosticar pérdida auditiva ni calibrar SPL.
- Sin conocer la unidad o la equivalencia real del control físico, mostrar ajustes sugeridos **en dB de EQ**, no posiciones inventadas.
- Seguir investigando seguridad, accesibilidad y compatibilidad mediante automatización y trabajo técnico propio, sin volver a pedir al usuario pruebas ya repetidas.
- El [issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26) es seguimiento **interno**, no una condición para que el usuario reciba su EQ. El protocolo de [medición física](./HEAR-V2-ACOUSTIC-MEASUREMENT-PROTOCOL.md) queda como investigación separada.

La PR [#29](https://github.com/PoldKent/AudioCal-Hear/pull/29) ya consolidó el trabajo anterior en `main`; no reintroducir ramas históricas ni el flujo de música A/B.
