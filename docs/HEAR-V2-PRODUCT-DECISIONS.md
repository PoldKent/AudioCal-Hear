# Hear 2.0 — decisiones de producto aprobadas (2026-11-03)

Este documento prevalece sobre itinerarios históricos de Hear 1.7–2.0 que pedían repetir pruebas de equipo, música A/B o calibración acústica para recibir un EQ.

## 1. El usuario no debe volver a hacer pruebas que ya repitió

No se le pedirá repetir tests completos terminados ni verificar Bluetooth, parlantes, automóvil, Soundcore o instrumentos como prerrequisito de uso. La investigación de hardware, calibración externa y controles físicos pertenece al desarrollo técnico interno.

## 2. El único dato necesario para calcular el EQ es el test de tonos

La persona configura las bandas del ecualizador, fija un volumen físico cómodo, escucha tonos de cada frecuencia y responde si percibe o no el tono. El software guarda sus respuestas y los umbrales digitales de cada frecuencia. No se piden canciones, encuestas de preferencia, A/B ni tareas de sonoridad relativa adicionales. Si hace falta comparar sonoridad en el futuro, deberá integrarse automáticamente en los tonos y ser simple, no convertirse en otra prueba compleja.

## 3. El resultado final es UN ecualizador práctico

Al finalizar, Hear calcula las ganancias de todas las bandas directamente a partir de tonos confirmados. **Algoritmo actual: `tone-relative-v3-experimental`**.

- Referencia: mediana de los umbrales digitales de las bandas directamente registradas y no discordantes del mismo perfil; requiere al menos dos bandas comparables.
- Una banda relativamente más difícil de detectar recibe una propuesta de refuerzo; una más fácil, una de reducción.
- Solo se utiliza una fracción de la diferencia digital, después de una zona muerta de 2–3 dBFS. Factor experimental 0,22; límite ±3 dB, y ±2 dB para frecuencias menores de 80 Hz o desde 12 kHz.
- El entorno registrado y las preferencias históricas de canciones no modifican la curva; el usuario puede editar manualmente cada ganancia. Las frecuencias no medidas, interpoladas o de oídos claramente discrepantes quedan neutras.
- Una curva 0 dB puede ser correcta si los datos están uniformes o incompletos. No se inventarán alteraciones para aparentar personalización.
- Se conservan mediciones originales, contexto y datos históricos en los perfiles existentes para compatibilidad. Copia, TXT, PNG y transferencia comparten la misma curva final.
- No confundir una ganancia de EQ en dB con la amplitud digital dBFS del tono ni con un ajuste de control físico sin escala conocida.

## Criterios de aceptación

- Terminar un test de frecuencias con diferencias detectables produce ganancias no nulas y **acotadas**, sin exigir música o nueva sesión.
- Las 4/5/7/10 bandas y las bandas personalizadas reciben recomendaciones sobre su propio formato.
- No se piden validaciones adicionales después del test; el único EQ es visible y editable de inmediato.
- Los resultados pueden copiarse y exportarse. Los límites/posiciones del equipo solo se convierten si se conoce su equivalencia.
- Se conservan seguridad del audio, accesibilidad, localización y compatibilidad con perfiles anteriores. El software no se presenta como diagnóstico ni calibración SPL.

La decisión es estable hasta que el usuario solicite expresamente otro enfoque.
