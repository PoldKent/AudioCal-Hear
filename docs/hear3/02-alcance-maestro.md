# Documento maestro de alcance global — Hear 3.0

> **Actualización de estado (2026-11-04):** el usuario aprobó expresamente el alcance maestro y el plan por etapas para comenzar la implementación. La versión original, redactada antes de la aprobación, se conserva como registro de la auditoría. Esta aprobación **no valida pruebas acústicas ni habilita publicación estable**; D-063 sigue siendo la puerta de salida. Esta rama contiene los primeros contratos de la fase 1 y ninguna modificación de la aplicación oficial.

> **DOCUMENTO DE REVISIÓN ORIGINAL · APROBACIÓN GLOBAL CONCEDIDA EL 04/11/2026**  
> Fuente de verdad: [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30). Las 63 decisiones originales permanecen íntegras en GitHub. Este documento las resume para revisión; ante cualquier diferencia, prevalece el texto aprobado del issue. No implica que alguna función haya sido implementada, validada ni publicada.  
> Corte de revisión: 4 de noviembre de 2026.  

## Resumen ejecutivo

El cuestionario de Hear 3.0 incluye las decisiones **D-001 a D-063, todas registradas**. Están completos los bloques 4, 5, 6 y 7 (48/48), pero **el alcance global aún no está aprobado**. Las 63 decisiones no equivalen a 63 funcionalidades implementadas ni a un porcentaje de desarrollo. Se identificaron **53 decisiones con P0 individual**, **2 P2** (D-011, D-013), **1 P3** (D-012), **6 decisiones con P0 global de bloque pero prioridad individual no definida** (D-002–D-007) y **1 prioridad sin asignar** (D-001). No deben deducirse prioridades individuales de las seis decisiones globales.

**Invariantes no negociables:** D-006=A revisada; D-047=A/C un solo EQ cuyo método conjunto aún debe validarse; D-049=B/C solo copia/TXT/CSV/PNG; D-052=A/C únicamente EQ gráfico automático, con orientación manual para PEQ; D-054–D-063 conservan prioridades individuales P0. El usuario no ha autorizado cambiar código ni interfaz oficial.

## 1. Propósito y límites del producto

Hear 3.0 será un asistente web accesible de personalización auditiva basada en **tonos**, con un examen adaptativo y un **único ecualizador gráfico conjunto** utilizable según las bandas reales del equipo. Es un producto de orientación perceptiva **experimental**, no una audiometría clínica ni un instrumento de medición SPL. No debe asegurar que la corrección representa la respuesta acústica de unos auriculares o que es segura por el mero nivel dBFS.

**Fuera de alcance por decisión:** comparación musical A/B, cuestionario musical, ajuste automático de PEQ con frecuencia/Q/tipo inventados, formatos propietarios de exportación no aprobados, integración con hardware sin interfaz real/verificada, sincronización de datos en la nube por defecto, exigir mediciones físicas al usuario.

**Alcance opcional o aplazable:** micrófono ambiental independiente (D-011 P2), segunda pasada adicional formal (D-013 P2) y cuestionarios detallados del equipo/entorno (D-012 P3); no se confunden con la preparación contextual ni verificaciones internas P0.

## 2. Prioridades y gobernanza

- **53 prioridades P0 individuales, 2 P2, 1 P3.** No se han aprobado P1 individuales en este registro.
- **D-001** tiene decisión funcional pero **prioridad sin asignar**.
- **D-002–D-007** están protegidas por **prioridad global P0 del bloque 2**, pero no se les inventa una prioridad individual distinta. D-006 está revisada a **A** y prevalece sobre cualquier nota histórica C.
- «Aprobado» califica requisito de producto, **no estado de ingeniería**. Publicación estable exige las puertas de D-063.

## 3. Matriz exhaustiva de trazabilidad (63 decisiones)

La matriz resume cada decisión, prioridad y dependencias destacadas; el texto íntegro y la elección exacta siguen en el issue #30.

| ID | Eje | Decisión aprobada (síntesis) | Prioridad | Dependencias importantes |
|---|---|---|---|---|
| D-001 | Comparaciones inteligentes | Activar comparaciones dentro del examen solo cuando el motor las necesite | **SIN ASIGNAR** | D-005, D-036 |
| D-002 | Ritmo adaptativo | Adaptar el ritmo según respuestas [opción D] | **P0 GLOBAL / INDIVIDUAL NO ASIGNADO** | D-028, D-031 |
| D-003 | Respuesta inmediata | Permitir respuesta durante tono y detenerlo inmediatamente [opción A] | **P0 GLOBAL / INDIVIDUAL NO ASIGNADO** | D-021, D-031 |
| D-004 | Contradicciones | Explicación breve y consentimiento antes de repetir por contradicción [opción B] | **P0 GLOBAL / INDIVIDUAL NO ASIGNADO** | D-032, D-034 |
| D-005 | Método contextual de comparación | Motor decide cuándo y cómo comparar sin pasos manuales adicionales [opción D] | **P0 GLOBAL / INDIVIDUAL NO ASIGNADO** | D-036 |
| D-006 | Progresión digital | Subir nivel digital automáticamente solo dentro de límites ya autorizados; volumen físico fijo [opción A (revisada)] | **P0 GLOBAL / INDIVIDUAL NO ASIGNADO** | D-032, D-037 |
| D-007 | Controles contextuales | Mostrar controles avanzados solo cuando sean pertinentes [opción C] | **P0 GLOBAL / INDIVIDUAL NO ASIGNADO** | D-018, D-021 |
| D-008 | Barrido integrado | Barrido de frecuencias dentro del examen principal | **P0** | D-029, D-030 |
| D-009 | Sonoridad sin paso extra | Retirar comparación manual de sonoridad como paso independiente | **P0** | D-005, D-036 |
| D-010 | Eliminar música A/B | Sin música de comparación ni gustos musicales en el examen | **P0** | D-036 |
| D-011 | Micrófono avanzado opcional | Dejar comprobación de entorno/micrófono en módulo separado optativo | **P2** | D-037 |
| D-012 | Configuraciones y cuestionarios de equipo | Cuestionarios detallados del equipo/entorno, opcionales y adaptados | **P3** | D-020, D-042 |
| D-013 | Segunda pasada selectiva | Solo ante incertidumbre y con confirmación breve; no imponer segundo test | **P2** | D-004, D-033, D-038 |
| D-014 | Un examen adaptativo | Sin elección obligatoria entre modo rápido y completo | **P0** | D-031, D-038 |
| D-015 | Rediseño de resultados | Rehacer por completo presentación y auditabilidad de resultados | **P0** | D-023, D-024 |
| D-016 | Identidad visual | Examen minimalista y resultados con visualización profesional | **P0** | D-021, D-023 |
| D-017 | Tema | Seguir tema OS con selector manual | **P0** | D-058 |
| D-018 | Flujo | Guiado simple, herramientas avanzadas separadas | **P0** | D-007 |
| D-019 | Inicio | Primera visita guiada; posteriores recuerdan último perfil/equipo | **P0** | D-051 |
| D-020 | Preparación | Preparación contextual por equipo sin preguntas innecesarias | **P0** | D-042, D-012 |
| D-021 | Vista durante el examen | Frecuencia y nivel digital siempre visibles, tiempo, animación, respuesta inmediata, detener y volver | **P0** | D-003, D-031, D-058 |
| D-022 | Animación de barrido | Barrido visual fluido y frecuencia actual en tiempo real | **P0** | D-029, D-062 |
| D-023 | Resultados guiados | Resumen, único EQ y guía de aplicación | **P0** | D-041, D-048 |
| D-024 | EQ profesional | Gráfico de barras verticales con valores legibles | **P0** | D-043, D-049 |
| D-025 | Responsividad | Una interfaz adaptable para móvil y escritorio | **P0** | D-058, D-062 |
| D-026 | Comunicación simple | Explicaciones sencillas con datos técnicos opcionales | **P0** | D-033, D-058 |
| D-027 | Ayuda contextual | Guía ilustrada ante errores/situaciones poco comunes | **P0** | D-055, D-060 |
| D-028 | Orden adaptativo | Comenzar ordenado y adaptar recorrido al detectar dificultades | **P0** | D-029, D-030 |
| D-029 | Barrido central | Barrido principal más tonos discretos de confirmación | **P0** | D-008, D-030 |
| D-030 | Exploración del barrido | Detectar regiones percibidas y planificar confirmaciones; sin asumir umbral exacto | **P0** | D-029, D-039 |
| D-031 | Duración adaptable | Tono de duración dinámica, barra y respuesta inmediata | **P0** | D-003, D-021 |
| D-032 | Pasos digitales adaptativos | Pasos según frecuencia, respuestas y confianza, equilibrando valor informativo y tiempo (C/D) | **P0** | D-006, D-037 |
| D-033 | Confianza en umbrales | Evidencia trazable y confirmaciones selectivas; clasificar confianza sin porcentajes inventados | **P0** | D-034, D-039 |
| D-034 | Frecuencias inconclusas | Verificar solo si aporta evidencia, o avanzar preservando incertidumbre; aviso discreto (D/B) | **P0** | D-004, D-041 |
| D-035 | Oídos y canales | Modo según equipo; auriculares separan canales L/R si se verifica, o repetir/usar conjunto (C/C) | **P0** | D-047, D-055 |
| D-036 | Comparaciones integradas | Dos tonos consecutivos automáticos y respuesta contextual sencilla (B/C), sin música A/B | **P0** | D-005, D-009 |
| D-037 | Protección del nivel digital | Límites por clase, auto-progresión solo autorizada; ampliación avanzada con advertencia y permiso explícito (D/B) | **P0** | D-006, D-055 |
| D-038 | Cierre adaptativo | Finalizar por cobertura/evidencia/duración; resumen y verificaciones voluntarias (D/B) | **P0** | D-033, D-041 |
| D-039 | Investigación de algoritmos | Comparar candidatos con datos reproducibles; preferir corrección perceptible pero experimental (D/A) | **P0** | D-040, D-047 |
| D-040 | Magnitud del EQ | Investigar límites y prevención de clipping; intensidad elegida automáticamente (D/A) | **P0** | D-039, D-046 |
| D-041 | EQ ante datos faltantes | EQ inmediato; estimaciones justificadas o neutralidad según evidencia, mostrando procedencia (D/D) | **P0** | D-034, D-049 |
| D-042 | Familias de dispositivos | Perfiles inteligentes por dispositivo, crecimiento progresivo y soporte de clases declaradas | **P0** | D-020, D-053 |
| D-043 | Bandas 2–31 | Frecuencias reales, 4/5/7/10/15/31 y conteos personalizados | **P0** | D-044, D-049 |
| D-044 | Reconocimiento de bandas | Perfiles + lectura fotográfica + edición; corregir solo frecuencias inciertas (D/C) | **P0** | D-043, D-059 |
| D-045 | dB frente a pasos físicos | Solo conversiones documentadas; escala propia provisional marcada hipótesis (D/D) | **P0** | D-046, D-053 |
| D-046 | Restricciones y redondeo | Optimización de pasos y límites, mostrar objetivo/posible/desviación (D/C) | **P0** | D-045, D-052 |
| D-047 | EQ único conjunto | Único EQ, conservando origen por canal; síntesis ponderada por evidencia con método a validar (A/C) | **P0** | D-035, D-039 |
| D-048 | Transferencia al equipo | Guía/copia/exportación e integración solo si hay API real y autorizada; verificación opcional (D/C) | **P0** | D-047, D-049 |
| D-049 | Exportaciones universales | Copiar, TXT, CSV y PNG profesional legible (B/C); sin formatos especializados implícitos | **P0** | D-047, D-050 |
| D-050 | Edición del EQ | Editar gráfico y números; conservar original, deshacer/rehacer y restaurar (D/C) | **P0** | D-049, D-051 |
| D-051 | Historial local | Perfiles/equipos/resultados locales, respaldo estructurado importable/exportable (D/C) | **P0** | D-050, D-060 |
| D-052 | Sólo EQ gráfico automático | Equipos paramétricos: orientación manual, sin generar PEQ; optimizar sólo controles conocidos y mostrar desviación calculable (A/C) | **P0** | D-045, D-046 |
| D-053 | Compatibilidad documentada | Fuentes oficiales + pruebas automáticas/hardware representativo; admitir perfiles no verificados con advertencias (D/C) | **P0** | D-042, D-044 |
| D-054 | Autoguardado y reanudar | Recuperación inteligente; si cambia salida, comprobar y repetir solo mediciones afectadas (D/C) | **P0** | D-055, D-060 |
| D-055 | Gestión de salida | Seleccionar/detectar cuando API lo permita; sino salida predeterminada y verificación auditiva (D/A) | **P0** | D-054, D-057 |
| D-056 | Interrupciones observables | Pausar ante cambios de app, Bluetooth, llamadas observables; retomar manualmente con comprobación pertinente (D/C) | **P0** | D-054, D-055 |
| D-057 | Compatibilidad progresiva | Detectar capacidades; modo alterno sólo si supera mínimos, sino bloquear examen y conservar resultados (D/C) | **P0** | D-055, D-063 |
| D-058 | Accesibilidad | WCAG 2.2 AA objetivo; indicadores accesibles de frecuencia, nivel digital y progreso sin sesgar respuesta (D/C) | **P0** | D-021, D-062 |
| D-059 | Privacidad local | Fotos descartadas por defecto y remoto sólo con consentimiento; borrado individual/total confirmado (D/C) | **P0** | D-044, D-051 |
| D-060 | Offline y resiliencia | Autoguardado/integridad/offline donde compatible; almacenamiento alterno o sesión temporal sin falsa persistencia (D/C) | **P0** | D-051, D-054 |
| D-061 | Diagnósticos voluntarios | Informes técnicos mínimos y locales; vista previa, sin datos personales por defecto y permiso por envío (D/C) | **P0** | D-059, D-063 |
| D-062 | Optimización | Priorizar audio y memoria; reducir carga visual antes de pausar y repetir mediciones afectadas (D/C) | **P0** | D-056, D-058 |
| D-063 | Puertas de calidad | Validación integral documentada; estable solo si todos P0 verificados, tests críticos pasan y existe rollback (D/C) | **P0** | D-037, D-039, D-058 |

## 4. Contratos funcionales transversales

### 4.1 Examen y evidencia

El examen integra barrido continuo con confirmaciones discretas, progresión adaptativa por frecuencia y confianza, respuesta «Lo escucho/No lo escucho» mientras suena el tono, parada inmediata y navegación atrás con conservación válida del progreso. Repeticiones por contradicción requieren explicación y confirmación (D-004), mientras incrementos ordinarios del nivel digital dentro de topes aprobados no requieren autorización repetida (D-006). El estado de evidencia por frecuencia será **directo / estimado / inconcluso / no observado** (modelo exacto por validar). Un barrido aislado no se etiqueta como umbral confirmado.

### 4.2 Seguridad y unidades

Separar explícitamente: amplitud digital de ensayo (dBFS), ganancia de ecualización (dB) y presión sonora física (dB SPL, no disponible sin calibración). El volumen físico permanece constante; los cambios digitales respetan límites previamente autorizados. Una ampliación de límites se separa del flujo normal, con advertencia y confirmación explícita, y solo cuando se haya determinado que es aceptable continuar. Los topes concretos, exposición y criterios de bloqueo se resolverán por pruebas. Control de parada inmediata y sin autorreproducción tras interrupción.

### 4.3 Cálculo y presentación del EQ

Seleccionar algoritmos mediante evaluación reproducible (D-039); investigar magnitud, headroom y clipping (D-040). Mantener **un único EQ conjunto** (D-047=A), conservando por separado la evidencia por oído cuando se obtuvo con canales verificados y con síntesis que considere incertidumbre; **no usar un simple promedio por defecto**. Para bandas faltantes, solo estimación etiquetada cuando se justifique o 0 dB neutral. Mostrar gráfico de barras y editor sincronizado con copia/TXT/CSV/PNG, sin exportadores propietarios implícitos.

### 4.4 Perfiles y transferencia

Equipos/perfiles con bandas de 2 a 31 y frecuencias reales; formas preconfiguradas, entrada manual y reconocimiento fotográfico opcional. Etiquetar la procedencia y nivel de certeza de cada frecuencia, escala y conversión. No igualar pasos físicos con dB sin documentación; permitir hipótesis provisional indicada. Guía de transferencia y posibilidad de integración solo si hay capacidades reales y autorizadas. Equipos paramétricos: **orientación manual, no generador PEQ automático**.

### 4.5 Privacidad, recuperación y accesibilidad

Perfiles, historial y respaldos estructurados locales sin cuenta obligatoria; fotografías descartadas por defecto; transferencia remota sólo con autorización explícita. Borrado individual o completo confirmado. Diagnósticos técnicos locales y revisables, sin enviar automáticamente información personal. Funcionamiento offline cuando los recursos/plataforma lo permitan. Salida de audio y continuidad gestionadas según capacidades del navegador; suspender reproducción en cambios observables y retomar sólo mediante acción consciente. WCAG 2.2 AA es objetivo a auditar, **no conformidad ya demostrada**.

## 5. Criterios de aceptación auditables antes de publicación estable

| Dominio | Aceptación a demostrar | Evidencia exigida |
|---|---|---|
| Motor y flujo | Respuesta inmediata detiene audio; barrido y tonos discretos coherentes; regresión de contradicciones y límites | Pruebas unitarias + de navegador + registros de casos |
| Resultados | Un EQ por sesión, trazabilidad de cada banda, neutralidad justificada y estimaciones explícitas | Corpus sintético reproducible, oráculos y comparación de candidatos |
| Ganancias seguras | Límites digitales/advertencias/permiso adicional, detección de picos y clipping según condiciones conocidas | Protocolo de ensayo, resultados registrados y fallbacks |
| Dispositivos | 2–31 bandas, frecuencias reales, redondeos y perfiles con estado de verificación explícito | Matriz de equipos y documentación oficial por modelo representativo |
| Exportación | Una única fuente de datos para vista, edición, copiar, TXT, CSV, PNG y respaldo estructurado | Comparación de ficheros con perfil/versión actual |
| Persistencia | Guardados reales vs temporales; restauración, importación conflictiva y borrado selectivo | Pruebas ante cuota, corrupción, recarga y offline |
| Privacidad | Retención de fotos por defecto cero tras proceso; permiso para remoto y reportes revisables | Flujos de consentimiento y auditoría de datos |
| Accesibilidad | WCAG 2.2 AA como objetivo, teclado, zoom, contraste, lectores, reduced-motion | Auditoría manual+automatizada y evidencia |
| Compatibilidad | Alternativas solo si cumplen mínimos; bloquear examen sin bloquear resultados | Matriz navegadores/OS y pruebas reales |
| Lanzamiento | Todos los P0 implementados/verificados, pruebas críticas aprobadas, límites publicados, reversión operativa | Checklist de release y evidencias firmadas |

**No se fijan falsos valores numéricos de latencia, SPL, duración, precisión ni ganancia:** serán producto del protocolo de validación. Los valores heredados de V2 no son automáticamente normas de V3.

## 6. Exclusiones y asuntos a aprobar

- Prioridad individual de D-001 (sin valor actual) y si el bloque 2 necesita desagregación individual sin alterar su P0 global.
- Evidencia y protocolo para límites digitales, algoritmos de ganancia y método conjunto de oídos/canales.
- Clasificación de capacidades mínimas por navegador y de equipos realmente verificados; no comprometer publicación universal de hardware.
- Semántica precisa de la extensión opcional P2 D-013 frente a las verificaciones selectivas P0.
- Alcance y factibilidad de reconocimiento fotográfico local, con alternativa manual desde el primer día.

## 7. Condición de aprobación

**Se solicita revisión y aprobación expresa del usuario del alcance global y plan por fases.** Esta versión es únicamente documental y no permite iniciar implementación, fusionar PRs ni modificar la interfaz oficial.