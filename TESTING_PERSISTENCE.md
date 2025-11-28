# Testing Guide: Persistence Functionality

## 🔧 Problema Corregido

**Problema Original:**
- Los valores no persistían al cerrar y reabrir el popup
- Race condition: event listeners se disparaban durante la carga inicial
- Los settings se guardaban prematuramente con valores por defecto

**Solución Implementada:**
1. ✅ Flag `isLoading` para prevenir guardado durante carga
2. ✅ `await loadSettings()` para asegurar orden correcto de ejecución
3. ✅ `setupAutoSave()` se ejecuta DESPUÉS de cargar
4. ✅ Logs de debugging para verificar funcionamiento

---

## 📋 Pasos para Probar la Persistencia

### Paso 1: Recarga la Extensión

1. Ve a `chrome://extensions/` o `edge://extensions/`
2. Encuentra tu extensión "Tools Extension"
3. Click en el botón **"Recargar"** (ícono de refresh)
4. ⚠️ **IMPORTANTE:** Siempre recarga después de cambios en el código

### Paso 2: Abre la Consola del Popup

Para ver los logs de debugging:

**Opción A: Click derecho en el icono**
1. Click derecho en el icono de la extensión
2. Selecciona "Inspeccionar popup" (Inspect popup)
3. Se abrirá DevTools específico para el popup

**Opción B: Desde Chrome DevTools**
1. Abre el popup normalmente (click en el icono)
2. Click derecho en el popup → "Inspeccionar" (Inspect)

### Paso 3: Primera Prueba - Verificar Carga Inicial

**Con el popup abierto y la consola visible:**

1. **Cierra el popup** (click fuera o ESC)
2. **Reabre el popup** (click en el icono)
3. **Verifica los logs en la consola:**

```
🔵 [LOAD] Starting to load settings...
🔵 [LOAD] Settings retrieved from storage: {searchUrl: "", searchText: false, ...}
🔵 [LOAD] Settings applied to UI successfully
🔵 [LOAD] Loading complete, auto-save enabled
```

**✅ Si ves estos logs:** La carga funciona correctamente

**❌ Si hay errores:** Copia el error y reporta

### Paso 4: Segunda Prueba - Verificar Guardado

**Con el popup abierto:**

1. **Escribe en el campo URL:** `github.com`
2. **Observa la consola:**

```
🟢 [SAVE] Saving settings: {searchUrl: "github.com", ...}
🟢 [SAVE] Settings saved successfully
```

3. **Marca checkbox "Partial search"**
4. **Observa la consola:**

```
🟢 [SAVE] Saving settings: {..., partialSearch: true}
🟢 [SAVE] Settings saved successfully
```

5. **Cambia el color a verde** (#00FF00)
6. **Observa la consola:**

```
🟢 [SAVE] Saving settings: {..., bgColor: "#00FF00"}
🟢 [SAVE] Settings saved successfully
```

**✅ Si ves logs de SAVE:** El guardado automático funciona

**⚠️ Si ves logs bloqueados:**
```
⏸️  [SAVE] Blocked - currently loading settings
```
Esto es **CORRECTO** durante la carga inicial (previene el problema original)

### Paso 5: Tercera Prueba - Verificar Persistencia

**Configuración de prueba:**
1. URL: `github.com/explore`
2. ✅ Partial search: marcado
3. ✅ Match special cases: marcado
4. Color: Verde (#00FF00)
5. Font size: 20

**Pasos:**

1. **Configura todos los valores arriba**
2. **Cierra el popup** (click fuera)
3. **Espera 2 segundos**
4. **Reabre el popup**
5. **Verifica que TODO esté como lo dejaste** ✅

**Consola debe mostrar:**
```
🔵 [LOAD] Starting to load settings...
🔵 [LOAD] Settings retrieved from storage: {
  searchUrl: "github.com/explore",
  searchText: false,
  partialSearch: true,
  specialCases: true,
  bgColor: "#00FF00",
  fontSize: "20"
}
🔵 [LOAD] Settings applied to UI successfully
🔵 [LOAD] Loading complete, auto-save enabled
```

### Paso 6: Cuarta Prueba - Persistencia Entre Reinicios

**Test más severo:**

1. **Configura valores en el popup**
2. **Cierra el popup**
3. **Cierra el navegador COMPLETAMENTE**
4. **Espera 10 segundos**
5. **Reabre el navegador**
6. **Navega a cualquier página**
7. **Abre el popup de la extensión**
8. **Verifica que los valores persistan** ✅

---

## 🐛 Solución de Problemas

### Problema: Los valores no persisten

**Síntomas:**
- Abro el popup, configuro valores, cierro y reabro → valores resetean

**Diagnóstico:**
1. Abre la consola del popup
2. Busca errores rojos (🔴)
3. Verifica que veas logs de SAVE (🟢)

**Posibles causas:**

**Causa 1: Extensión no recargada**
- Solución: Ve a `chrome://extensions/` y haz click en "Recargar"

**Causa 2: Permiso de storage no configurado**
- Solución: Verifica que `manifest.json` incluya `"storage"` en permissions
- Archivo actual debe tener: `"permissions": ["activeTab", "scripting", "storage"]`

**Causa 3: Error en chrome.storage**
- Solución: Revisa la consola por errores tipo:
  ```
  🔴 [SAVE] Error saving settings: ...
  ```

### Problema: Logs bloqueados durante uso normal

**Síntomas:**
- Escribo en el campo y veo: `⏸️  [SAVE] Blocked - currently loading settings`

**Diagnóstico:**
- Esto **NO debería pasar** durante uso normal
- Solo debe pasar durante la carga inicial del popup

**Solución:**
1. Verifica que `isLoading` se esté configurando correctamente
2. Revisa que el flag `isLoading = false` se ejecute en el `finally` block

### Problema: Valores se guardan pero con datos incorrectos

**Síntomas:**
- Los valores persisten pero no son los que configuré

**Diagnóstico:**
1. Revisa los logs de SAVE en la consola
2. Compara los valores en el log con lo que ves en la UI

**Solución:**
- Esto indicaría un problema en `saveSettings()` leyendo los valores del DOM

---

## 🧹 Remover Logs de Debugging (Después de Verificar)

Una vez que confirmes que todo funciona, puedes remover los `console.log`:

**Busca y elimina estas líneas en `popup.js`:**

```javascript
// En loadSettings()
console.log('🔵 [LOAD] Starting to load settings...');
console.log('🔵 [LOAD] Settings retrieved from storage:', settings);
console.log('🔵 [LOAD] Settings applied to UI successfully');
console.log('🔵 [LOAD] Loading complete, auto-save enabled');

// En saveSettings()
console.log('⏸️  [SAVE] Blocked - currently loading settings');
console.log('🟢 [SAVE] Saving settings:', settings);
console.log('🟢 [SAVE] Settings saved successfully');
```

**Mantén solo los `console.error`:**
```javascript
console.error('🔴 [LOAD] Error loading settings:', error);
console.error('🔴 [SAVE] Error saving settings:', error);
```

---

## ✅ Checklist de Verificación

- [ ] Extensión recargada en `chrome://extensions/`
- [ ] Consola del popup abierta (Inspect popup)
- [ ] Logs de LOAD aparecen al abrir popup
- [ ] Logs de SAVE aparecen al cambiar valores
- [ ] Valores persisten al cerrar/reabrir popup
- [ ] Valores persisten al reiniciar navegador
- [ ] No hay errores rojos (🔴) en consola
- [ ] Flag `isLoading` previene guardados durante carga

---

## 📊 Verificación de Storage Directa

**Ver datos guardados manualmente:**

En la consola del popup, ejecuta:

```javascript
chrome.storage.local.get(null, (data) => {
  console.log('📦 All stored data:', data);
});
```

**Limpiar storage manualmente (reset completo):**

```javascript
chrome.storage.local.clear(() => {
  console.log('🗑️  Storage cleared');
});
```

**Verificar un valor específico:**

```javascript
chrome.storage.local.get('searchUrl', (data) => {
  console.log('🔍 searchUrl:', data.searchUrl);
});
```

---

**Fecha de corrección:** 2025-11-27
**Archivos modificados:** `popup.js`
**Versión:** 1.0.0
