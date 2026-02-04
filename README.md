# Link Finder Extension

Chrome/Edge extension to search and highlight links on web pages with custom styling, plus a text cleaner tool.

## Project Structure

```
extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html             # Popup UI with tab system
├── popup.css              # Minimal black/white styles
├── popup.js               # UI logic and communication
├── content.js             # Injection script and highlighting
├── create-icons.html      # Icon generator
├── icons/
│   ├── README.md          # Icon instructions
│   └── icon.svg           # SVG template
└── README.md              # This file
```

## Installation

### Step 1: Generate Icons

1. Open `create-icons.html` in your browser
2. Click the three "Download" buttons to download:
   - icon-16.png
   - icon-48.png
   - icon-128.png
3. Save the files into the `icons/` folder

### Step 2: Load in Chrome/Edge

**Chrome:**
1. Open `chrome://extensions/`
2. Enable Developer Mode (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder

**Edge:**
1. Open `edge://extensions/`
2. Enable Developer Mode (left panel)
3. Click "Load unpacked"
4. Select the `extension/` folder

## Usage

### Link Finder (Tab 1)

1. Click the extension icon in the toolbar
2. In the "Link Finder" tab:
   - **URL to search**: Enter the URL or text to search
   - **Background**: Pick highlight background color (default: red #FF0000)
   - **Font size**: Font size in pixels (default: 12px)
   - **Search in visible text**: Also search visible text (not only href)
   - **Partial search**: Partial match (default: enabled)
3. Click "Search" to apply highlights
4. Click "Clear" to remove highlights

### Text Cleaner (Tab 2)

1. Type your text in the input field
2. Click "Convert" (or type to see live output)
3. Click "Copy" to copy the result
4. Click "Clear" to reset the fields

**Example**
- Input: `hola como estas`
- Output: `hola-como-estas`

## Future Features

Tabs 3-6 are reserved for new tools:
- Function 3: TBD
- Function 4: TBD
- Function 5: TBD
- Function 6: TBD

The architecture is designed to be easily expandable.

## Technologies

- **Manifest Version**: V3 (Chrome/Edge compatible)
- **Languages**: Vanilla JavaScript, HTML5, CSS3
- **No external dependencies**

## Technical Features

- Compatible with Chrome and Edge (Chromium)
- Manifest V3
- Local persistence for popup settings
- Minimal black/white design
- Scalable tab system
- Partial and exact search
- Search in href and visible text
- Custom highlight color and font size
- Highlight cleanup
- Text cleaner with slug-style output
- Remembers last active tab

## Development Notes

### Permissions Used
- `activeTab`: Access to current tab
- `scripting`: Inject content script
- `storage`: Persist popup settings

### Communication
- Popup -> Content Script: `chrome.tabs.sendMessage()`
- Content Script -> Popup: Response callbacks

### Applied Styles
Highlights use inline styles:
- `background-color`: Selected color
- `font-size`: Size in pixels

## Troubleshooting

**The extension does not appear:**
- Check that icons exist in `icons/`
- Reload the extension in `chrome://extensions/`

**No links found:**
- Verify the URL is correct
- Try enabling "Partial search"
- Check that the page contains links with that URL

**Highlights not applied:**
- Check the browser console (F12)
- Reload the web page
- Try restarting the extension

## Next Steps

1. Base structure complete
2. Link Finder implemented
3. Text Cleaner implemented
4. Add Function 3
5. Add Function 4
6. Add Function 5
7. Add Function 6

---

**Version**: 1.0.0
**Date**: 2025-11-27
