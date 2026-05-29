# Plan: Popup de altura fija con footer (mensaje siempre visible sin scroll)

## Contexto

Las notificaciones (`<div class="result-message">`: `#resultMessage` TAB-1, `#cleanerMessage` TAB-2, `#dsMessage` TAB-3) se muestran con `showMessage` / `showCleanerMessage` / `showDsMessage` (`popup.js`), localizándolas por id.

**Por qué TAB-3 sí se ve y TAB-1 no:** TAB-3 acota su contenido variable — la lista `.ds-item-list` tiene `max-height: 200px; overflow-y: auto` (`popup.css:324-327`) — así que el tab cabe en el popup y el mensaje queda dentro del viewport. TAB-1 no tiene ninguna zona acotada: al aparecer el mensaje, el contenido supera la altura del popup (~600px), este hace scroll y el mensaje (último del flujo) queda fuera del viewport.

**Objetivo:** que el mensaje se vea **siempre sin hacer scroll**. Enfoque elegido (el más robusto, replicando el principio de TAB-3): **popup de altura fija con scroll interno del contenido y un footer fijo abajo** que contiene el mensaje (y los botones donde corresponde). Así nada se empuja fuera del viewport, no hay overlay, ni salto, ni el comportamiento de Chrome de no encoger el popup (la altura es constante).

> Se descarta el enfoque anterior de `position: sticky` (era un parche: superpone contenido y deja hueco al desaparecer el mensaje).

---

## Diseño

Convertir el popup en una **columna flex de altura fija**: barra de tabs arriba, área de contenido que ocupa el resto, y dentro de cada tab una **zona scrollable** (`.panel-scroll`) y un **footer fijo** (`.panel-footer`).

### 1. `popup.css` — layout de altura fija

```css
body {
  width: 400px;
  height: 560px;              /* altura fija: popup estable, sin crecer/encoger */
  display: flex;
  flex-direction: column;
  /* (font-family, colores: se mantienen) */
}

.container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabs { flex-shrink: 0; }      /* añadir: la barra de tabs no se encoge */

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* padding: 20px se mantiene */
}

.tab-panel.active {            /* antes: display: block */
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* NUEVO */
.panel-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;           /* aquí scrollea el formulario/lista */
}

.panel-footer {
  flex-shrink: 0;             /* siempre visible abajo */
  padding-top: 12px;
  border-top: 1px solid #eee; /* separador del contenido */
}
```

- `.result-message` (`popup.css:224`) vuelve a ser un bloque normal: **revertir** cualquier `position: sticky` / `bottom` / `z-index`; basta con `display:none` + `.show { display:block }` y sus colores. Vive dentro del footer.
- `.ds-item-list` mantiene su `max-height: 200px; overflow-y: auto` (en TAB-3 el header "All"/contador queda fijo y solo la lista scrollea; el footer del tab seguirá conteniendo solo el mensaje).

### 2. `popup.html` — envolver contenido y footer en cada tab implementado

Patrón por tab: dejar el `<h2>` arriba (fijo), envolver los campos en `<div class="panel-scroll">` y el bloque inferior en `<div class="panel-footer">`.

**TAB-1** (`~líneas 24-74`):
```html
<div id="tab1" class="tab-panel active">
  <h2>Link Finder</h2>
  <div class="panel-scroll">
    <!-- form-group searchUrl, form-row color/fontSize, y los checkboxes -->
  </div>
  <div class="panel-footer">
    <div class="button-group"> ...Search / Clear... </div>
    <div id="resultMessage" class="result-message"></div>
  </div>
</div>
```

**TAB-2** (`~líneas 76-96`): igual patrón — `panel-scroll` con los 2 `form-group` (cleanerInput, cleanerOutput); `panel-footer` con su `button-group` (Copy/Clear) + `#cleanerMessage`.

**TAB-3** (`~líneas 98-132`): `panel-scroll` con los selectores, el `button-group` (Scan/Apply/Clear) y el `.ds-list-panel` **en su orden actual** (los botones se quedan sobre la lista, su flujo lógico no cambia); `panel-footer` con **solo** `#dsMessage`.

> Diferencia justificada: en TAB-1/TAB-2 los botones son contiguos al mensaje, así que van juntos en el footer (bonus: botones siempre visibles). En TAB-3 "Scan" genera la lista y debe quedar **encima** de ella, por lo que solo el mensaje va al footer; como la lista está acotada a 200px, los botones de TAB-3 quedan visibles igualmente.

Los placeholders TAB-4/5/6 (solo `<h2>` + `<p>`) no necesitan wrappers; funcionan con la nueva regla `.tab-panel.active`.

### 3. `popup.js`

Sin cambios: `showMessage`/`showCleanerMessage`/`showDsMessage` ubican por id y los listeners de botones son por id; mover los elementos no los rompe.

---

## Verificación (manual — el proyecto no tiene tests ni build)

1. Recargar la extensión en `chrome://extensions`.
2. **TAB-1:** pulsar **Search** (con y sin resultados) y **Clear** → el mensaje aparece en el footer inferior, **siempre visible sin scroll**, aunque el formulario sea alto; los campos hacen scroll dentro de `.panel-scroll` y los botones permanecen visibles.
3. **TAB-2:** Copy/Clear → mensaje y botones siempre visibles abajo.
4. **TAB-3:** Scan/Apply/Clear → el mensaje siempre visible en el footer; la lista scrollea dentro de su zona; los botones siguen sobre la lista.
5. **Altura estable:** al mostrarse/ocultarse el mensaje y al cambiar de tab, el popup mantiene la misma altura (sin crecer/encoger ni dejar hueco).
6. Confirmar que el mensaje sigue ocultándose tras el timeout de `popup.js` y que no hay scroll del popup completo (solo scroll interno de `.panel-scroll`).
7. Ajustar `height: 560px` si se desea (subir/bajar) según el contenido; el máximo efectivo de un popup de Chrome es ~600px.
