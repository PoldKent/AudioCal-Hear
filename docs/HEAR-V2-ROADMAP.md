# AudioCal Hear 2.0 — ejecución del plan aprobado

## Propósito y definición de terminado

Un examen auditivo que termina en **un único EQ editable, aplicable dentro de Hear y transferible manualmente**, conservando observaciones originales, niveles de confianza y perfiles de hardware. No se afirma que un dBFS digital equivale a un dB SPL acústico, ni que el software diagnostica hipoacusia.

### Flujo objetivo

1. Seleccionar el tipo de salida y las frecuencias/escala del EQ (4/5/7/10 o personalizadas).
2. Comprobación de canal, volumen físico bajo y fijo; barrido preliminar opcional (PR #23).
3. Test de umbrales adaptativo para cada banda y oído (fuentes actuales).
4. Comparación **opcional de sonoridad en esa misma pantalla** para frecuencias elegibles: 1 kHz de referencia a −48 dBFS; muestra con ±6 dBFS; un registro por frecuencia/oído, sin afectar al test.
5. Resultado conservador con una única lista de bandas (PR #22), propuesta experimental, explicación de confianza, control manual, PNG/TXT e instrucciones de transferencia.
6. Reproducción dentro de Hear con EQ activado/desactivado y valoración subjetiva tras escuchar ambos modos.
7. Guardar por perfil y poder importar/exportar.

### Estado verificable del código

| Entrega | PR | Estado |
| --- | --- | --- |
| Unificar el ecualizador, reconocer umbrales digitales de confianza limitada | #22 | Implementada en rama; CI aprobada |
| Barrido previo y micrófono relativo opcional | #23 | Implementada en rama; CI aprobada |
| Estado Personal Sound, A/B en el reproductor y opinión invalidable | #24 | Implementada en rama; pruebas CI |
| Comparación de sonoridad por frecuencia/oído, en la misma pantalla del test | #25 | Implementada en rama; pruebas CI |

**Las PR están apiladas en el orden #22 → #23 → #24 → #25. No alterar `main` ni publicarlas automáticamente hasta aceptar el conjunto.**

### Lo que las mediciones justifican

- El barrido subjetivo mide la audibilidad declarada del **conjunto oído + equipo + sala**, no de cada parte.
- Un micrófono no calibrado solo aporta evidencia **relativa** de energía captada frente al ruido: no certifica respuesta en frecuencia ni SPL.
- Los umbrales digitales y las comparaciones de sonoridad son observaciones **distintas**. Las segundas no se convierten directamente en ganancias de EQ.
- La recomendación inicial se restringe a pequeños contrastes locales entre bandas con mediciones utilizables; bandas extremas, incompletas o con incompatibilidades no deben recibir refuerzos inventados.
- La EQ digital del reproductor web de Hear **sí puede aplicarse**. La EQ física externa necesita ajustes manuales o una API documentada.
- No inventar dB por posición, anchos de banda ni frecuencias de control de un hardware no identificado.

## Criterios de aceptación pendientes de QA presencial

- Completar un perfil con 10 bandas en auriculares: ambos oídos, barrido opcional, estimaciones guardadas, propuesta de EQ coherente y reproductor con control de bypass.
- Completar 7 bandas en automóvil estacionado y 5 bandas personalizadas en parlantes, con control de escala física independiente del nivel digital.
- Validar que la captura por micrófono tiene consentimiento, no se activa por defecto y detiene todas las pistas de audio al salir.
- Evaluar reproducibilidad en dos sesiones con el mismo equipo, condiciones, volumen y usuario.
- Comprobar a ciegas, con igualación de volumen, preferencia por EQ personalizada, EQ neutra y EQ del fabricante; registrar sin forzar que exista una mejora.
- Pruebas de compatibilidad real en Android, iOS/WebKit y escritorio, más validación de persistencia tras recargar y exportar/importar.
- Auditoría de seguridad y distorsión/recorte: si aparece molestia, volumen alto o saturación, terminar inmediatamente.

## Trabajo que aún NO debe darse por finalizado

1. **Motor de validación acústica en parlantes/automóvil:** referencia calibrada opcional, control de posición, micrófono y ruido, normalización relativa, calidad de captura y resultados sin confundir equipo con audición.
2. **Perfiles de instrumentos musicales:** el preamplificador de guitarra no puede probarse reproduciendo tonos que nunca atraviesan su circuito; necesita entrada de señal o grabaciones repetibles.
3. **Motor de personalización perceptiva validado externamente:** estudio comparativo con usuarios y hardware real, y revisión de sesgos antes de usar diferencias de sonoridad o micrófono para sugerir ganancias adicionales.
4. **Integraciones de fabricante:** aplicación directa a hardware únicamente con APIs documentadas y permisos explícitos.
5. **Traducciones y accesibilidad completas** para los nuevos paneles, incluidos lectores de pantalla y modos móviles.

## Protocolo de integración

Fusionar PR #22, después #23, después #24 y después #25, únicamente cuando cada una tenga CI verde, revisión funcional y el historial de `main` sea actual. Si hay conflictos, rebasar las ramas apiladas y ejecutar de nuevo todas las pruebas. Publicar la web solo después de verificar visualmente el resultado y su coherencia con los datos de una prueba real.
