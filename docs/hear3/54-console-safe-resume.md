# Hear 3 · Reanudar sin abandonar el panel principal

Cuando el motor deja un examen en pausa, el panel sencillo presenta la confirmación de seguridad exigida por el examen: **«He comprobado la salida de audio y mantendré el volumen físico bajo y cómodo»**.

- La casilla está sincronizada con el control del motor original `route-verified`; no crea comprobaciones ficticias de hardware.
- El botón contextual «Reanudar mi examen» permanece desactivado hasta que la persona marca la casilla. El motor vuelve a verificar ese estado cuando se solicita reanudar.
- Una pausa, verificación o reanudación **no reproduce tonos automáticamente**. Es necesario pulsar la acción de reproducción correspondiente posteriormente.
- Si se marca o desmarca el control original, el panel se actualiza.
- El panel no altera respuestas previas, niveles digitales, validación acústica ni historiales de otros dispositivos.

Verificaciones: dos regresiones de navegador para interrupción manual, sincronía de casillas, acción bloqueada sin confirmación y ausencia de nuevas reproducciones al reanudar. No reemplaza la evaluación de salida Bluetooth, volumen físico ni D-063.

La interfaz pública sigue siendo la misma aplicación. No se añade selector, ruta piloto ni proceso de calibración automática.
