# Hear 3.0 — P0: recuperación silenciosa del recorrido adaptativo

**Fecha:** 05/11/2026. **Estado:** piloto experimental, no release estable. Seguimiento: [issue #30](https://github.com/PoldKent/AudioCal-Hear/issues/30), D-003, D-004, D-006, D-028–D-034, D-051, D-054–D-060 y D-063.

## Incremento entregado

Se integran tres partes que comparten el mismo perfil:

1. `adaptive-discrete-exam.mjs` exporta/restaura **progreso de planificación** del examen (orden de bandas, intervalo subjetivo, clasificación de evidencias, nivel digital siguiente, intentos, confirmación pendiente y secuencia). Valida **antes** de rehidratar que las observaciones correspondan exactamente a los registros del controlador de tonos, que los IDs no se dupliquen, que ninguna banda reclame umbrales/EQ y que no se hayan elevado los límites digitales. Si una banda es inconclusa no retiene un intervalo como si estuviera demostrado.
2. `adaptive-progress-store.mjs` guarda plan, progreso y sesión de audio **en una misma unidad JSON versionada**, por perfil y con dos slots de respaldo. Utiliza la memoria del navegador, fallback a almacenamiento de pestaña y memoria temporal. Comprueba lectura posterior a escritura y comunica durabilidad; `fnv1a32` solo detecta corrupción accidental: **no es cifrado, autenticación o garantía transaccional entre pestañas**.
3. `resumable-adaptive-exam.mjs` coordina el guardado en acciones pertinentes y la recuperación solicitada expresamente por el usuario. Un estado guardado como `ready`, `playing` o `starting` se recupera **detenido y pausado**. Exige revisar salida/volumen, confirmar ruta cuando aplica y pulsar reanudar. Un tono iniciado pero no respondido no se convierte en un falso «no lo escucho». Una lectura o recuperación no vuelve a escribir automáticamente el checkpoint.

El [piloto de barrido → tonos](../../tests/fixtures/hear3-integrated-exam-pilot.html), enlazado desde la vista previa pública, incorpora **recuperar**, **descargar respaldo JSON** y **borrar checkpoint del examen** con consentimiento. La exportación es local, sin red. La interfaz no migra ni borra perfiles Hear 2.0.

## Pruebas automáticas

Node cubre: salida silenciosa sin interacción, copia exacta de observaciones, plan/límites, ruta y reanudación, contradicciones que requieren consentimiento, tono pendiente durante cierre, checkpoint modificado y evidencia discordante, modificaciones desde otra pestaña, corrupción doble-slot, fallback temporal y borrado con confirmación.

Playwright cubre: recarga con checkpoint conservado, recuperación sin autoplay, salida física verificada antes de continuar, respaldo JSON, confirmación de borrado sin resurgir al renderizar, rechazo de recuperación cancelada y preservación de clave V2. Ejecutar todas las suites Node y las matrices Android Chromium, iPhone WebKit y escritorio antes de aprobar el PR.

## Riesgos conocidos y tareas P0 aún abiertas

- El mecanismo de dos slots reduce riesgo de corrupción pero **no es una transacción atómica multi-pestaña**. El control de revisión rechaza escrituras obsoletas conocidas, no evita todas las carreras simultáneas. Deben investigarse bloqueo Web Locks/IndexedDB, integridad, recuperación desde múltiples pestañas, cuota y tratamiento explícito de conflictos.
- El respaldo exportado tiene un checksum no autenticado, no contraseña ni cifrado. No hay importación de este bundle hasta validar el formato y procedimiento de seguridad.
- El barrido previo a la construcción del examen no se restablece después de una recarga. Solo se recupera el recorrido discreto iniciado y guardado.
- El borrado aquí solo afecta al checkpoint adaptativo de este perfil. La eliminación integral de datos V2/V3, fotos y archivos exportados sigue pendiente de D-059. No se eliminan archivos JSON externos automáticamente.
- Faltan resumen final y resultados realmente integrados con catálogo V3, selección de dispositivo y canales, comparaciones D-036, motor definitivo de EQ D-039–D-041, accesibilidad y localización completas, validación offline y pruebas acústicas con hardware y ruta real.
- El nivel **dBFS no equivale a SPL**. Los límites de software y las pruebas con mocks no acreditan seguridad física. La UI oficial Hear 2.0 permanece intacta.
- D-063=C (100% de P0, verificación física, matriz crítica y rollback validado) **NO** está cumplido: Hear 3.0 sigue siendo una vista previa de investigación.

## Rollback

Revertir el PR retira exportación/restauración y sus controles del piloto, sin cambiar el motor de Hear 2.0. Los datos guardados bajo `hear3:adaptive-progress:<profileId>:0/1` permanecen y pueden eliminarse manualmente en el navegador; un rollback de código no debe borrar automáticamente perfiles ni checkpoints. Verificar CI, GitHub Pages y navegación.
