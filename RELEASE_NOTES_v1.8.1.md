# AudioCal Hear v1.8.1 — Code Quality & Stability (Public Pre-release)

**English** · [Español](#español)

[Launch AudioCal Hear](https://poldkent.github.io/AudioCal-Hear/) · [Detailed audit](AUDIT.md) / [Auditoría](AUDIT.es.md)

## English

This is a **maintenance and reliability update** to v1.8.0. It retains all original 7-/10-band device presets, additional standard and custom EQs, eight interface languages and the adaptive −24…−84 dBFS hearing test.

### Changes

- Hardened local profile loading and JSON backup import: validate frequency bands, measurements and gains, reject malformed structures, and limit incoming backup files to 2 MB.
- Fixed quick-mode estimation so untested **interior** frequencies can be interpolated from actual measurements; mark those values as **estimated**, and never count them as measured evidence. No extrapolation outside the observed range or across gaps exceeding a frequency ratio of 5.
- Strengthened EQ output safety by estimating overlapping filter response across the equalizer rather than using just the strongest slider; added reserve headroom and kept the overall preamp stable during A/B comparisons and bypass.
- Restored audio-processing attachment when returning to the music player after navigation.
- Removed unused helper functions, stale timer state and redundant tone state, and cleaned up stopped audio nodes.
- Added localized feedback for the new estimation/import-safety messages.

### Validation

**12/12 headless browser regression checks passed**, including eight languages and screen sizes from narrow mobile to 21:9; targeted algorithm checks and playback after navigating away/back also passed. Source syntax checked. Real Bluetooth/acoustic validation remains outstanding.

**Safety:** This software is a subjective listening aid, not a medical hearing test. dBFS is not calibrated dB SPL. Keep playback low and comfortable. Never test at maximum volume or increase volume to pursue an inaudible tone.

[Proprietary rights](LICENSE.md) · [Terms](TERMS.md) · [Privacy](PRIVACY.md).

---

## Español

Esta es una actualización de **mantenimiento, depuración y estabilidad** de la v1.8.0. Se mantienen los ecualizadores originales de 7 y 10 bandas, los demás formatos, ocho idiomas y el examen adaptativo entre −24 y −84 dBFS.

### Cambios

- Validación de perfiles locales e importaciones JSON: frecuencias, medidas y ganancias controladas; se rechazan estructuras incorrectas y archivos de respaldo de más de 2 MB.
- Corregida la estimación de bandas internas no examinadas en modo rápido. Los valores derivados se muestran como **estimados**, no se cuentan como mediciones reales y no se extrapolan más allá de las observaciones ni sobre intervalos de frecuencia superiores a una relación de 5.
- Mayor protección de salida: se calcula el efecto conjunto de los filtros, no solo el deslizador mayor. Se reserva margen digital y se mantiene estable el preamplificador al comparar A/B o desactivar temporalmente el EQ.
- Reconexión del procesamiento musical cuando se vuelve al reproductor después de navegar por otras pantallas.
- Eliminación de funciones, contadores y referencias antiguas sin uso; limpieza de nodos de audio al detenerse.
- Mensajes de importación y estimación en los ocho idiomas.

### Verificación

**12 de 12 pruebas de regresión aprobadas** en navegador simulado, incluidos ocho idiomas y pantallas desde móviles estrechos hasta 21:9. También se comprobaron el algoritmo, la sintaxis y el reproductor tras cambiar de pantalla. Continúa pendiente la validación acústica real con equipos Bluetooth.

**Seguridad:** Es un asistente de escucha perceptiva, no una audiometría clínica. dBFS no equivale a dB SPL calibrados. Usa volumen bajo y cómodo; nunca al máximo ni lo subas para escuchar un tono inaudible.

[Derechos reservados](LICENSE.md) · [Condiciones](TERMS.es.md) · [Privacidad](PRIVACY.es.md).
