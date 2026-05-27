# Plan: Persistencia de Scan en Tab 3 (Doc Search)

## Contexto

Tab 3 (Doc Search) debe conservar los resultados del scan al cerrar/abrir el popup y al recargar la página. La implementación actual ya persiste la lista escaneada y la configuración por item usando `chrome.storage.local`.

No se requieren permisos adicionales. La extensión debe mantenerse con el permiso actual `"storage"` en `manifest.json`.

## Implementado

### Datos persistidos

| Dato | Key en storage | Tipo | Default |
|------|---------------|------|---------|
| Items escaneados | `dsScanItems` | `Array<{ href, text }>` | `[]` |
| Config por item | `dsItemConfigs` | `Array<{ color, fontSize }>` | `[]` |
| URL donde se hizo el scan | `dsScanPageUrl` | `string` | `''` |

### Cambios aplicados en `popup.js`

1. `DEFAULT_SETTINGS` incluye `dsScanItems`, `dsItemConfigs` y `dsScanPageUrl`.
2. `loadSettings()` restaura la lista de items y sus configs al abrir el popup solo si la URL actual coincide.
3. `handleDsScan()` guarda los resultados del scan, los configs iniciales y la URL de la página en `chrome.storage.local`.
4. Si el scan no encuentra resultados, se limpian `dsScanItems`, `dsItemConfigs` y `dsScanPageUrl`.
5. `renderDsItemList()` agrega listeners a los inputs de color y fontSize para persistir cambios.
6. `saveDsScanState()` guarda los configs actuales de la lista.
7. `Clear` solo limpia highlights del DOM. No borra la lista persistida.

### Archivos sin cambios requeridos

| Archivo | Motivo |
|---------|--------|
| `manifest.json` | No se agregan permisos |
| `popup.html` | La UI existente es suficiente |
| `popup.css` | No hay cambios visuales requeridos |

## Hallazgo de revisión corregido

La primera implementación persistía `dsScanItems` y `dsItemConfigs` de forma global en `chrome.storage.local`.

Eso cumplía con cerrar/abrir el popup y recargar la misma página, pero podía mostrar resultados antiguos si el usuario navegaba a otra URL o usaba la extensión en otra página después de haber hecho scan.

La corrección implementada persiste `dsScanPageUrl` y restaura la lista solo cuando la URL actual coincide con la URL donde se hizo el scan.

## Implementado: Opción B

Persistir también la URL de la página donde se hizo el scan y restaurar la lista solo si la URL actual coincide con esa URL.

La URL se obtiene desde `content.js` usando `window.location.href`. Esto evita depender de `tab.url` y mantiene el requisito de no pedir permisos adicionales.

### Nuevo dato a persistir

| Dato | Key en storage | Tipo | Default |
|------|---------------|------|---------|
| URL donde se hizo el scan | `dsScanPageUrl` | `string` | `''` |

### Cambios aplicados en `content.js`

1. `docSearch:scan` devuelve también `pageUrl: window.location.href`.
2. Se agrega la acción `docSearch:getPageUrl`, que responde `{ pageUrl: window.location.href }`.

### Cambios aplicados en `popup.js`

#### 1. `DEFAULT_SETTINGS`

Se agregó:

```javascript
dsScanPageUrl: ''
```

#### 2. `handleDsScan()`

Al hacer scan exitoso:

- Tomar la URL actual desde `response.pageUrl`, devuelta por `content.js`.
- Guardar `dsScanPageUrl` junto con `dsScanItems` y `dsItemConfigs`.

Ejemplo de datos a guardar:

```javascript
await chrome.storage.local.set({
  dsScanItems,
  dsItemConfigs,
  dsScanPageUrl: response.pageUrl || ''
});
```

Si el scan no encuentra resultados:

- Limpiar `dsScanItems`, `dsItemConfigs` y `dsScanPageUrl`.

#### 3. `loadSettings()`

Antes de restaurar `dsScanItems`:

- Consultar el tab activo solo para obtener `tab.id`.
- Enviar `docSearch:getPageUrl` al content script.
- Comparar `settings.dsScanPageUrl` contra el `pageUrl` devuelto por `content.js`.
- Restaurar la lista solo si ambas URLs coinciden.

Si no coinciden:

- No renderizar la lista persistida.
- Mostrar `Total: 0`.
- Mantener `Apply` deshabilitado.
- No borrar storage automáticamente, para no perder el scan si el usuario vuelve a la página original.

#### 4. `saveDsScanState()`

No necesita guardar `dsScanPageUrl`, porque esta función solo persiste cambios de color/fontSize. La URL se define cuando se hace Scan.

#### 5. `handleDsClear()`

No debe cambiar. Clear solo limpia highlights del DOM y no debe borrar `dsScanItems`, `dsItemConfigs` ni `dsScanPageUrl`.

## Flujo esperado con Opción B

1. Usuario hace Scan en página A.
2. Se guardan `dsScanItems`, `dsItemConfigs` y `dsScanPageUrl` con la URL de página A.
3. Usuario cierra y reabre el popup en página A.
4. La lista se restaura porque la URL actual coincide con `dsScanPageUrl`.
5. Usuario recarga página A.
6. La lista se restaura porque la URL sigue coincidiendo.
7. Usuario navega a página B.
8. La lista no se restaura porque la URL actual no coincide con `dsScanPageUrl`.
9. Usuario vuelve a página A.
10. La lista vuelve a restaurarse porque la URL coincide otra vez.
11. Clear solo limpia highlights, no borra datos persistidos.

## Verificación

1. Tab 3 -> Scan en página A -> verificar lista de items.
2. Cerrar popup -> reabrir en página A -> la lista debe seguir con los mismos items, colores y tamaños.
3. Cambiar color/fontSize de un item -> cerrar -> reabrir en página A -> debe mantener los cambios.
4. Recargar página A -> abrir popup -> la lista debe seguir.
5. Navegar a página B -> abrir popup -> la lista de página A no debe mostrarse.
6. Volver a página A -> abrir popup -> la lista de página A debe restaurarse.
7. Hacer nuevo Scan en página B -> debe reemplazar `dsScanItems`, `dsItemConfigs` y `dsScanPageUrl`.
8. Scan con selector sin resultados -> debe limpiar `dsScanItems`, `dsItemConfigs` y `dsScanPageUrl`.
9. Clear -> debe limpiar highlights, pero no debe borrar la lista ni los datos persistidos.
10. Verificar que Tab 1 y Tab 2 siguen funcionando sin regresiones.
