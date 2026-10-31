# AudioCal Hear v1.9.0 — Guided EQ Transfer

**Public pre-release / Versión preliminar pública** · [English](#english) · [Español](#español)

**App:** https://poldkent.github.io/AudioCal-Hear/

## English

### Transfer your sound settings, without giving AudioCal access to other accounts

AudioCal Hear now includes **Apply my EQ settings**, a step-by-step assistant located beside the original music A/B comparison.

- **Keep local music A/B:** load your own audio file to listen to original versus AudioCal EQ. This feature is unchanged.
- **Choose the destination:** Spotify, YouTube Music or the actual equalizer in your headphones, speaker or car.
- **Choose Android, iPhone/iPad or desktop** for the streaming-app guidance; menus may vary by release, manufacturer and region.
- **Match the bands:** use the device profile, choose one of the reference 7/10-band or standard EQs, or type the actual frequency labels shown by your target equalizer.
- **Follow every step:** a large, readable guide states which frequency to move, whether to boost/cut/leave it at zero, and the suggested gain in dB.
- **Know what is approximate:** where different band positions permit a reasonable log-frequency interpolation, the guide labels the result **estimated**. It does not extrapolate past the tested/source range or across wide band gaps.
- **Respect device limits:** select your target EQ range; out-of-range gains are clamped and explicitly marked.
- **Copy all settings** for manual entry. The guide never writes to Spotify, YouTube Music, Bluetooth accessories or third-party apps.

**Spotify:** the official playback settings include an equalizer on supported Android/iOS/desktop versions; Android may route to a system-wide EQ. Spotify Connect may prevent changing local EQ for audio playing elsewhere. Official help: https://support.spotify.com/es/article/equalizer/

**YouTube Music:** Android may expose a system equalizer in Settings. iOS/desktop do not provide a universal, externally controllable EQ. If there is no accessible EQ menu, adjust sound in the headphone, speaker or device EQ instead. Availability changes by version.

**Safety and limitations:** two active equalizers may stack boosts and cause distortion. Use a low, comfortable volume and do not adjust car audio while driving. Gain recommendations are subjective and depend on the destination's filters (center frequency/Q, etc.); numeric equality does not guarantee identical sound across devices. dBFS used during hearing tests is not dB SPL.

All processing remains local. No third-party account access, OAuth tokens, tracking or streaming-audio capture was added. No existing local profiles were migrated or deleted.

## Español

### Lleva tus ajustes a Spotify, YouTube Music o a tu propio equipo

La nueva función **Aplicar mis ajustes** está junto a la comparación musical A/B e incluye un asistente paso a paso.

- **Se mantiene el archivo musical local:** sigue siendo la forma de escuchar la ecualización aplicada directamente por AudioCal.
- **Elige el destino:** Spotify, YouTube Music o el ecualizador de tus auriculares, parlantes o automóvil.
- **Indica Android, iPhone/iPad o computadora** para encontrar la configuración cuando corresponda.
- **Comprueba las frecuencias reales:** reutiliza las bandas de tu perfil, selecciona el ecualizador de 7/10 bandas, elige otro estándar o escribe las frecuencias que aparecen en la pantalla del equipo.
- **Ajusta banda por banda:** la guía te indica la frecuencia y cuánto subir, bajar o dejar en 0 dB.
- **Distingue equivalencias:** los valores trasladados a otras frecuencias se identifican como **aproximados**. Si falta referencia fiable, indica **no modificar**.
- **Respeta los límites de ganancia:** puedes elegir el rango que permite el ecualizador y se advierte si un ajuste fue limitado.
- **Copia la lista completa** para introducir los valores manualmente.

La aplicación **no controla automáticamente Spotify, YouTube Music ni los ecualizadores externos**. Spotify dispone de EQ en sus ajustes de reproducción en plataformas compatibles; Android puede abrir el del sistema y Spotify Connect tiene restricciones. YouTube Music puede mostrar un EQ en Android, pero depende del equipo. Si no existe, utiliza el ecualizador del fabricante o del teléfono.

**Seguridad:** no actives a la vez la misma corrección en varias aplicaciones o dispositivos; las ganancias se acumulan y pueden distorsionar el sonido. No ajustes el automóvil mientras conduces. Las bandas y el ancho de los filtros pueden diferir entre ecualizadores, por lo que trasladar los mismos dB no garantiza exactamente el mismo sonido.

No se añadieron conexiones a cuentas, permisos de streaming, seguimiento, reproducción protegida ni cambios en los perfiles guardados.

[Derechos](LICENSE.md) · [Privacidad](PRIVACY.es.md) · [Condiciones](TERMS.es.md)
