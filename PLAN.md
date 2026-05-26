# Plan: Migración a Content Scripts Estáticos

## Contexto

La extensión usa `chrome.scripting.executeScript()` para inyectar `content.js` dinámicamente. En el entorno corporativo del banco esta llamada falla (bloqueada por política de empresa), dejando Tab 1 (Link Finder) y Tab 3 (Doc Search) sin funcionar.

La solución es declarar `content.js` en `manifest.json` como content script estático. El browser lo inyecta automáticamente al cargar cada página, sin necesidad del permiso `scripting` ni de `chrome.scripting.executeScript()`.

**Resultado:** permisos reducidos a solo `storage`. Funcionalidad idéntica.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `manifest.json` | Quitar `scripting` y `activeTab` de `permissions`; agregar sección `content_scripts` |
| `popup.js` | Eliminar `ensureContentScript()` y todas sus llamadas |

`content.js`, `popup.html`, `popup.css` no requieren cambios.

---

## 1. `manifest.json`

```json
"permissions": ["storage"],
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

---

## 2. `popup.js`

- Eliminar la función `ensureContentScript()` completa
- En `handleSearch()`, `handleClear()`, `handleDsScan()`, `handleDsApply()`, `handleDsClear()`: eliminar la línea `await ensureContentScript(tab.id)`

El flujo queda: obtener `tab.id` → enviar mensaje directamente.

---

## Verificación

1. Recargar la extensión en `chrome://extensions/`
2. Confirmar que los permisos muestran solo "Almacenamiento local"
3. Tab 1 → Search / Clear → verificar highlights
4. Tab 3 → Scan → Apply → Clear → verificar highlights coordinados
5. Tab 2 → verificar que Text Cleaner sigue funcionando
6. Cerrar y reabrir popup → verificar persistencia de settings
