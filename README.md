# Link Finder Extension

Chrome/Edge extension para buscar y resaltar enlaces en páginas web con estilos personalizados.

## Estructura del Proyecto

```
extension/
├── manifest.json          # Configuración de la extensión (Manifest V3)
├── popup.html            # Interfaz del popup con sistema de tabs
├── popup.css             # Estilos minimalistas blanco/negro
├── popup.js              # Lógica de la UI y comunicación
├── content.js            # Script de inyección y highlighting
├── create-icons.html     # Generador de iconos
├── icons/
│   ├── README.md         # Instrucciones para iconos
│   └── icon.svg          # Template SVG
└── README.md             # Este archivo
```

## Instalación

### Paso 1: Generar Iconos

1. Abre `create-icons.html` en tu navegador
2. Haz clic en los 3 botones "Download" para descargar:
   - icon-16.png
   - icon-48.png
   - icon-128.png
3. Guarda los archivos en la carpeta `icons/`

### Paso 2: Cargar en Chrome/Edge

**Chrome:**
1. Abre `chrome://extensions/`
2. Activa "Modo de desarrollador" (esquina superior derecha)
3. Haz clic en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta `extension/`

**Edge:**
1. Abre `edge://extensions/`
2. Activa "Modo de desarrollador" (panel izquierdo)
3. Haz clic en "Cargar extensión descomprimida"
4. Selecciona la carpeta `extension/`

## Uso

### Buscador de Enlaces (Tab 1)

1. Haz clic en el icono de la extensión en la barra de herramientas
2. En el tab "Link Finder":
   - **URL to search**: Ingresa la URL o texto a buscar
   - **Background**: Selecciona color de fondo (default: rojo #FF0000)
   - **Font size**: Tamaño de fuente en píxeles (default: 16px)
   - **Search in visible text**: Busca también en texto visible (no solo en href)
   - **Partial search**: Búsqueda parcial (default: activado)
3. Haz clic en "Search" para aplicar highlights
4. Haz clic en "Clear" para limpiar todos los highlights

### Ejemplos de Búsqueda

**Búsqueda básica:**
- Input: `google.com`
- Encontrará: `<a href="https://google.com">`, `<a href="https://www.google.com/maps">`

**Búsqueda exacta:**
- Desactiva "Partial search"
- Input: `https://google.com`
- Encontrará solo coincidencias exactas

**Búsqueda en texto visible:**
- Activa "Search in visible text"
- Input: `example.com`
- Encontrará enlaces Y texto que muestre "example.com"

## Funcionalidades Futuras

Los tabs 2-6 están preparados para nuevas funciones:
- Function 2: Por definir
- Function 3: Por definir
- Function 4: Por definir
- Function 5: Por definir
- Function 6: Por definir

La arquitectura está diseñada para ser fácilmente escalable.

## Tecnologías

- **Manifest Version**: V3 (compatible con Chrome y Edge)
- **Lenguajes**: JavaScript vanilla, HTML5, CSS3
- **Sin dependencias externas**: No requiere librerías adicionales

## Características Técnicas

- ✅ Compatible con Chrome y Edge (Chromium)
- ✅ Manifest V3
- ✅ Sin persistencia de datos
- ✅ Diseño minimalista (blanco/negro)
- ✅ Sistema de tabs escalable
- ✅ Búsqueda parcial y exacta
- ✅ Búsqueda en href y texto visible
- ✅ Personalización de color y tamaño
- ✅ Limpieza de highlights

## Notas de Desarrollo

### Permisos Utilizados
- `activeTab`: Acceso a la pestaña activa
- `scripting`: Inyección de content script

### Comunicación
- Popup → Content Script: `chrome.tabs.sendMessage()`
- Content Script → Popup: Response callbacks

### Estilos Aplicados
Los highlights se aplican mediante estilos inline:
- `background-color`: Color seleccionado
- `font-size`: Tamaño en píxeles

## Troubleshooting

**La extensión no aparece:**
- Verifica que los iconos estén en `icons/`
- Recarga la extensión en `chrome://extensions/`

**No encuentra enlaces:**
- Verifica que la URL sea correcta
- Intenta activar "Partial search"
- Verifica que la página tenga enlaces con esa URL

**Los highlights no se aplican:**
- Verifica la consola del navegador (F12)
- Recarga la página web
- Intenta reiniciar la extensión

## Próximos Pasos

1. ✅ Estructura base creada
2. ✅ Funcionalidad de buscador de enlaces implementada
3. 🔲 Agregar función 2
4. 🔲 Agregar función 3
5. 🔲 Agregar función 4
6. 🔲 Agregar función 5
7. 🔲 Agregar función 6

---

**Versión**: 1.0.0
**Fecha**: 2025-11-27
