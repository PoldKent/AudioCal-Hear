# Auditoría funcional y de veracidad de AudioCal Hear

**Fecha:** 31 de octubre de 2026 (hora de Bolivia).  
**Commit auditado:** `85d724ba8156351cd063da2c23ccc02174dae7c4` (`main`).  
**Alcance:** los nueve módulos JS fuente (`01-core`, `02-setup`, `03-hearing-test`, `04-equalization`, `05-audio-player`, `05b-eq-transfer`, `05c-loudness`, `05d-evidence`, `06-interactions`); plantilla HTML, estilos, definiciones de traducción, pruebas automatizadas, scripts de build, manuales y políticas.  
**Método:** revisión estática de rutas de eventos, decisiones de guardado, cálculo y exportación, comprobación de integridad publicada mediante GitHub Actions, examen de la cobertura de pruebas y contraste entre los nombres de las opciones y su implementación. **No** se ha probado físicamente ningún radio de auto, in-ear, micrófono calibrado ni calidad musical perceptiva real; esos ensayos siguen pendientes.

## Resultado ejecutivo

La aplicación **sí** conecta los controles principales a acciones existentes y supera sus CI de código, integridad y navegador en el commit auditado. **No** puede afirmarse todavía que las opciones de «Verificar», «EQ personalizado» y «resultado exacto» tengan la validez acústica que su formulación podría sugerir. Los defectos principales están en la **semántica de los datos**, no en la ausencia de botones.

## Matriz por opción

| Opción visible | Qué realiza realmente el código | Veredicto | Acción |
|---|---|---|---|
| Auto / Auriculares / Parlantes | Cambia preset, canal inicial y campos de contexto; no identifica ni mide respuesta del equipo automáticamente | **Parcial** | Declarar «perfil de uso» y no calibración automática de hardware |
| Asiento / ventanas / motor | Guarda valores elegidos; ventanas abiertas o motor encendido bloquean la corrección en auto; asiento no cambia la fórmula | **Parcial** | No sugerir que existe un modelo acústico del vehículo |
| ANC, conexión, sellado y sala | Metadatos; sellado in-ear no verificado limita boosts graves; otros campos mayormente no cambian ganancias | **Parcial** | Diferenciar «registrado» de «verificado» |
| Auto 7 y Auriculares 10 | Bandas centrales y rangos de los presets corresponden a las configuraciones dadas | **Correcto en bandas** | Confirmar físicamente la escala y filtros |
| Formatos ISO / otras bandas | Crea bandas seleccionadas; no confirma que un hardware con esas bandas tenga igual Q/transferencia | **Aproximado** | Distinguir frecuencia central de filtro equivalente |
| Rápida (hasta 6 frecuencias) | Elige 6 frecuencias de la lista; estima interiores no medidas y puede dejar otras sin cobertura | **Correcto con límites** | Dejar visible cobertura medida vs interpolada |
| Completa | Agenda cada banda del EQ (por canal escogido) | **Correcto en alcance** | No confundir frecuencia medida con respuesta acústica |
| Juntos / por oído | Usa un panorama estéreo cuando Web Audio lo soporta; cuando no, reproduce mono sin avisar; en el resultado agrega ambos oídos | **Parcial** | Comprobar aislamiento real de canales y no prometer EQ L/R independiente |
| Una pasada | Busca umbral digital con decisiones explícitas | **Implementado** | Repetir bajo control de volumen, no llamarlo audiograma calibrado |
| Verificar, dos pasadas | Segunda etapa prueba cerca del umbral de la primera; en una respuesta habitual **guarda de nuevo el umbral original**, sin segunda búsqueda independiente | **Crítico / nombre engañoso** | Rediseñar como «confirmación de frontera» o ejecutar segunda búsqueda independiente |
| Ajustes inicial/mínimo dBFS | Cambia niveles *digitales* del tono, no dB SPL | **Correcto si se explica** | Mantener advertencias y prueba de seguridad física |
| Comprobar ruido (micrófono) | Calcula RMS digital relativo; no mide ruido en dB SPL, reverberación ni respuesta en frecuencia | **Correcto como relativo** | No rotular como calibración por micrófono |
| Test completado | Se han registrado estados de las pruebas, incluidos `unheard`/`skipped`/`unconfirmed`; no implica umbrales válidos para todas las bandas | **Parcial** | Separar «tareas completas» de «frecuencias válidas» |
| Medición original | Guarda umbral digital y presenta puntos directos, no una audiometría SPL | **Correcto con límites** | Conservar inmutables todos los datos originales |
| Interpretación automática | Contrastes locales, umbral de 3 dBFS, límites de ±1/±2 dB; heurística experimental, no corrección de dispositivo calibrada | **Experimental** | No ofrecer «EQ acústicamente correcto» |
| Verificar estabilidad | Compara resultados de ambas pasadas y etiqueta como repetibles los umbrales que pueden ser una copia de la primera | **Crítico** | No computar puntuación de repetibilidad hasta independencia real |
| Igualación de sonoridad | Dos tonos alrededor de −48 dBFS con margen ±6 dB digitales, repetición; no altera el EQ | **Correcto como experimento opcional** | No inferir compensaciones de EQ por este dato |
| EQ automático vs resultado final | `recommend()` separa base, gustos y cambios manuales; **al mover sliders se actualiza el PNG, pero la tabla comparativa ya renderizada queda obsoleta** | **Alto** | Una sola fuente y actualización atómica de todas las vistas |
| Guardar PNG / copiar controles | Genera Canvas PNG y copia valores; la conversión a posición está condicionada a escala declarada; no comprueba el manual | **Operativo, exactitud condicionada** | Verificar y desacoplar límites físicos (pasos) de límites de ganancia (dB) |
| Escala 1 o 2 dB por nivel | Divide `gain` entre 1 o 2 y redondea, limitando con `p.min/p.max`, que también se usan como límites de ganancia | **Alto** | Datos separados `gainDbMin/Max`, `controlMin/Max` y resolución; demostrar error de cuantización |
| «Aplicar a Spotify / YouTube / equipo» | Guía de introducción manual; no modifica aplicaciones ni EQ de hardware | **Correcto si se explica** | Mantener claramente «guía» |
| «Bandas exactas» al transferir | Igualdad de frecuencia central `kind:exact`, pero interpolación logarítmica y filtros Q desconocidos; no demuestra equivalencia acústica | **Parcial** | Cambiar `exact` por «frecuencia coincidente, filtro no comprobado» |
| Música A/B, EQ on/off | Aplica filtros y bypass con margen de headroom, pero no iguala sonoridad perceptiva, no oculta identidad y no verifica tiempo de escucha | **Comparación orientativa** | Evitar llamarla prueba ciega o científicamente validada |
| Equilibrio tonal «confirmado» | Registra clics A/B y calcula un ajuste; no demuestra escucha suficiente ni calidad musical óptima | **Nombre sobrepromete** | «Preferencia seleccionada» en lugar de «confirmada» |
| Preferencias graves/voces/brillo | Guardan valores de gusto aplicados a `recommend()`; no son medición auditiva | **Correcto como preferencia** | Mostrar capa de gusto por separado |
| Repetir pendientes | Borra bandas que `gather()` marca sin umbral; una discrepancia por oído puede pasar inadvertida si la mediana global tiene dato | **Parcial** | Permitir repetir canal/frecuencia no fiable independientemente |
| Guardar, exportar, importar perfiles | `localStorage`, JSON validado, tamaño de archivo limitado, copia local | **Correcto** | Tests de versiones, duplicados y cambios de formato |
| Idiomas (8) | Diccionarios presentes y tests de navegación/overflow; no existe prueba semántica manual de todas las cadenas | **Funcionamiento básico probado** | Auditoría lingüística de resultados sensibles |
| Medición acústica de sala / cabina | **No implementada como ruta independiente**; solo existe comprobación opcional de ruido relativo | **Pendiente** | No presentar como funcionalidad existente |

## Hallazgos reproducibles / anclajes de código

### AF-01 — CRÍTICO: «dos pasadas» no son dos mediciones independientes

- `src/js/01-core.js` ~211–218: `newTrial()` inicia `pass===1` con `heard=prev`, `missed=prev-1` y `phase='verify'`.
- `src/js/01-core.js` ~242–250: si la respuesta coincide con «sí» en el nivel previo y «no» justo debajo, retorna `measured` **sin volver a estimar el valor de `heard`**.
- `src/js/03-hearing-test.js` ~80–89: `logMeasure('heard')` almacena `trial.heard`, que sigue siendo el valor de la primera pasada.
- `src/js/05d-evidence.js` ~14–44 y `src/js/04-equalization.js` ~2–11: los contadores y niveles de confianza se alimentan de ambas entradas como si fuesen estimaciones diferenciadas.
- **Reproducción lógica:** primera pasada `heard=-50`; en `verify`, responder sí a −50 y no a −51. Se guarda `-50` en ambas pasadas. No demuestra repetibilidad independiente.
- **Solución:** distinguir «confirmación del umbral» de «segunda exploración independiente» y **no** calcular repetibilidad independiente con las confirmaciones de frontera. Reprocesar perfiles previos con metodología etiquetada, no reinterpretarlos silenciosamente.

### AF-02 — ALTO: actualización desincronizada de resultados

- `src/js/06-interactions.js` ~13 y ~114: slider/manual llama `refreshResultsUI()`.
- `src/js/04-equalization.js` ~119–134: actualiza bandas, editor, lista resumida, reproductor, transferencia y tarjeta PNG, pero **no** regenera `renderCalibrationTrace(p,r)`.
- La columna «EQ final» de la tabla comparativa conserva el HTML antiguo mientras PNG y botones representan nuevos valores.
- **Solución:** regenerar componentes dependientes de `recommend()` tras cambios, manteniendo la medición original intacta.

### AF-03 — ALTO: mezcla de unidades y rangos

- `src/js/01-core.js` ~60–68: `car7` tiene `min:-6,max:6`, `photo10` `min:-20,max:20`.
- `src/js/03-hearing-test.js` ~116–118 y `src/js/04-equalization.js` ~214–232: los límites se tratan como **dB de EQ** y **posiciones del equipo**.
- **Ejemplo:** equipo de −6 a +6 **pasos** con 2 dB/paso: el hardware permitiría −12…+12 dB nominales, pero el modelo recorta ganancias a ±6 dB y convierte, como máximo, a ±3 pasos; no puede recomendar las posiciones ±4…±6. No implica que sea seguro utilizar esas posiciones; significa que **el modelo no representa correctamente las unidades**.
- Si la escala está desconocida, aparece `—` para posiciones: esto **sí es prudente**.
- **Solución:** almacenar escalas independientes: centro/banda, `controlMin/Max`, `gainDbPerStep`, `gainDbMin/Max`, `step`, `Q` (cuando se conozca), redondeo y error de aproximación.

### AF-04 — ALTO: el entorno se registra pero no se calibra

- `src/js/01-core.js` ~77–121: contexto incluye asiento, ANC, colocación, habitación.
- `src/js/04-equalization.js` ~17–54: el cálculo considera explícitamente ventanas/motor del auto y sellado de in-ear en graves; asiento, tipo de sala, proximidad a paredes y ANC **no se traducen** a una curva acústica medida ni a ajustes de EQ específicos.
- `defaultCalibrationContext()` además marca como `captured` valores preseleccionados (p. ej., conductor, motor apagado) que el usuario puede no haber confirmado.
- **Solución:** marcar valores `selected/unknown/verified` por campo; separar contexto descriptivo de medición ambiental y de modelo técnico.

### AF-05 — MEDIO/ALTO: comprobación de oído por separado no garantiza salida aislada

- `src/js/03-hearing-test.js` ~61–65: si existe `createStereoPanner()`, fija `pan=-1/+1`; si no existe, conecta un oscilador mono sin aislar canal.
- `src/js/04-equalization.js` ~2–10: aunque se recopilen oídos por separado, el resultado EQ actual es una única curva mediana para ambos.
- **Solución:** detectar ausencia de aislamiento L/R y advertir o impedir modo por oído; etiquetar EQ único/binaural vs filtros individuales si algún día se admite DSP por canal.

### AF-06 — MEDIO: las pruebas A/B no son ciegas ni se igualan en sonoridad

- `src/js/05-audio-player.js` ~27–46: usa filtros con protección digital de picos, pero mantiene un preamplificador fijo; **no** estima ni iguala sonoridad percibida A/B.
- `src/js/04-equalization.js` ~70–113, `src/js/06-interactions.js` ~14–31: las opciones A y B están visibles y la condición «escuchadas» se marca al seleccionar, no tras un tiempo de escucha medido.
- **Solución:** llamar «comparación orientativa», controlar duración y orden aleatorio si se desea evidencia sobre preferencia, igualar nivel de escucha cuando sea posible.

### AF-07 — MEDIO: «bandas exactas» no implica equivalencia de filtros

- `src/js/05b-eq-transfer.js` ~13–29: `kind:'exact'` significa coincidencia de frecuencia central; no modela `Q`, tipo de filtro ni el DSP del equipo destino. Los demás valores se interpolan en log-Hz.
- **Solución:** «centro coincidente» y estado de correspondencia del filtro desconocido.

### AF-08 — MEDIO: «repetir pendientes» y estados no son el mismo concepto

- `src/js/06-interactions.js` ~78: filtra `gather().db===null` y borra la banda de todos los canales; no selecciona específicamente resultados discrepantes entre oídos o un oído sin umbral cuando otro sí dispone de dato.
- `src/js/02-setup.js` ~88–90: un registro `unconfirmed` o `skipped` cuenta como tarea completada.
- **Solución:** interfaz que distinga tarea ejecutada, umbral válido, repetibilidad, canal y razón de reintento.

### AF-09 — MEDIO: no existe historial inmutable de algoritmos aplicados

- Se almacena `measures` y el algoritmo actual se identifica como `local-contrast-v2-experimental`, pero no se conservan snapshots completos de las ganancias exportadas y de la versión del algoritmo por cada resultado histórico.
- Reabrir un perfil tras una modificación futura de `recommend()` puede cambiar el EQ mostrado sin un «antes vs después» persistente.
- **Solución:** guardar revisiones fechadas del resultado sin sobrescribir la evidencia y permitir compararlas.

### AF-10 — BAJO/MEDIO: claridad de versión e idiomas

- `src/index.template.html`, `src/js/01-core.js` ~30–55 y la interfaz presentan `v1.9.1` a pesar de incluir funciones integradas después de esa versión, y algunas etiquetas antiguas aún mencionan `v1.7`.
- Los tests de los ocho idiomas comprueban visualización, no exactitud de traducciones de términos científicos como «umbral», «dBFS», «ganancia», «confirmado».
- **Solución:** definir release/commit de compilación y revisar traducciones críticas, sin cambiar la compatibilidad de datos.

## Hallazgos positivos

- Existe un handler de `handleClick` para **todos los identificadores estáticos de acción** declarados mediante `button(label,action)` en las fuentes revisadas; no se encontraron botones principales sin ruta de evento en esa búsqueda estática. Las familias de botones `data-device`, `data-preset`, `data-channels`, `data-testmode`, `data-passes`, `data-loudness`, transferencia y preferencias también tienen handlers.
- La generación de `index.html` coincide con los módulos fuente según CI, y **test fuente, integridad y UI Android/iPhone/escritorio** finalizaron con éxito para el commit auditado.
- Los perfiles se guardan con `localStorage` y pueden importarse/exportarse; existe normalización básica de datos.
- La prueba de ruido con micrófono declara que es relativa y no de dB SPL.
- No hay llamadas `fetch`, `XMLHttpRequest` o `sendBeacon` en los módulos de aplicación inspeccionados ni JavaScript remoto importado desde el HTML; esto no constituye auditoría de todo el alojamiento o el navegador.
- La tarjeta PNG y la copia de controles son implementaciones reales; si no se conoce la equivalencia dB/paso, se ocultan prudentemente las posiciones supuestamente exactas.
- La prueba de sonoridad relativa no modifica `recommend()`, lo que evita mezclar datos de distinta naturaleza sin calibración.

## Plan de reparación recomendado, sujeto a aprobación

1. **P0: reparar el significado de «Verificar».** Alternativa conservadora: renombrarlo «Confirmación del umbral» y dejar de computar repetibilidad independiente. Alternativa de precisión: dos búsquedas genuinamente independientes con control de entorno y volumen, manteniendo la confirmación de frontera como subpaso.
2. **P0: actualizar todas las vistas desde una fuente única** (tabla, gráfica, PNG, CSV, texto y transferencias), y agregar regresión de interacción después de cambiar sliders/preferencias.
3. **P0: separar los límites físicos de control de las ganancias dB**, probar 7 × ±6 pasos y 10 × ±20 pasos en escenarios 1 y 2 dB/paso y escala desconocida.
4. **P1: veracidad del contexto y del audio L/R**: condiciones no confirmadas marcadas desconocidas, aislamiento L/R comprobado, reglas ambientales con procedencia.
5. **P1: auditoría de A/B y transferencia**: presentación honesta, rangos válidos por destino, estimación vs coincidencia de filtros, niveles perceptivos y test de música controlado.
6. **P2: versionar resultados y consolidar textos/traducciones**, pruebas de importaciones históricas y revisión manual multiplataforma con equipos reales.

**Regla de integración:** no cambiar el algoritmo de EQ, datos previos ni métodos clínicos sin análisis adicional; primero corregir funciones que producen afirmaciones erróneas y añadir pruebas de falsación que fallen ante esos defectos.

## Matriz adicional de ensayos manuales que faltan

| Ensayo | Qué verificar | Medio |
|---|---|---|
| Auto 7 bandas (escala ±6 pasos) | Correspondencia física entre pantalla, dB/paso documentado y posiciones reales | Modelo/manual de la radio + auto estacionado |
| Headset 10 bandas (±20 pasos) | Frecuencias, escala real, ANC y posición del perfil | Equipo real y manual |
| In-ear | Colocación y sellado antes y después de volver a insertar | Auriculares reales |
| Parlantes | Repetición por posición y sala; no confundir con corrección micrófono | Entorno real |
| Audio L/R | Verificar aislamiento con auricular de un solo canal y compatibilidad Web Audio | Navegadores y auriculares reales |
| A/B | Igualación aproximada de nivel, orden oculto, escucha sin sesgo de volumen | Sesiones humanas con música propia |
| Dos exploraciones | Respuestas independientes y discrepancias detectadas, no valores copiados | QA de simulación + sesiones reales |
| Cambios de escala y sliders | Sincronía de tabla, gráfica, PNG, CSV y textos | Playwright móvil y escritorio |
| Importación histórica | No perder contexto, mediciones y auditoría original al migrar | Backups de versiones anteriores |

**Estado de este documento:** auditoría de código concluida, verificación semántica de todas las combinaciones de controles y ensayos físicos aún pendientes. No se ha editado código de producción.
