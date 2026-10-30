# AudioCal Hear

[English](README.md) | **Español**

Asistente web de calibración auditiva perceptiva y generación de recomendaciones de ecualización para audífonos, parlantes y sistemas de audio de automóvil.

**Versión:** 1.4 · **Idioma:** español · **Tecnología:** HTML, CSS, JavaScript y Web Audio API (sin dependencias externas).

## Ejecutar en celular

- Abre `index.html` en un navegador compatible. Para evitar las restricciones de algunos visores de archivos, también puedes publicar el mismo archivo por HTTPS (por ejemplo, con GitHub Pages).
- Conecta los auriculares, parlantes o el automóvil en la **configuración Bluetooth del teléfono**, antes de empezar. El navegador utiliza la salida del sistema; no identifica ni cambia automáticamente dispositivos Bluetooth.
- Selecciona el ecualizador, los canales y las repeticiones. La pantalla **Configuración** muestra el número de pruebas, un escenario orientativo de duración y el tiempo máximo del barrido.
- Comprueba el sonido a volumen bajo y estable; después inicia el examen. Primero desciende en pasos de **hasta 6 dB cada 3 segundos**. Pulsa cuando deje de escucharse; la app afina con pasos de **1 dB cada 3 segundos**.
- Consulta **Ajustes** para ver los valores estimados, o compara con tu propio archivo de música en la app. Copia los ajustes al ecualizador del dispositivo manualmente.

## Novedades v1.4: preferencias musicales y resultados más claros

- La pantalla de resultados diferencia las **pruebas terminadas** de las **frecuencias con un umbral utilizable**. Si faltan datos, permite repetir solo esas frecuencias.
- Añadimos una comparación opcional **A/B con tu propia música**: tres rondas para elegir graves, voces y brillo algo más suaves o destacados, o marcar «Iguales». Se guardan esas preferencias aparte de los umbrales auditivos.
- Para comparar, elige un archivo de audio local, **reprodúcelo**, escucha **A y B** y selecciona la versión que te resulte más cómoda. Los ajustes son moderados, de hasta ±2 dB por zona y por decisión. No existe garantía de mejora ni una igualación de sonoridad clínicamente calibrada.
- La compensación basada en umbrales se desactiva si menos del 60% de las frecuencias tienen resultados utilizables (criterio preventivo del proyecto, **no** un estándar de audiometría). Siguen disponibles las preferencias y los ajustes manuales.
- Los cambios manuales ya no detienen el reproductor. La advertencia sobre el rango provisional ±6 dB solo aparece al elegir el **ecualizador de automóvil de 7 bandas**.
- **Nunca utilices el volumen máximo** para realizar la prueba. La OMS aconseja no superar el 60% del volumen máximo del dispositivo en el uso personal habitual; ese porcentaje no equivale a una medición real de dB SPL. Usa un nivel bajo y cómodo, mantenlo fijo y no lo aumentes para perseguir tonos que no oyes.
- La aplicación no modifica automáticamente los ecualizadores del vehículo o los auriculares; los valores deben introducirse manualmente. No reutilices el perfil de un dispositivo para otro sin comprobarlo.

## Ecualizadores precargados

| Perfil | Frecuencias centrales (Hz) |
| --- | --- |
| Automóvil 7 bandas (fotografías del proyecto) | 64, 160, 400, 1000, 2500, 6250, 15625 |
| Auriculares 10 bandas (fotografía del proyecto) | 30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| 7 bandas habitual | 63, 160, 400, 1000, 2500, 6300, 16000 |
| 10 bandas ISO (octavas) | 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| Otros | 5, 15, 31 bandas y selección personalizada |

La escala de ganancia del automóvil se configuró provisionalmente en ±6 dB. La fotografía verifica +6, pero no determina todo el rango de la radio; puedes cambiar los límites desde Configuración.

## Examen rápido: máximo 57 segundos por frecuencia y oído

El barrido inteligente mantiene **3 segundos de escucha por nivel**, pero salta los niveles innecesarios.

| Etapa | Saltos | Máximo |
| --- | --- | ---: |
| Búsqueda rápida | −28, −34, −40, −46, −52, −58, −64, −68 dBFS (hasta 6 dB por paso) | 8 × 3 = **24 s** |
| Ajuste fino | Un máximo de seis pasos de 1 dB en la zona del umbral | 6 × 3 = **18 s** |
| Verificación opcional | Hasta cinco pasos de 1 dB alrededor del primer umbral | 5 × 3 = **15 s** |
| **Total** | | **57 s** |

Si no se encuentra el umbral a tiempo, la prueba queda **sin determinar**, sin inventar valores. El límite corresponde únicamente al **audio reproducido automáticamente**; no cuenta pausas, repeticiones manuales ni el tiempo entre pulsaciones. Examinar los oídos por separado duplica las combinaciones de frecuencia/oído.

| Ambos canales juntos | Máximo con 1 pasada | Máximo con 2 pasadas |
| --- | ---: | ---: |
| Automóvil, 7 bandas | 4 min 54 s | **6 min 39 s** |
| Auriculares, 10 bandas | 7 min | **9 min 30 s** |

La configuración inicial utiliza **una pasada**. El aviso de duración se adapta a las bandas, canales y repeticiones seleccionadas. No constituye audiometría médica ni una medición acústica calibrada.

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
