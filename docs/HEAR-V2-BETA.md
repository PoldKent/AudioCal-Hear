# AudioCal Hear 2.0 — BETA para pruebas reales

Esta beta incluye los cambios de las PR #22 → #23 → #24 → #25, pero **todavía no es una audiometría clínica ni una calibración acústica certificada**. La versión publicada en GitHub Pages continúa sin modificarse.

## Descarga e inicio en Windows

1. Abre la [PR #25](https://github.com/PoldKent/AudioCal-Hear/pull/25) y entra en **Checks**. Busca **AudioCal Hear 2.0 beta bundle** y descarga el artefacto **AudioCal-Hear-2-0-Beta** cuando la comprobación aparezca en verde. Se descarga como ZIP.
2. Extrae el ZIP completo en una carpeta nueva (por ejemplo, `Descargas\AudioCal-Hear-Beta`). No lo ejecutes dentro del ZIP.
3. Haz doble clic en **start-beta.cmd**. Solo requiere Node.js 20 o superior, que también puede comprobarse con `node --version`. No hace falta instalar npm packages ni tener una cuenta.
4. Abre **http://127.0.0.1:8765/** en el navegador de **esta misma computadora**. Mantén abierta la ventana de la terminal mientras haces la prueba; Ctrl+C detiene el servidor.
5. Si `start-beta.cmd` no abre la beta, utiliza PowerShell dentro de esa carpeta: `node serve-beta.mjs`, y visita la misma dirección.

**Alternativa para desarrolladores:** descarga la rama `feat/hear-v2-inline-loudness`, ejecuta `npm run beta` desde la raíz del proyecto y abre http://127.0.0.1:8765/.

El servidor responde únicamente en `127.0.0.1` (tu computadora) y sirve el HTML de la app. No ofrece endpoints de importación remota ni envía datos de tus perfiles a GitHub. A diferencia del sitio publicado, su almacenamiento es independiente porque utiliza un origen distinto.

## Antes de hacer el test

1. En la versión publicada, abre **Mis perfiles → Respaldo de perfiles → Exportar todo** y guarda el JSON. No borres nada.
2. En la beta, entra en **Mis perfiles → Respaldo de perfiles → Importar JSON** e importa **una copia**. No se modificará el perfil del sitio publicado. Si prefieres, crea un perfil nuevo para tus auriculares.
3. Conecta los auriculares al mismo ordenador, configura el volumen físico **bajo, cómodo y constante** y comprueba los canales izquierdo y derecho.
4. El barrido previo es **opcional**. Puedes contestar «Lo escucho / No lo escucho», pero ese mapa no se convierte directamente en ganancias ni demuestra la capacidad independiente del oído o del equipo.
5. Realiza la prueba de umbrales. Las comparaciones de sonoridad de cada frecuencia son opcionales y se registran aparte.

## Comprobar el resultado HearID-like

1. Después del examen, abre **Resultados**: debe haber **un único ecualizador**, con las bandas de tu equipo y un indicador de calidad de las estimaciones.
2. Si aparece una propuesta automática, puedes aplicarla y editar las bandas. Si no hay evidencia suficiente, es correcto que algunas permanezcan a **0 dB**.
3. Exporta una imagen PNG o TXT y verifica que refleje los ajustes actuales. Comprueba que la gráfica de mediciones no cambie al editar.
4. Expande **Comparar con música**, carga una canción local y alterna **EQ activado / desactivado**, sin cambiar el volumen de los auriculares. Escucha al menos dos segundos cada modo. Puedes registrar **Mejor / Igual / Peor**.
5. Recarga la beta y verifica que los cambios permanecen. Si cambias las ganancias, la opinión auditiva anterior debería perder vigencia hasta repetir la comparación.

Para comparar de forma más objetiva, es preferible igualar la sonoridad percibida: el modo que suena más fuerte puede parecer mejor sin serlo realmente.

## Reporte de prueba

Indica en [el issue #26](https://github.com/PoldKent/AudioCal-Hear/issues/26): dispositivo, navegador/OS, bandas, umbrales registrados, si hubo bandas neutras, ajustes aplicados y si preferiste mejor/igual/peor. Si compartes capturas, evita datos personales, archivos de música o grabaciones de tu audición.

### Limitaciones

- El reproductor integrado aplica la EQ dentro de Hear; **no controla Spotify, otros programas, Soundcore u otros equipos externos**.
- El micrófono se pide solo en los flujos opcionales que lo requieren y no produce mediciones calibradas en dB SPL.
- La beta local no estará disponible desde otro celular conectado por Wi-Fi. Esa modalidad necesita una publicación HTTPS separada.
- No subas el volumen para escuchar frecuencias que no percibes. Detén cualquier prueba ante molestia, dolor, zumbidos o distorsión.

Versión técnica: rama `feat/hear-v2-inline-loudness`, publicada como artefacto de GitHub Actions; identifica el SHA exacto en la página de esa ejecución.
