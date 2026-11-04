# Auditoría integral de coherencia — Hear 3.0

> **Actualización de estado (2026-11-04):** el usuario aprobó expresamente el alcance maestro y el plan por etapas para comenzar la implementación. La versión original, redactada antes de la aprobación, se conserva como registro de la auditoría. Esta aprobación **no valida pruebas acústicas ni habilita publicación estable**; D-063 sigue siendo la puerta de salida. Esta rama contiene los primeros contratos de la fase 1 y ninguna modificación de la aplicación oficial.

> **DOCUMENTO DE REVISIÓN ORIGINAL · APROBACIÓN GLOBAL CONCEDIDA EL 04/11/2026**  
> Fuente de verdad: [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). Las 63 decisiones originales permanecen íntegras en GitHub. Este documento las resume para revisión; ante cualquier diferencia, prevalece el texto aprobado del issue. No implica que alguna función haya sido implementada, validada ni publicada.  
> Corte de revisión: 4 de noviembre de 2026.  

## Resumen ejecutivo

El cuestionario de Hear 3.0 incluye las decisiones **D-001 a D-063, todas registradas**. Están completos los bloques 4, 5, 6 y 7 (48/48), pero **el alcance global aún no está aprobado**. Las 63 decisiones no equivalen a 63 funcionalidades implementadas ni a un porcentaje de desarrollo. Se identificaron **53 decisiones con P0 individual**, **2 P2** (D-011, D-013), **1 P3** (D-012), **6 decisiones con P0 global de bloque pero prioridad individual no definida** (D-002–D-007) y **1 prioridad sin asignar** (D-001). No deben deducirse prioridades individuales de las seis decisiones globales.

**Invariantes no negociables:** D-006=A revisada; D-047=A/C un solo EQ cuyo método conjunto aún debe validarse; D-049=B/C solo copia/TXT/CSV/PNG; D-052=A/C únicamente EQ gráfico automático, con orientación manual para PEQ; D-054–D-063 conservan prioridades individuales P0. El usuario no ha autorizado cambiar código ni interfaz oficial.

## Método y perímetro

- Se contrastó la integridad D-001–D-063 del issue #30, los siete bloques, las prioridades y las subopciones con especial atención a las modificaciones posteriores y a las restricciones de publicación.
- Como referencia de **estado previo** (no como especificación V3) se consultaron README.md, docs/HEAR-V2-PRODUCT-DECISIONS.md, docs/HEAR-V2-ROADMAP.md y package.json del branch main. El paquete existente declara versión 1.11.0 y scripts npm (`build`, `verify`, `test:browser`); la documentación pública identifica un preview de Hear 2.0. **No se ejecutaron pruebas ni inspeccionó exhaustivamente el código fuente; tampoco se hizo auditoría de seguridad de implementación.**
- Estados empleados: **Conciliado** = las decisiones se pueden implementar conjuntamente sin alterar lo aprobado; **Abierto técnico** = algoritmo/umbral/prueba por definir; **Abierto para aprobación** = falta autorización para resolver una prioridad; **Obsoleto** = texto antiguo de documentación, no una decisión nueva.

## Hallazgos y resolución propuesta

| ID | Punto | Evidencia y riesgo | Estado | Resolución sin cambiar decisiones |
|---|---|---|---|---|
| G-01 | Prioridades no cerradas | D-001 sin prioridad; D-002–007 comparten P0 global sin prioridad individual. | **Abierto para aprobación** | Pedir asignación individual sólo si resulta necesaria para backlog; no adjudicar P0 individual sin aprobación. |
| G-02 | Verificación selectiva frente a segunda pasada | D-013 P2 puede confundirse con D-033–034 P0 y D-004. | **Conciliado por interpretación** | P0: verificación mínima contextual dentro de un examen; P2: pasada adicional estructurada opcional; contradicciones siempre solicitan confirmación. |
| G-03 | Sin sonoridad manual frente a comparación de dos tonos | D-009 elimina actividad separada; D-036=B/C prevé dos tonos consecutivos cuando el algoritmo necesite comparar. | **Conciliado** | Integrar dos tonos y una única respuesta contextual en el test, sin prueba musical ni paso manual externo. |
| G-04 | Cálculo único desde umbrales de oído | D-035 separa L/R cuando es verificable; D-047 exige EQ único ponderado y validado. | **Abierto técnico P0** | Definir método de combinación y datos sintéticos/límites; no suponer promedio simple ni que ya está validado. |
| G-05 | Seguridad digital frente a seguridad acústica | D-006 y D-037 autorizan incrementos digitales controlados; no existe calibración SPL real. | **Abierto técnico P0 / bloqueo** | Probar topes digitales, arranques conservadores, picos, rampas, exposición y avisos; no prometer seguridad acústica sólo por dBFS. |
| G-06 | Correcciones perceptibles vs magnitudes no elegidas | D-039=A favorece correcciones experimentales perceptibles; D-040 exige investigar límites y clipping. | **Abierto técnico P0** | Comparar algoritmos y límites; definir presupuesto de ganancia/headroom y fallbacks neutros antes de fijar dB máximos. |
| G-07 | Estimaciones vs evidencia ausente | D-041 permite estimar con evidencia o permanecer neutral; el test no puede fabricar umbrales. | **Conciliado con criterios por especificar** | Trazar origen por banda: medición, estimación etiquetada o neutra; pruebas con contradicciones y ausencia de datos. |
| G-08 | Ampliación de equipo vs formatos aprobados | D-048 permitiría integración directa cuando exista API autorizada; D-049 solo admite exportaciones universales. | **Conciliado** | P0: guías y formatos universales; la integración directa es condicional a API y validación real, nunca una promesa transversal. |
| G-09 | EQ gráfico vs parametría | D-052=A excluye generador PEQ aunque subopción C mencione optimizar filtros compatibles. | **Conciliado** | Calcular sólo controles gráficos y otras capacidades documentadas en alcance; para PEQ guía manual; no inventar Q ni tipo. |
| G-10 | Reconocimiento fotográfico vs privacidad/offline | D-044 pide reconocimiento fotográfico P0; D-059 exige descarte por defecto y consentimiento para remoto; D-060 busca offline compatible. | **Abierto técnico P0** | Investigar reconocimiento local realista y alternativa manual; si remoto, consentimiento previo explícito; borrar foto no autorizada. |
| G-11 | Perfil no verificado vs publicación estable | D-053 permite configurar equipos no verificados; D-063 exige P0 verificados antes de estable. | **Conciliado** | El soporte de configuración no equivale a certificación de hardware; publicar alcance de compatibilidad concreto y advertir modelo no validado. |
| G-12 | Fallo de almacenamiento vs reanudación | D-054 y D-060 exigen autoguardado, pero D-060 permite sesión temporal si no hay persistencia. | **Conciliado** | Reanudación garantizable solo para datos confirmados como guardados; sesiones temporales con advertencia y exportación inmediata. |
| G-13 | Señales visuales frente a sesgos | D-021/058 muestran frecuencia, nivel digital, progreso, pero no deben sugerir que se oyó el tono. | **Conciliado** | Asegurar accesibilidad de estados técnicos sin visualización que aporte pistas sobre percepción auditiva. |
| G-14 | Fuentes de documentación V2 heredada | README y docs/HEAR-V2-ROADMAP.md y docs/HEAR-V2-PRODUCT-DECISIONS.md hablan del motor tone-relative-v3-experimental con ±3 dB/±2 extremos y 4/5/7/10 bandas. | **Obsoleto para V3; conservar historia** | No tomar algoritmos, topes ni conjuntos V2 como requisitos cerrados de V3; reemplazar enlaces/guías tras la aprobación y las pruebas, conservando el historial. |
| G-15 | Residuos de planificación dentro del issue | Tras bloque 7 completo permanece «Plan de consulta individual P0–P3» de D-042–053 y «D-028 a D-041 ... prioridad ... por decidir». | **Texto obsoleto, no decisiones** | Marcar como histórico o depurar en PR/documentación tras aprobación; no borrar ni reescribir decisiones D-001–063. |
| G-16 | Distinción aprobación, desarrollo y validación | D-063 exige todos P0 verificados, pero las decisiones en el issue siguen en fase de requisitos. | **Bloqueo de publicación estable** | Matriz requisito→implementación→prueba→evidencia; ningún P0 se da por desarrollado o validado solo por estar aprobado. |

## Puertas de aprobación previas a código

1. **Puerta de alcance (humana):** aprobar explícitamente el documento maestro y el plan, decidir la prioridad de D-001 y si D-002–D-007 requieren desglose individual; aceptar la separación P0/P2 de D-013.
2. **Puerta de arquitectura y seguridad:** adoptar estados de audio, límites digitales y condiciones de fallo seguro, contratos de persistencia y perfiles, alcance por dispositivos y matriz de capacidades web. Sin esto no aprobar una implementación general del motor.
3. **Puerta científica/algorítmica:** protocolo reproducible para barrido, tono discreto, clasificación de incertidumbre, EQ conjunto y ganancias/headroom. **No hay resultados ya validados**.
4. **Puerta de lanzamiento:** implementar y verificar **todos** los P0; pasar pruebas críticas, documentar limitaciones y preparar reversión. Un resultado «experimental» no es una medición acústica calibrada.

## Referencias no vigentes como norma de Hear 3.0

- Bloque 7, texto residual «Plan de consulta individual P0–P3» para D-042–D-053: esas decisiones están completas y no deben reabrirse por aparecer allí.
- Bloque 7, frase residual «D-028 a D-041 ... Prioridad individual P0–P3 por decidir»: D-028–D-041 están **14/14 P0**.
- docs/HEAR-V2-PRODUCT-DECISIONS.md y docs/HEAR-V2-ROADMAP.md: contienen especificaciones de versión anterior, incluidos `tone-relative-v3-experimental`, topes ±3/±2 dB, conjuntos más pequeños de bandas y contrato de evaluación de la generación previa. Se deben mantener como historial, no copiar sus números a V3 sin investigación D-039/D-040.
- README.md: describe aplicación pública previa y notas históricas de música A/B; no confundir el apartado histórico con la propuesta vigente D-010. Cuando se apruebe y desarrolle V3, actualizar su portada y enlaces mediante cambios independientes.

## Resultado de la auditoría

**Las 63 decisiones se han localizado. No se encontró una contradicción lógica que obligue a cambiar una respuesta previamente aprobada**, pero sí restricciones de alcance que precisan una matriz de aceptación y varios bloqueos técnicos. Las decisiones D-039, D-040, D-047, D-037, D-044 y D-063 dependen de validaciones que todavía no pueden darse por superadas. D-001 carece de prioridad y D-002–D-007 solo tienen prioridad global.

**Estado actualizado:** auditoría y alcance aprobados globalmente el 04/11/2026. El inicio técnico por etapas fue autorizado; la auditoría conserva las decisiones originales sin alterarlas.