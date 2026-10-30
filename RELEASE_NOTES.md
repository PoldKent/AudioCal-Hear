# AudioCal Hear v1.7.0 — Smarter Tonal Balance (Public Preview)

**English** · [Español](#español)

**Official app / Aplicación:** https://poldkent.github.io/AudioCal-Hear/

**Version / Versión:** v1.7.0 · **Status / Estado:** Public pre-release / Versión preliminar pública

## English

**Hear. Adjust. Enjoy.**

AudioCal Hear v1.7.0 introduces **Smart Tonal Balance**, an optional music-listening process that helps you choose both positive and negative equalizer corrections without assuming that a tone you can still hear must be reduced.

### What's new

- **Two-step A/B comparisons:** compare the selected EQ band with your own local music. The second comparison reverses A/B order to help check consistency.
- **Conservative, bidirectional adjustments:** matching choices produce a ±2 dB change; one directional and one neutral answer produce ±1 dB. Conflicting or equal choices leave the band unchanged. Repeat confirmed adjustments to reach a maximum total cut of −6 dB; additional boosts are capped at +3 dB.
- **Honest threshold handling:** hearing a descending test tone at the lowest digital level is recorded as such, not treated as proof that the frequency is excessively loud.
- **Profile compatibility:** existing local profiles remain available. Hearing thresholds, musical preferences and confirmed tonal changes are tracked separately.
- **Ready for phones and desktops:** eight languages, responsive layouts and the preset 7-band/10-band equalizers remain available.

### How to try it

1. Open the [official web app](https://poldkent.github.io/AudioCal-Hear/) and connect the headphones or speakers using your phone's audio settings.
2. Choose a saved device profile, open **EQ Settings → Smart Tonal Balance** and play a familiar music file.
3. Listen to both A and B at a comfortable, unchanged volume and answer twice.
4. Compare the resulting curve with EQ bypassed; manually transfer the suggested values to external headphone/car equalizers.

### Safety, privacy, and release status

**Never test at maximum volume.** The app is an experimental subjective listening assistant — **not** a clinical hearing test, hearing aid or calibrated acoustic instrument. A/B variants are not guaranteed to be matched for *perceived loudness*, and improvements are not guaranteed. Real-device Bluetooth/audio validation remains outstanding.

Profiles and preference data are currently stored in your browser; the selected local music file is processed locally. The project is publicly visible but proprietary. Review [Rights](LICENSE.md), [Terms](TERMS.md) and [Privacy](PRIVACY.md).

---

## Español

**Escucha. Ajusta. Disfruta.**

AudioCal Hear v1.7.0 incorpora **Equilibrio tonal inteligente**, una evaluación musical opcional para elegir aumentos y reducciones de ecualización sin asumir que seguir oyendo un pitido significa que esa frecuencia está demasiado fuerte.

### Novedades

- **Comparación A/B en dos etapas:** selecciona una banda y escucha variaciones con tu propia música. La segunda comparación invierte el orden de A y B para comprobar la consistencia.
- **Correcciones conservadoras en ambas direcciones:** dos elecciones coherentes generan ±2 dB; una elección y una respuesta neutral producen ±1 dB. Las respuestas contradictorias o iguales no modifican la banda. Las reducciones acumuladas tienen un límite de −6 dB y los aumentos adicionales de +3 dB.
- **Umbrales sin conclusiones inventadas:** si todavía escuchas un tono en el último nivel, se registra ese resultado, sin reducir automáticamente la frecuencia.
- **Compatibilidad de perfiles:** se conservan las calibraciones anteriores y se registran por separado los umbrales, preferencias musicales y correcciones confirmadas.
- **Móvil y escritorio:** ocho idiomas, interfaz adaptable y ecualizadores preconfigurados de 7 y 10 bandas, entre otros formatos.

### Cómo probarla

1. Abre la [aplicación oficial](https://poldkent.github.io/AudioCal-Hear/) y conecta el equipo desde los ajustes de sonido del teléfono.
2. Abre un perfil y entra en **Ajustes → Equilibrio tonal inteligente**; reproduce una canción conocida.
3. Escucha ambas versiones A y B a volumen cómodo y constante, y responde las dos comparaciones.
4. Compara el resultado con la ecualización desactivada e introduce manualmente los valores en los equipos externos.

### Seguridad, privacidad y estado del lanzamiento

**Nunca utilices el volumen máximo.** Se trata de una herramienta experimental de percepción auditiva, **no** de una prueba clínica, audífono terapéutico ni instrumento acústico calibrado. No se garantiza la igualación exacta de *sonoridad percibida* en las comparaciones ni una mejora para todos los equipos. La validación con dispositivos Bluetooth reales sigue pendiente.

Los perfiles y preferencias se guardan en el navegador y los archivos musicales seleccionados se procesan localmente. El repositorio es público para consulta, pero propietario. Consulta [Derechos](LICENSE.md), [Condiciones](TERMS.es.md) y [Privacidad](PRIVACY.es.md).

---

For earlier changes / Versiones anteriores: [CHANGELOG.md](CHANGELOG.md) · [CHANGELOG.es.md](CHANGELOG.es.md)
