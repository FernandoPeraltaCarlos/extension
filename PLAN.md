# Plan: Document Search — Tab 3

## Contexto

La extensión tiene dos tabs activas (Link Finder, Text Cleaner) y cuatro placeholders (tabs 3-6).
Se implementa Tab 3 como **"Doc Search"** basada en esta lógica JS:

```javascript
let attach = Array.from(document.querySelectorAll("aside a"));
let links  = Array.from(document.querySelectorAll("a"));
let colors = ["red","blue","gray","green","brown","yellow","pink"];

links.forEach((link, linkIndex) => {
  attach.forEach((element, elementIndex) => {
    if (link.href === element.href) {
      link.style.backgroundColor  = colors[elementIndex];
      element.style.backgroundColor = colors[elementIndex];
    }
  });
});
```

Lógica: se compara un **grupo de referencia** (`attach` selector) contra un **grupo del body** (`links` selector). Cada elemento del grupo de referencia recibe un color único; cuando un elemento del body comparte el mismo `href`, recibe ese mismo color, permitiendo ver visualmente qué ítems del sidebar/nav aparecen en el cuerpo.

---

## Requerimientos

1. Ambos selectores son configurables desde el popup (defaults: `aside a` y `a`).
2. Tras escanear, el popup lista cada elemento del selector de referencia para que el usuario configure **color** y **font size** individualmente (defaults: los 7 colores originales en orden, 14px).

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `popup.html` | Reemplazar placeholder Tab 3; renombrar botón a "Doc Search" |
| `popup.js` | Extender DEFAULT_SETTINGS, loadSettings, saveSettings, setupAutoSave; agregar setupDocSearch; reutilizar `ensureContentScript()` también en Link Finder |
| `content.js` | Agregar handlers docSearch:scan, docSearch:apply, docSearch:clear; evitar reinyección duplicada y manejar selectores inválidos |
| `popup.css` | Estilos para la lista de ítems |

---

## 1. `popup.html`

- Botón de tab: cambiar `Function 3` → `Doc Search`
- Reemplazar el `<div id="tab3">` placeholder con:

```html
<div id="tab3" class="tab-panel">
  <h2>Doc Search</h2>

  <div class="form-group">
    <label for="dsAttachSelector">Reference selector:</label>
    <input type="text" id="dsAttachSelector" placeholder="aside a">
  </div>

  <div class="form-group">
    <label for="dsLinksSelector">Body selector:</label>
    <input type="text" id="dsLinksSelector" placeholder="a">
  </div>

  <div class="button-group">
    <button id="dsScanBtn" class="btn btn-primary">Scan</button>
    <button id="dsApplyBtn" class="btn btn-primary" disabled>Apply</button>
    <button id="dsClearBtn" class="btn btn-secondary">Clear</button>
  </div>

  <div id="dsItemList" class="ds-item-list"></div>
  <div id="dsMessage" class="result-message"></div>
</div>
```

---

## 2. `popup.js` — cambios detallados

### 2a. DEFAULT_SETTINGS — agregar campos

```javascript
dsAttachSelector: 'aside a',
dsLinksSelector: 'a',
```

Los colores/tamaños por ítem son page-specific → no se persisten.

### 2b. loadSettings() — restaurar selectores

```javascript
document.getElementById('dsAttachSelector').value = settings.dsAttachSelector;
document.getElementById('dsLinksSelector').value  = settings.dsLinksSelector;
```

### 2c. saveSettings() — incluir selectores

```javascript
dsAttachSelector: document.getElementById('dsAttachSelector')?.value || 'aside a',
dsLinksSelector:  document.getElementById('dsLinksSelector')?.value  || 'a',
```

### 2d. setupAutoSave() — agregar listeners

```javascript
const dsAttachSelector = document.getElementById('dsAttachSelector');
const dsLinksSelector  = document.getElementById('dsLinksSelector');
if (dsAttachSelector) dsAttachSelector.addEventListener('input', saveSettings);
if (dsLinksSelector)  dsLinksSelector.addEventListener('input', saveSettings);
```

### 2e. setupDocSearch() — función principal

```javascript
const DS_COLORS       = ['red','blue','gray','green','brown','yellow','pink'];
const DS_DEFAULT_SIZE = 14;

function setupDocSearch() {
  const scanBtn  = document.getElementById('dsScanBtn');
  const applyBtn = document.getElementById('dsApplyBtn');
  const clearBtn = document.getElementById('dsClearBtn');
  if (!scanBtn || !applyBtn || !clearBtn) return;

  scanBtn.addEventListener('click',  handleDsScan);
  applyBtn.addEventListener('click', handleDsApply);
  clearBtn.addEventListener('click', handleDsClear);
}
```

### 2f. handleSearch() — usar ensureContentScript()

El flujo de Link Finder también debe evitar reinyectar `content.js`, porque comparte el mismo content script con Doc Search. Reemplazar el `chrome.scripting.executeScript(...)` directo dentro de `handleSearch()` por:

```javascript
await ensureContentScript(tab.id);
```

Con esto, buscar desde Tab 1 después de usar Doc Search, o repetir búsquedas en la misma pestaña, no redeclara las variables top-level de `content.js`.

### 2g. handleDsScan()

```javascript
async function handleDsScan() {
  const attachSelector = document.getElementById('dsAttachSelector').value.trim() || 'aside a';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'docSearch:scan', selector: attachSelector
    });
    if (response?.error) {
      showDsMessage(response.error, 'error');
      return;
    }
    if (response?.items?.length) {
      renderDsItemList(response.items);
      document.getElementById('dsApplyBtn').disabled = false;
      showDsMessage(`Found ${response.items.length} element(s)`, 'success');
    } else {
      document.getElementById('dsItemList').innerHTML = '';
      document.getElementById('dsApplyBtn').disabled = true;
      showDsMessage('No elements matched the selector', 'info');
    }
  } catch (err) {
    console.error(err);
    showDsMessage('Error scanning the page', 'error');
  }
}
```

### 2h. renderDsItemList()

```javascript
function renderDsItemList(items) {
  const list = document.getElementById('dsItemList');
  list.innerHTML = '';
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'ds-item-row';
    row.dataset.index = i;

    const label = document.createElement('span');
    label.className = 'ds-item-label';
    label.textContent = item.text || item.href || `Item ${i + 1}`;
    label.title = item.href;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = colorNameToHex(DS_COLORS[i % DS_COLORS.length]);

    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.value = DS_DEFAULT_SIZE;
    sizeInput.min = 8;
    sizeInput.max = 72;

    row.append(label, colorInput, sizeInput);
    list.appendChild(row);
  });
}

function colorNameToHex(name) {
  const map = {
    red:'#FF0000', blue:'#0000FF', gray:'#808080',
    green:'#008000', brown:'#A52A2A', yellow:'#FFFF00', pink:'#FFC0CB'
  };
  return map[name] || '#FF0000';
}
```

### 2i. handleDsApply()

```javascript
async function handleDsApply() {
  const attachSelector = document.getElementById('dsAttachSelector').value.trim() || 'aside a';
  const linksSelector  = document.getElementById('dsLinksSelector').value.trim()  || 'a';
  const rows = document.querySelectorAll('#dsItemList .ds-item-row');
  const itemConfigs = Array.from(rows).map(row => ({
    color:    row.querySelector('input[type="color"]').value,
    fontSize: row.querySelector('input[type="number"]').value
  }));

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'docSearch:apply', attachSelector, linksSelector, itemConfigs
    });
    if (response?.error) {
      showDsMessage(response.error, 'error');
      return;
    }
    if (response?.count !== undefined) {
      showDsMessage(
        response.count > 0 ? `Highlighted ${response.count} match(es)` : 'No matches found',
        response.count > 0 ? 'success' : 'info'
      );
    }
  } catch (err) {
    console.error(err);
    showDsMessage('Error applying highlights', 'error');
  }
}
```

### 2j. ensureContentScript()

Evitar inyectar `content.js` más de una vez en la misma página. La reinyección puede romper los flujos `Scan` → `Apply`, búsquedas repetidas en Link Finder, o uso cruzado entre Tab 1 y Tab 3, porque `content.js` declara variables top-level con `let`.

```javascript
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (err) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}
```

### 2k. handleDsClear()

```javascript
async function handleDsClear() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'docSearch:clear' });
    if (response?.success) showDsMessage('Highlights cleared', 'success');
  } catch (err) {
    showDsMessage('Nothing to clear', 'info');
  }
}
```

### 2l. showDsMessage()

```javascript
function showDsMessage(message, type) {
  const el = document.getElementById('dsMessage');
  if (!el) return;
  el.textContent = message;
  el.className = `result-message show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}
```

### 2m. DOMContentLoaded — agregar llamada

```javascript
setupDocSearch();   // junto a setupTextCleaner()
```

---

## 3. `content.js` — cambios

### 3a. Array separado para highlights de DocSearch

```javascript
let dsHighlightedElements = [];   // al inicio del archivo
```

### 3b. Nuevos cases en el onMessage listener

```javascript
} else if (request.action === 'ping') {
  sendResponse({ success: true });

} else if (request.action === 'docSearch:scan') {
  try {
    const elements = Array.from(document.querySelectorAll(request.selector || 'aside a'));
    const items = elements.map(el => ({
      href: el.href || '',
      text: (el.textContent || '').trim().slice(0, 80)
    }));
    sendResponse({ items });
  } catch (err) {
    sendResponse({ error: 'Invalid reference selector' });
  }

} else if (request.action === 'docSearch:apply') {
  const result = dsApplyHighlights(request.attachSelector, request.linksSelector, request.itemConfigs);
  sendResponse(result);

} else if (request.action === 'docSearch:clear') {
  dsClearHighlights();
  sendResponse({ success: true });
}
```

### 3c. dsApplyHighlights()

```javascript
function dsApplyHighlights(attachSelector, linksSelector, itemConfigs) {
  dsClearHighlights();

  let attach;
  let links;
  try {
    attach = Array.from(document.querySelectorAll(attachSelector || 'aside a'));
    links  = Array.from(document.querySelectorAll(linksSelector  || 'a'));
  } catch (err) {
    return { error: 'Invalid selector' };
  }

  let count = 0;
  const styledElements = new Set();

  attach.forEach((el, i) => {
    const cfg = itemConfigs[i] || {};
    applyDsStyle(el, cfg.color, cfg.fontSize);
    styledElements.add(el);
  });

  links.forEach(link => {
    attach.forEach((el, i) => {
      if (link.href && link.href === el.href && link !== el && !styledElements.has(link)) {
        const cfg = itemConfigs[i] || {};
        applyDsStyle(link, cfg.color, cfg.fontSize);
        styledElements.add(link);
        count++;
      }
    });
  });

  return { count };
}
```

### 3d. applyDsStyle() — mismo patrón que applyHighlight()

```javascript
function applyDsStyle(element, color, fontSize) {
  dsHighlightedElements.push({
    element,
    backgroundColor: element.style.backgroundColor,
    fontSize: element.style.fontSize
  });
  element.style.backgroundColor = color || '#FF0000';
  element.style.fontSize = (fontSize || 14) + 'px';
  element.setAttribute('data-ds-highlighted', 'true');
}
```

### 3e. dsClearHighlights() — mismo patrón que clearHighlights()

```javascript
function dsClearHighlights() {
  dsHighlightedElements.forEach(item => {
    item.element.style.backgroundColor = item.backgroundColor;
    item.element.style.fontSize = item.fontSize;
    item.element.removeAttribute('data-ds-highlighted');
  });
  dsHighlightedElements = [];
}
```

---

## 4. `popup.css` — estilos del listado

```css
.ds-item-list {
  margin-top: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.ds-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}

.ds-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-item-row input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.ds-item-row input[type="number"] {
  width: 48px;
}
```

---

## Features de Tab 1 replicadas en Tab 3

| Feature Tab 1 | Equivalente Tab 3 |
|---|---|
| `DEFAULT_SETTINGS` con valores por defecto | `dsAttachSelector` y `dsLinksSelector` en DEFAULT_SETTINGS |
| `loadSettings()` restaura valores al abrir | Restaura ambos selectores |
| `saveSettings()` guarda estado | Incluye ambos selectores |
| `isLoading` guard (ya global) | Aplica automáticamente |
| `setupAutoSave()` listeners | Listeners en ambos inputs |
| Limpiar highlights antes de re-aplicar | `dsClearHighlights()` al inicio de `dsApplyHighlights()` |
| Array `highlightedElements` para cleanup | Array separado `dsHighlightedElements` |
| Restore estilos originales en clear | Mismo patrón en `dsClearHighlights()` |
| `showMessage()` con auto-hide 3s | `showDsMessage()` idéntico |
| try/catch en todas las llamadas chrome | Presente en scan/apply/clear |
| Inyección de content.js antes de sendMessage | `ensureContentScript()` inyecta solo si el content script no responde a `ping` |
| Tab activa persistida (global) | Ya manejado por sistema global |

---

## Hallazgos incorporados a corregir

1. `Scan` seguido de `Apply` no debe reinyectar `content.js` si ya está cargado; usar `ensureContentScript()` para evitar errores por redeclarar variables top-level.
2. Selectores CSS inválidos deben devolver `{ error }` desde `content.js` y mostrarse como mensaje de error en el popup, sin romper el listener.
3. Un mismo elemento no debe guardarse varias veces en `dsHighlightedElements`; usar un `Set` durante `dsApplyHighlights()` para que `Clear` restaure siempre el estilo original.
4. `handleSearch()` de Link Finder también debe usar `ensureContentScript()`; si mantiene `chrome.scripting.executeScript()` directo, Tab 1 puede fallar después de Doc Search o tras búsquedas repetidas en la misma pestaña.

---

## Verificación

1. Recargar la extensión en `chrome://extensions/`.
2. Abrir una página con links en sidebar (ej. Wikipedia, docs de MDN).
3. Tab 3 → ingresar selector (default `aside a`) → **Scan** → verificar lista con labels y colores por defecto.
4. Cambiar color de un ítem → **Apply** → verificar que ese elemento y sus duplicados en el body tienen el mismo color.
5. **Clear** → verificar que todos los highlights desaparecen.
6. Cerrar y reabrir el popup → verificar que los selectores se restauran.
7. Cambiar selector por uno custom (ej. `nav a`) y repetir.
8. Abrir Tab 1, hacer una búsqueda, ir a Tab 3 y hacer Apply → verificar que los highlights de ambas tabs son independientes.
9. Hacer **Scan** y luego **Apply** varias veces seguidas en la misma pestaña → verificar que no aparece error por reinyección de `content.js`.
10. Probar selectores inválidos (ej. `aside a[` o `a]`) → verificar mensaje de error claro y que el popup sigue funcionando.
11. Probar una página con referencias duplicadas al mismo `href` → aplicar y limpiar → verificar que el estilo original se restaura correctamente.
12. Usar Tab 3 primero y luego ejecutar una búsqueda en Tab 1 en la misma página → verificar que Link Finder funciona sin error por reinyección.
13. Ejecutar varias búsquedas seguidas en Tab 1 en la misma página → verificar que no aparece error por redeclaración de variables en `content.js`.
