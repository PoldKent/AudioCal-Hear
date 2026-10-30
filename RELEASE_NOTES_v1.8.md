# AudioCal Hear v1.8.0 — Adaptive Hearing Experience

**Public preview / Versión preliminar pública** · [English](#english) · [Español](#español)

**Try the app / Abrir aplicación:** https://poldkent.github.io/AudioCal-Hear/

## English

**AudioCal Hear v1.8.0** introduces a more guided, explicit and configurable listening test while preserving the universal equalizer features.

### What's new

- **New digital test range: −24 to −84 dBFS.** The default starts at **−36 dBFS**, not at the louder end; changing the starting level toward −24 requires explicit safety confirmation. The user can also customize the minimum test level.
- **Explicit listening answers:** “Yes, I heard it” and “No, I couldn't hear it.” The test never assumes an unanswered tone was audible.
- **Adaptive, time-saving algorithm:** locate an interval in steps up to **12 dB**, then narrow it to approximately **1 dB** and repeat two confirmation tones. Each playback is up to 3 seconds, and automatic tone playback is capped at 60 seconds per frequency for the first search (time spent choosing answers is additional).
- **“I could still hear it” at the floor:** if the test reaches the minimum level with audible tones, that fact is recorded without automatically reducing the EQ.
- **Guided preparation:** device fitting, a quiet-environment reminder, and safety instructions before testing.
- **Optional microphone check:** reports relative background activity, not calibrated acoustic dB SPL. Microphone access is optional, and sampled audio is not recorded or uploaded by the app.
- **Fast / complete coverage:** the fast mode samples up to six representative bands and labels untested bands as estimates; complete mode tests all available center frequencies. A high-band-count fast test may not provide sufficient data for automatic hearing-threshold EQ suggestions.
- **Separate-ear headphones mode by default:** visualize actual left/right digital thresholds independently, without presenting that chart as an audiogram.
- **Preserved compatibility:** 7-band automobile and 10-band headphones presets from the reference photos, additional 5/7/10/15/31-band layouts, custom frequencies and EQ gain limits, local profiles and eight interface languages.
- **Music comfort checks remain:** Smart Tonal Balance A/B decisions from v1.7 can recommend conservative EQ increases or reductions.

### Important hearing-safety limitations

**Never use maximum volume**, increase volume to chase an inaudible test tone, or conduct car-audio tests while driving. −24 to −84 dBFS describes **digital playback levels, not calibrated sound pressure at the ear**. Very weak tones can be masked by hardware/ambient noise; stronger digital tones can be uncomfortable depending on headphones and phone volume. Stop on pain, ringing or discomfort.

This is a **subjective, nonmedical** tool: it does not diagnose hearing loss, guarantee an EQ improvement or measure absolute room noise. The microphone check cannot establish how many acoustic dB SPL are present. Real-device Bluetooth and acoustic validation is still outstanding.

### Data and rights

Profiles remain in local browser storage. Microphone data is used only for a temporary relative noise indication; the current code does not save microphone recordings or transmit them to an AudioCal Hear server. GitHub Pages may process hosting metadata according to its policies.

The project is publicly accessible but **proprietary**, with rights reserved subject to applicable law and GitHub's terms. See [Rights](LICENSE.md), [Terms](TERMS.md) and [Privacy](PRIVACY.md).

---

## Español

**AudioCal Hear v1.8.0** incorpora un examen más guiado, interactivo y configurable, sin perder las funciones que permiten ecualizar diferentes equipos.

### Novedades

- **Nuevo rango de prueba digital de −24 a −84 dBFS.** Comienza de forma predeterminada en **−36 dBFS**; acercarse a −24 exige confirmar las advertencias de seguridad. También se puede elegir el límite inferior de la prueba.
- **Respuestas explícitas:** «Sí lo escucho» y «Ya no lo escucho». Una respuesta ausente nunca se interpreta como si el sonido hubiera sido audible.
- **Búsqueda adaptativa rápida:** saltos iniciales de hasta **12 dB**, ajuste fino de aproximadamente **1 dB** y dos tonos de confirmación. Cada tono dura hasta 3 segundos y la reproducción de búsqueda se limita a 60 segundos por frecuencia; las pausas para contestar no están incluidas.
- **«Lo seguía escuchando» al alcanzar el mínimo:** se registra ese resultado sin recomendar automáticamente reducir el EQ.
- **Preparación guiada:** colocación del equipo, lugar silencioso y advertencias de seguridad.
- **Comprobación opcional del micrófono:** solo muestra actividad ambiental relativa, **no** valores de dB SPL calibrados. No es obligatorio conceder acceso; el audio analizado no se graba ni se sube desde la app.
- **Modo rápido y completo:** el primero prueba hasta seis bandas representativas e identifica las no medidas como estimaciones; el segundo examina todas las frecuencias del ecualizador. El rápido puede quedarse corto para calcular compensación auditiva automática con ecualizadores de muchas bandas.
- **Auriculares por oído predeterminados:** gráfica de umbrales digitales realmente medidos del oído izquierdo y derecho, sin presentarla como audiometría médica.
- **Compatibilidad conservada:** ecualizadores originales de automóvil de 7 bandas y auriculares de 10, además de formatos de 5/7/10/15/31 bandas, bandas propias, límites de ganancia y perfiles locales; ocho idiomas.
- **Personalización musical:** continúa el equilibrio tonal inteligente A/B de la v1.7, capaz de recomendar incrementos o recortes prudentes.

### Seguridad y limitaciones

**Nunca hagas la prueba al volumen máximo**, aumentes el volumen para perseguir tonos inaudibles ni pruebes el sonido del automóvil mientras conduces. El rango −24 a −84 dBFS corresponde a **niveles digitales**, no a presión sonora acústica calibrada. El equipo puede ocultar tonos muy tenues y los más fuertes podrían ser molestos según los auriculares. Detén la prueba ante dolor, zumbidos o incomodidad.

Es una herramienta **subjetiva y no médica**: no diagnostica pérdida auditiva, no garantiza una mejoría ni mide el ruido ambiental absoluto. El micrófono no indica cuántos dB SPL hay en la habitación. Falta validar el comportamiento real con dispositivos Bluetooth y mediciones acústicas.

### Privacidad y derechos

Los perfiles permanecen en el navegador. El micrófono se usa solo para una indicación temporal de ruido relativo: la app actual no guarda grabaciones ni las envía a servidores de AudioCal Hear. GitHub Pages puede procesar datos técnicos de alojamiento.

El proyecto es público para consulta pero **propietario**, con derechos reservados conforme a la legislación aplicable y las condiciones de GitHub. Consulta [Derechos](LICENSE.md), [Condiciones](TERMS.es.md) y [Privacidad](PRIVACY.es.md).
