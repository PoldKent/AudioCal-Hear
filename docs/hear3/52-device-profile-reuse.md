# Hear 3 · Equipos y perfiles reutilizables

## Comportamiento del producto
El examen terminado presenta tres opciones antes del guardado:
1. **Crear equipo y perfil nuevos**: mantiene el flujo vigente.
2. **Añadir un perfil dentro de un equipo que ya existe**: reutiliza la identidad del equipo, crea solo el nuevo perfil y añade su primer resultado.
3. **Añadir un resultado a un perfil existente**: no duplica ni modifica las definiciones de equipo o perfil; solo añade el registro del nuevo examen.

La elección ocurre en el mismo formulario de guardado, sin otra app, nube, cuenta, migración automática ni pantallas experimentales. La selección de un perfil exige que las frecuencias **y los IDs de bandas** coincidan exactamente con los del examen finalizado; no se transforma ni atribuye evidencia de una banda diferente.

## Protecciones
- No hay almacenamiento nuevo durante la previsualización.
- El perfil/equipo elegido debe existir en el catálogo validado y la categoría debe coincidir.
- Un resultado nuevo exige un ID nuevo y distinto; no reemplaza resultados históricos.
- Se conservan todas las verificaciones de evidencia subjetiva, autorización de rango digital, opt-in separado de EQ provisional y confirmación explícita.
- El conflicto de revisión o cambio de cualquier dato del catálogo entre revisar y confirmar sigue bloqueando el guardado.
- La selección «crear un perfil en equipo existente» no inventa la respuesta del hardware a nuevas bandas.
- Los datos de Hear 2 no se tocan.

## Inicio inteligente
El atajo de vuelta muestra el perfil que tiene el **resultado con la fecha más reciente de todo el catálogo**, no simplemente el primer perfil activado. Esto solo altera la presentación, no el identificador `activeProfileId` que el usuario guardó.

## Validación
Pruebas Node comprueban los tres destinos de guardado y rechazan mismatches de frecuencias, categoría, ID y registros obsoletos. Playwright comprueba la selección contextual en móvil/escritorio, ausencia de escrituras y retorno al último perfil sin modificar la selección almacenada.

Sigue sin validación el EQ físico de equipos reales; continúa `stableReleaseClaim:false` y la seguridad acústica no puede inferirse de código o dBFS.
