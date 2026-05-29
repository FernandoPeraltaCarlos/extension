# Plan: Fusionar "Partial search" y "Match special cases" en TAB-1

## Contexto

En el **TAB-1 (Link Finder)** existen dos checkboxes separados con comportamientos relacionados:

- **`partialSearch`** → en `matchesSearch` (`content.js:345`): decide `startsWith()` (parcial) vs `===` (exacto).
- **`specialCases`** → en `resolveUrl` (`content.js:271-321`): decide si se resuelven rutas relativas (`./`, `../`), protocol-relative (`//example.com`) y otras relativas.

Tenerlos separados no aporta valor: el usuario que quiere una búsqueda flexible normalmente quiere ambos. **Objetivo:** dejar **un solo checkbox** `partialSearch` con etiqueta **"Partial search"** que, al activarse, habilite **a la vez** la coincidencia parcial y la resolución de URLs especiales. Al desactivarlo: coincidencia exacta y sin casos especiales. Se **elimina** por completo el checkbox `specialCases`.

---

## Estrategia

Se conserva el id/clave existente **`partialSearch`** y se reutiliza su valor también donde antes se usaba `specialCases`. Así la persistencia previa del usuario sigue siendo válida y solo se elimina el flag `specialCases` de toda la cadena (HTML → popup.js → content.js).

---

## Cambios por archivo

### 1. `popup.html`

- **Eliminar** el bloque `form-group` del checkbox `specialCases` (~líneas 60-66).
- **Actualizar el hint** del checkbox `partialSearch` (~línea 57) para reflejar que ahora también cubre los casos especiales:
  ```html
  <p class="checkbox-hint">Allows partial matches (instead of exact) and includes relative paths (./, ../) and protocol-relative URLs (//example.com).</p>
  ```

### 2. `popup.js` (eliminar todo rastro de `specialCases`)

- **`DEFAULT_SETTINGS`** (~línea 6): eliminar `specialCases: false,`.
- **`handleSearch`** (~líneas 70, 90): eliminar la lectura `const specialCases = ...` y la propiedad `specialCases` del objeto `data`.
- **`loadSettings`** (~línea 225): eliminar la línea que restaura `specialCases`.
- **`saveSettings`** (~línea 323): eliminar `specialCases: ...`.
- **`setupAutoSave`** (~líneas 345, 355): eliminar la obtención del elemento `specialCases` y su `addEventListener`.

### 3. `content.js` (usar `partialSearch` donde se usaba `specialCases`)

- **`performSearch`** (~línea 39): quitar `specialCases` del destructuring de `data`.
- **`performSearch`** (~línea 59): pasar `partialSearch` en lugar de `specialCases` a `resolveUrl`:
  ```js
  const resolvedHref = resolveUrl(href, currentDomain, currentPath, partialSearch);
  ```
- **`resolveUrl`** (~línea 271): renombrar el parámetro `specialCases` → `partialSearch`. Las tres comprobaciones internas (`~líneas 283, 296, 310`) pasan a usar `partialSearch`. La lógica no cambia, solo la fuente del flag.

> `matchesSearch` ya usa `partialSearch` (`content.js:345`), no requiere cambios para esta fusión.

---

## Nota sobre persistencia

La clave `specialCases` guardada previamente en `chrome.storage.local` queda huérfana pero es inofensiva (`chrome.storage.local.get(DEFAULT_SETTINGS)` ya no la solicita). No requiere migración ni limpieza.

---

## Verificación (manual — el proyecto no tiene tests ni build)

1. Recargar la extensión en `chrome://extensions`.
2. Abrir el popup → TAB-1. Confirmar que **solo aparece un** checkbox "Partial search" y que **ya no existe** "Match special cases".
3. **Parcial + casos especiales activos:** en una página con enlaces relativos (`./doc`, `../x`, `//cdn.com/a`), marcar "Partial search", buscar un fragmento → deben resaltarse incluyendo los enlaces relativos/protocol-relative.
4. **Desactivado:** desmarcar "Partial search" → debe exigir coincidencia exacta y **no** resaltar enlaces relativos/protocol-relative.
5. **Persistencia:** alternar el checkbox, cerrar y reabrir el popup → debe conservar el estado.
6. Revisar la consola del content script y del popup por errores (especialmente `undefined` por referencias residuales a `specialCases`).
