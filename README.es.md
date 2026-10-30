# AudioCal Hear

[English](README.md) | **Español**

Asistente web de calibración auditiva perceptiva y generación de recomendaciones de ecualización para audífonos, parlantes y sistemas de audio de automóvil.

**Versión:** 1.2 · **Idioma:** español · **Tecnología:** HTML, CSS, JavaScript y Web Audio API (sin dependencias externas).

## Ejecutar en celular

- Abre `index.html` en un navegador compatible. Para evitar las restricciones de algunos visores de archivos, también puedes publicar el mismo archivo por HTTPS (por ejemplo, con GitHub Pages).
- Conecta los auriculares, parlantes o el automóvil en la **configuración Bluetooth del teléfono**, antes de empezar. El navegador utiliza la salida del sistema; no identifica ni cambia automáticamente dispositivos Bluetooth.
- Selecciona el ecualizador, los canales y las repeticiones. La pantalla **Configuración** muestra el número de pruebas, un escenario orientativo de duración y el tiempo máximo del barrido.
- Comprueba el sonido a volumen bajo y estable; después inicia el examen. Cada nivel se mantiene **3 segundos** y desciende **1 dB digital**; marca cuando ya no oigas el tono.
- Consulta **Ajustes** para ver los valores estimados, o compara con tu propio archivo de música en la app. Copia los ajustes al ecualizador del dispositivo manualmente.

## Ecualizadores precargados

| Perfil | Frecuencias centrales (Hz) |
| --- | --- |
| Automóvil 7 bandas (fotografías del proyecto) | 64, 160, 400, 1000, 2500, 6250, 15625 |
| Auriculares 10 bandas (fotografía del proyecto) | 30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| 7 bandas habitual | 63, 160, 400, 1000, 2500, 6300, 16000 |
| 10 bandas ISO (octavas) | 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| Otros | 5, 15, 31 bandas y selección personalizada |

La escala de ganancia del automóvil se configuró provisionalmente en ±6 dB. La fotografía verifica +6, pero no determina todo el rango de la radio; puedes cambiar los límites desde Configuración.

## Duración del examen

El barrido consta de 41 niveles digitales, desde −28 hasta −68 dBFS, con 3 segundos por nivel. Así, cada muestra dura **como máximo 123 segundos**, pero normalmente terminará antes si el usuario marca su umbral. La duración exacta no se puede conocer antes de escuchar el tono.

La aplicación muestra un escenario de referencia calculado con **30–45 segundos por tono** (es una hipótesis ilustrativa, no una predicción de la audición del usuario), junto con el máximo matemático del barrido. Al disponer de dos o más muestras, calcula una orientación personalizada usando las duraciones observadas. Pausas y repeticiones manuales no están incluidas.

Ejemplos con ambos canales juntos y 2 repeticiones:

- Auto 7 bandas: 14 muestras; escenario de referencia 7–10 min 30 s; máximo 28 min 42 s de tonos.
- Auriculares 10 bandas: 20 muestras; escenario de referencia 10–15 min; máximo 41 minutos de tonos.

## Publicar con GitHub Pages

1. Crea un repositorio GitHub, por ejemplo `AudioCal-Hear`.
2. Sube los archivos de este proyecto al directorio raíz de la rama `main`, especialmente `index.html`.
3. En el repositorio, abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**, `main` y `/(root)`; guarda.
5. GitHub Pages mostrará la URL publicada cuando finalice el despliegue. Ábrela desde el celular.

GitHub Pages y sus requisitos de visibilidad dependen de la configuración y el plan de la cuenta.

## Privacidad y limitaciones

- Los perfiles se conservan en `localStorage` del navegador donde se crean. Puedes exportarlos/importarlos en JSON.
- El archivo de música elegido para la comparación A/B se procesa dentro del navegador; no se sube a un servidor de AudioCal Hear.
- Los dBFS mostrados son **niveles digitales**, no medidas acústicas de dB SPL. Los resultados **no son una audiometría ni una calibración acústica objetiva**.
- Usa un volumen bajo y cómodo, no lo aumentes para buscar tonos inaudibles, y detén el examen si notas molestias.
- Los ecualizadores del automóvil o de los auriculares no se modifican automáticamente: los resultados se transfieren manualmente.

## Estructura

- `index.html` — aplicación completa de archivo único.
- `README.md` — instrucciones principales en inglés.
- `README.es.md` — instrucciones en español.
- `CHANGELOG.md` / `CHANGELOG.es.md` — historial de versiones en inglés y español.
- `CONTRIBUTING.md` / `CONTRIBUTING.es.md` — cómo proponer cambios y quién puede editarlos.
