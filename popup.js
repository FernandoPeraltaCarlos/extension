// Default settings
const DEFAULT_SETTINGS = {
  searchUrl: '',
  searchText: false,
  partialSearch: false,
  filenameSearch: false,
  bgColor: '#FF0000',
  fontSize: '25',
  cleanerInput: '',
  dsAttachSelector: 'aside a',
  dsLinksSelector: 'a',
  dsScanItems: [],      // Array de { href, text } del último scan
  dsItemConfigs: [],    // Array de { color, fontSize } por cada item
  dsScanPageUrl: '',    // URL del tab donde se hizo el último scan
  clTicketType: 'amend',
  clVerificarContexto: false,
  clVerifAdjuntos: false,
  clVerifRedirecciones: false,
  clVerifCrawl: false,
  clVerifEntrypoints: false,
  clVerifDatosNewPage: false,
  clTodos: [],
  clItempaths: '',
  clVerifItempaths: false,
  clVerifComentarios: false,
  clVerifQaLinks: false,
  activeTab: 'tab1'
};

// Flag to prevent saving during initial load
let isLoading = false;

// Tab switching functionality
document.addEventListener('DOMContentLoaded', async () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      saveActiveTab(targetTab);
    });
  });

  // Load saved settings on popup open - WAIT for it to complete
  await loadSettings();

  // Link Finder functionality
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultMessage = document.getElementById('resultMessage');

  searchBtn.addEventListener('click', handleSearch);
  clearBtn.addEventListener('click', handleClear);

  // Text Cleaner functionality
  setupTextCleaner();

  // Doc Search functionality
  setupDocSearch();

  // Ticket QC functionality
  setupChecklist();

  // Add change listeners to save settings automatically - AFTER loading
  setupAutoSave();
});

async function handleSearch() {
  const searchUrl = document.getElementById('searchUrl').value.trim();
  const bgColor = document.getElementById('bgColor').value;
  const fontSize = document.getElementById('fontSize').value;
  const searchText = document.getElementById('searchText').checked;
  const partialSearch = document.getElementById('partialSearch').checked;
  const filenameSearch = document.getElementById('filenameSearch').checked;

  if (!searchUrl) {
    showMessage('Please enter a URL or text to search', 'error');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'search',
      data: {
        searchUrl,
        bgColor,
        fontSize,
        searchText,
        partialSearch,
        filenameSearch
      }
    });

    if (response && response.count !== undefined) {
      if (response.count > 0) {
        showMessage(`Found and highlighted ${response.count} element(s)`, 'success');
      } else {
        showMessage('No matching elements found', 'info');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    showMessage('Error processing search. Please try again.', 'error');
  }
}

async function handleClear() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'clear'
    });

    if (response && response.success) {
      showMessage('All highlights cleared', 'success');
    }
  } catch (error) {
    console.error('Error:', error);
    showMessage('Error clearing highlights', 'error');
  }
}

function showMessage(message, type) {
  const resultMessage = document.getElementById('resultMessage');
  resultMessage.textContent = message;
  resultMessage.className = `result-message show ${type}`;

  // Hide message after 3 seconds
  setTimeout(() => {
    resultMessage.classList.remove('show');
  }, 3000);
}

async function saveActiveTab(tabId) {
  if (isLoading) {
    return;
  }

  try {
    await chrome.storage.local.set({ activeTab: tabId });
  } catch (error) {
    console.error('🔴 [SAVE] Error saving active tab:', error);
  }
}

function showCleanerMessage(message, type) {
  const cleanerMessage = document.getElementById('cleanerMessage');
  if (!cleanerMessage) {
    return;
  }

  cleanerMessage.textContent = message;
  cleanerMessage.className = `result-message show ${type}`;

  setTimeout(() => {
    cleanerMessage.classList.remove('show');
  }, 2500);
}

function cleanTextToSlug(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function setupTextCleaner() {
  const cleanerInput = document.getElementById('cleanerInput');
  const cleanerOutput = document.getElementById('cleanerOutput');
  const cleanerCopyBtn = document.getElementById('cleanerCopyBtn');
  const cleanerClearBtn = document.getElementById('cleanerClearBtn');

  if (!cleanerInput || !cleanerOutput || !cleanerCopyBtn || !cleanerClearBtn) {
    return;
  }

  const updateOutput = () => {
    const rawValue = cleanerInput.value.trim();
    cleanerOutput.value = rawValue ? cleanTextToSlug(rawValue) : '';
  };

  cleanerInput.addEventListener('input', updateOutput);

  cleanerCopyBtn.addEventListener('click', async () => {
    if (!cleanerOutput.value) {
      showCleanerMessage('Nothing to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(cleanerOutput.value);
      showCleanerMessage('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Error copying text:', error);
      showCleanerMessage('Copy failed', 'error');
    }
  });

  cleanerClearBtn.addEventListener('click', async () => {
    cleanerInput.value = '';
    cleanerOutput.value = '';
    await saveSettings();
    showCleanerMessage('Text cleared', 'success');
  });
}

// Load settings from storage
async function loadSettings() {
  isLoading = true;
  console.log('🔵 [LOAD] Starting to load settings...');

  try {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    console.log('🔵 [LOAD] Settings retrieved from storage:', settings);

    // Apply loaded settings to UI
    document.getElementById('searchUrl').value = settings.searchUrl;
    document.getElementById('searchText').checked = settings.searchText;
    document.getElementById('partialSearch').checked = settings.partialSearch;
    document.getElementById('filenameSearch').checked = settings.filenameSearch;
    document.getElementById('bgColor').value = settings.bgColor;
    document.getElementById('fontSize').value = settings.fontSize;
    const cleanerInput = document.getElementById('cleanerInput');
    const cleanerOutput = document.getElementById('cleanerOutput');
    if (cleanerInput && cleanerOutput) {
      cleanerInput.value = settings.cleanerInput || '';
      cleanerOutput.value = settings.cleanerInput
        ? cleanTextToSlug(settings.cleanerInput)
        : '';
    }

    const dsAttachSelector = document.getElementById('dsAttachSelector');
    const dsLinksSelector = document.getElementById('dsLinksSelector');
    if (dsAttachSelector) dsAttachSelector.value = settings.dsAttachSelector;
    if (dsLinksSelector) dsLinksSelector.value = settings.dsLinksSelector;

    const dsScanItems = Array.isArray(settings.dsScanItems) ? settings.dsScanItems : [];
    const dsItemConfigs = Array.isArray(settings.dsItemConfigs) ? settings.dsItemConfigs : [];
    const dsScanPageUrl = settings.dsScanPageUrl || '';
    const itemList = document.getElementById('dsItemList');
    const applyBtn = document.getElementById('dsApplyBtn');

    const currentPageUrl = await getCurrentPageUrl();
    const urlMatches = dsScanPageUrl && dsScanPageUrl === currentPageUrl;

    if (urlMatches && dsScanItems.length) {
      renderDsItemList(dsScanItems);

      // Restore per-row configs (color/fontSize) after rendering.
      const rows = document.querySelectorAll('#dsItemList .ds-item-row');
      rows.forEach((row, i) => {
        const cfg = dsItemConfigs[i] || {};
        const colorInput = row.querySelector('input[type="color"]');
        const sizeInput = row.querySelector('input[type="number"]');
        if (colorInput && cfg.color) colorInput.value = cfg.color;
        if (sizeInput && cfg.fontSize !== undefined && cfg.fontSize !== null && cfg.fontSize !== '') {
          sizeInput.value = String(cfg.fontSize);
        }
      });

      if (applyBtn) applyBtn.disabled = false;
    } else {
      itemList?.replaceChildren();
      updateDsItemCount(0);
      syncMasterCheckbox();
      if (applyBtn) applyBtn.disabled = true;
    }

    const clTicketType = document.getElementById('clTicketType');
    if (clTicketType) clTicketType.value = settings.clTicketType || 'amend';

    const clVerificarContexto = document.getElementById('clVerificarContexto');
    if (clVerificarContexto) clVerificarContexto.checked = !!settings.clVerificarContexto;

    const clVerifAdjuntos = document.getElementById('clVerifAdjuntos');
    if (clVerifAdjuntos) clVerifAdjuntos.checked = !!settings.clVerifAdjuntos;

    const clVerifRedirecciones = document.getElementById('clVerifRedirecciones');
    if (clVerifRedirecciones) clVerifRedirecciones.checked = !!settings.clVerifRedirecciones;

    const clVerifCrawl = document.getElementById('clVerifCrawl');
    if (clVerifCrawl) clVerifCrawl.checked = !!settings.clVerifCrawl;

    const clVerifEntrypoints = document.getElementById('clVerifEntrypoints');
    if (clVerifEntrypoints) clVerifEntrypoints.checked = !!settings.clVerifEntrypoints;

    const clVerifDatosNewPage = document.getElementById('clVerifDatosNewPage');
    if (clVerifDatosNewPage) clVerifDatosNewPage.checked = !!settings.clVerifDatosNewPage;

    renderChecklistTodos(Array.isArray(settings.clTodos) ? settings.clTodos : []);

    const clItempaths = document.getElementById('clItempaths');
    if (clItempaths) clItempaths.value = settings.clItempaths || '';

    const clVerifItempaths = document.getElementById('clVerifItempaths');
    if (clVerifItempaths) clVerifItempaths.checked = !!settings.clVerifItempaths;

    const clVerifComentarios = document.getElementById('clVerifComentarios');
    if (clVerifComentarios) clVerifComentarios.checked = !!settings.clVerifComentarios;

    const clVerifQaLinks = document.getElementById('clVerifQaLinks');
    if (clVerifQaLinks) clVerifQaLinks.checked = !!settings.clVerifQaLinks;

    syncTodosCommentsReadonly();
    updateTicketTypeVisibility();
    updateChecklistCounter();

    const activeTab = settings.activeTab || 'tab1';
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
    });
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === activeTab);
    });

    console.log('🔵 [LOAD] Settings applied to UI successfully');
  } catch (error) {
    console.error('🔴 [LOAD] Error loading settings:', error);
  } finally {
    isLoading = false;
    console.log('🔵 [LOAD] Loading complete, auto-save enabled');
  }
}

async function getCurrentPageUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return '';

    const response = await Promise.race([
      chrome.tabs.sendMessage(tab.id, { action: 'docSearch:getPageUrl' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);

    return response?.pageUrl || '';
  } catch (error) {
    return '';
  }
}

// Save settings to storage
async function saveSettings() {
  // Prevent saving while loading initial values
  if (isLoading) {
    console.log('⏸️  [SAVE] Blocked - currently loading settings');
    return;
  }

  try {
    const settings = {
      searchUrl: document.getElementById('searchUrl').value,
      searchText: document.getElementById('searchText').checked,
      partialSearch: document.getElementById('partialSearch').checked,
      filenameSearch: document.getElementById('filenameSearch').checked,
      bgColor: document.getElementById('bgColor').value,
      fontSize: document.getElementById('fontSize').value,
      cleanerInput: document.getElementById('cleanerInput')?.value || '',
      dsAttachSelector: document.getElementById('dsAttachSelector')?.value || 'aside a',
      dsLinksSelector: document.getElementById('dsLinksSelector')?.value || 'a',
      clTicketType: document.getElementById('clTicketType')?.value || 'amend',
      clVerificarContexto: document.getElementById('clVerificarContexto')?.checked || false,
      clVerifAdjuntos: document.getElementById('clVerifAdjuntos')?.checked || false,
      clVerifRedirecciones: document.getElementById('clVerifRedirecciones')?.checked || false,
      clVerifCrawl: document.getElementById('clVerifCrawl')?.checked || false,
      clVerifEntrypoints: document.getElementById('clVerifEntrypoints')?.checked || false,
      clVerifDatosNewPage: document.getElementById('clVerifDatosNewPage')?.checked || false,
      clItempaths: document.getElementById('clItempaths')?.value || '',
      clVerifItempaths: document.getElementById('clVerifItempaths')?.checked || false,
      clVerifComentarios: document.getElementById('clVerifComentarios')?.checked || false,
      clVerifQaLinks: document.getElementById('clVerifQaLinks')?.checked || false
    };

    console.log('🟢 [SAVE] Saving settings:', settings);
    await chrome.storage.local.set(settings);
    console.log('🟢 [SAVE] Settings saved successfully');
  } catch (error) {
    console.error('🔴 [SAVE] Error saving settings:', error);
  }
}

// Setup auto-save on input changes
function setupAutoSave() {
  const searchUrl = document.getElementById('searchUrl');
  const searchText = document.getElementById('searchText');
  const partialSearch = document.getElementById('partialSearch');
  const filenameSearch = document.getElementById('filenameSearch');
  const bgColor = document.getElementById('bgColor');
  const fontSize = document.getElementById('fontSize');
  const cleanerInput = document.getElementById('cleanerInput');

  // Save on input change
  searchUrl.addEventListener('input', saveSettings);
  searchText.addEventListener('change', saveSettings);
  partialSearch.addEventListener('change', saveSettings);
  filenameSearch.addEventListener('change', saveSettings);
  bgColor.addEventListener('change', saveSettings);
  fontSize.addEventListener('input', saveSettings);
  if (cleanerInput) {
    cleanerInput.addEventListener('input', saveSettings);
  }

  const dsAttachSelector = document.getElementById('dsAttachSelector');
  const dsLinksSelector = document.getElementById('dsLinksSelector');
  if (dsAttachSelector) dsAttachSelector.addEventListener('input', saveSettings);
  if (dsLinksSelector) dsLinksSelector.addEventListener('input', saveSettings);

  document.getElementById('clTicketType')?.addEventListener('change', () => {
    updateTicketTypeVisibility();
    saveSettings();
    updateChecklistCounter();
  });
  document.getElementById('clVerificarContexto')?.addEventListener('change', () => {
    saveSettings();
    updateChecklistCounter();
  });
  [
    'clVerifAdjuntos',
    'clVerifRedirecciones',
    'clVerifCrawl',
    'clVerifEntrypoints',
    'clVerifDatosNewPage'
  ].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      saveSettings();
      updateChecklistCounter();
    });
  });
  document.getElementById('clItempaths')?.addEventListener('input', saveSettings);
  document.getElementById('clVerifItempaths')?.addEventListener('change', () => {
    saveSettings();
    updateChecklistCounter();
  });
  document.getElementById('clVerifComentarios')?.addEventListener('change', () => {
    saveSettings();
    updateChecklistCounter();
  });
  document.getElementById('clVerifQaLinks')?.addEventListener('change', () => {
    saveSettings();
    updateChecklistCounter();
  });
}

const DS_COLORS = ['red', 'blue', 'gray', 'green', 'brown', 'yellow', 'pink'];
const DS_DEFAULT_SIZE = 25;

function setupDocSearch() {
  const scanBtn = document.getElementById('dsScanBtn');
  const applyBtn = document.getElementById('dsApplyBtn');
  const clearBtn = document.getElementById('dsClearBtn');
  if (!scanBtn || !applyBtn || !clearBtn) return;

  scanBtn.addEventListener('click', handleDsScan);
  applyBtn.addEventListener('click', handleDsApply);
  clearBtn.addEventListener('click', handleDsClear);

  document.getElementById('dsMasterCheckbox')?.addEventListener('change', function () {
    this.indeterminate = false;
    document.querySelectorAll('.ds-row-checkbox').forEach(cb => {
      cb.checked = this.checked;
    });
  });
}

function setDsMasterEnabled(enabled) {
  const master = document.getElementById('dsMasterCheckbox');
  if (!master) return;
  master.disabled = !enabled;
  if (!enabled) {
    master.checked = false;
    master.indeterminate = false;
  }
}

function syncMasterCheckbox() {
  const boxes = [...document.querySelectorAll('.ds-row-checkbox')];
  const master = document.getElementById('dsMasterCheckbox');
  if (!master) return;

  if (!boxes.length) {
    setDsMasterEnabled(false);
    return;
  }

  setDsMasterEnabled(true);
  master.checked = boxes.every(cb => cb.checked);
  master.indeterminate = boxes.some(cb => cb.checked) && !master.checked;
}

function updateDsItemCount(n) {
  const el = document.getElementById('dsItemCount');
  if (el) el.textContent = `Total: ${n}`;
}

function setDsLoading(isLoading, message = '') {
  const loading = document.getElementById('dsListLoading');
  const list = document.getElementById('dsItemList');
  const loadingText = document.getElementById('dsLoadingText');
  const scanBtn = document.getElementById('dsScanBtn');
  const applyBtn = document.getElementById('dsApplyBtn');
  const clearBtn = document.getElementById('dsClearBtn');
  const hasItems = !!document.querySelector('#dsItemList .ds-item-row');
  const master = document.getElementById('dsMasterCheckbox');

  if (loading) loading.hidden = !isLoading;
  if (loadingText) loadingText.textContent = message;
  if (list) list.classList.toggle('is-hidden', isLoading);
  if (scanBtn) scanBtn.disabled = isLoading;
  if (applyBtn) applyBtn.disabled = isLoading || !hasItems;
  if (clearBtn) clearBtn.disabled = isLoading;
  if (master) master.disabled = isLoading || !hasItems;
}

async function handleDsScan() {
  const attachSelector = document.getElementById('dsAttachSelector').value.trim() || 'aside a';
  setDsLoading(true, 'Scanning...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'docSearch:scan',
      selector: attachSelector
    });
    if (response?.error) {
      showDsMessage(response.error, 'error');
      return;
    }
    const itemList = document.getElementById('dsItemList');
    const applyBtn = document.getElementById('dsApplyBtn');
    if (response?.items?.length) {
      const dsScanItems = response.items.map(item => ({
        href: item.href || '',
        text: item.text || ''
      }));

      renderDsItemList(dsScanItems);

      const dsItemConfigs = dsScanItems.map((_, i) => ({
        color: colorNameToHex(DS_COLORS[i % DS_COLORS.length]),
        fontSize: DS_DEFAULT_SIZE
      }));

      await chrome.storage.local.set({
        dsScanItems,
        dsItemConfigs,
        dsScanPageUrl: response.pageUrl || ''
      });
      applyBtn.disabled = false;
      showDsMessage(`Found ${response.items.length} element(s)`, 'success');
    } else {
      itemList.replaceChildren();
      updateDsItemCount(0);
      syncMasterCheckbox();
      applyBtn.disabled = true;
      await chrome.storage.local.set({
        dsScanItems: [],
        dsItemConfigs: [],
        dsScanPageUrl: ''
      });
      showDsMessage('No elements matched the selector', 'info');
    }
  } catch (err) {
    console.error(err);
    showDsMessage('Error scanning the page', 'error');
  } finally {
    setDsLoading(false);
  }
}

function renderDsItemList(items) {
  const list = document.getElementById('dsItemList');
  list.replaceChildren();
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

    const rowCheckbox = document.createElement('input');
    rowCheckbox.type = 'checkbox';
    rowCheckbox.className = 'ds-row-checkbox';
    rowCheckbox.addEventListener('change', syncMasterCheckbox);

    const persistChangeHandler = () => {
      saveDsScanState().catch(err => console.error('🔴 [SAVE] dsScanState:', err));
    };

    colorInput.addEventListener('input', persistChangeHandler);
    colorInput.addEventListener('change', persistChangeHandler);

    const handleSizeChange = () => {
      if (rowCheckbox.checked) {
        document.querySelectorAll('.ds-row-checkbox:checked').forEach(cb => {
          const s = cb.closest('.ds-item-row')?.querySelector('input[type="number"]');
          if (s && s !== sizeInput) s.value = sizeInput.value;
        });
      }
      persistChangeHandler();
    };

    sizeInput.addEventListener('input', handleSizeChange);
    sizeInput.addEventListener('change', handleSizeChange);

    row.append(rowCheckbox, label, colorInput, sizeInput);
    list.appendChild(row);
  });
  updateDsItemCount(items.length);
  syncMasterCheckbox();
}

async function saveDsScanState() {
  // Prevent writes while we are restoring initial UI state.
  if (isLoading) return;

  const rows = document.querySelectorAll('#dsItemList .ds-item-row');
  const dsItemConfigs = Array.from(rows).map(row => {
    const colorInput = row.querySelector('input[type="color"]');
    const sizeInput = row.querySelector('input[type="number"]');
    const fontSizeValue = sizeInput?.value;

    return {
      color: colorInput?.value || '#FF0000',
      fontSize: fontSizeValue !== undefined && fontSizeValue !== '' ? Number(fontSizeValue) : DS_DEFAULT_SIZE
    };
  });

  await chrome.storage.local.set({ dsItemConfigs });
}

function colorNameToHex(name) {
  const map = {
    red: '#FF0000',
    blue: '#0000FF',
    gray: '#808080',
    green: '#008000',
    brown: '#A52A2A',
    yellow: '#FFFF00',
    pink: '#FFC0CB'
  };
  return map[name] || '#FF0000';
}

async function handleDsApply() {
  const attachSelector = document.getElementById('dsAttachSelector').value.trim() || 'aside a';
  const linksSelector = document.getElementById('dsLinksSelector').value.trim() || 'a';
  const rows = document.querySelectorAll('#dsItemList .ds-item-row');
  const itemConfigs = Array.from(rows).map(row => ({
    color: row.querySelector('input[type="color"]').value,
    fontSize: row.querySelector('input[type="number"]').value
  }));

  setDsLoading(true, 'Searching for matches...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'docSearch:apply',
      attachSelector,
      linksSelector,
      itemConfigs
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
  } finally {
    setDsLoading(false);
  }
}

async function handleDsClear() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'docSearch:clear' });
    if (response?.success) showDsMessage('Highlights cleared', 'success');
  } catch (err) {
    showDsMessage('Nothing to clear', 'info');
  }
}

function showDsMessage(message, type) {
  const el = document.getElementById('dsMessage');
  if (!el) return;
  el.textContent = message;
  el.className = `result-message show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

function setupChecklist() {
  document.getElementById('clAddTodoBtn')?.addEventListener('click', () => {
    addChecklistTodo();
  });

  document.getElementById('clResetBtn')?.addEventListener('click', resetChecklist);
}

function addChecklistTodo(data = {}, options = {}) {
  const id = data.id || `todo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const item = document.createElement('div');
  item.className = 'cl-todo-item';
  item.dataset.todoId = id;

  const header = document.createElement('div');
  header.className = 'cl-todo-header';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'cl-todo-checkbox';
  checkbox.checked = !!data.checked;
  checkbox.addEventListener('change', () => {
    saveChecklistTodos();
    updateChecklistCounter();
  });

  const label = document.createElement('label');
  label.className = 'checkbox-label';
  label.append(checkbox, document.createTextNode('TODO'));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'cl-todo-delete';
  deleteBtn.textContent = 'X';
  deleteBtn.title = 'Eliminar TODO';
  deleteBtn.addEventListener('click', () => removeChecklistTodo(id));

  header.append(label, deleteBtn);

  const textInput = document.createElement('textarea');
  textInput.className = 'cl-todo-text';
  textInput.placeholder = 'Descripcion del TODO...';
  textInput.value = data.text || '';
  textInput.addEventListener('input', saveChecklistTodos);

  const commentsLabel = document.createElement('span');
  commentsLabel.className = 'cl-comments-label';
  commentsLabel.textContent = 'Comments:';

  const commentsInput = document.createElement('textarea');
  commentsInput.className = 'cl-todo-comments';
  commentsInput.placeholder = 'Comments...';
  commentsInput.value = data.comments || '';
  commentsInput.addEventListener('input', () => {
    saveChecklistTodos();
    syncTodosCommentsReadonly();
  });

  item.append(header, textInput, commentsLabel, commentsInput);
  document.getElementById('clTodoList')?.appendChild(item);

  if (!options.silent) {
    saveChecklistTodos();
    syncTodosCommentsReadonly();
    updateChecklistCounter();
  }
}

function removeChecklistTodo(id) {
  document.querySelector(`#clTodoList [data-todo-id="${id}"]`)?.remove();
  saveChecklistTodos();
  syncTodosCommentsReadonly();
  updateChecklistCounter();
}

function renderChecklistTodos(todos) {
  const list = document.getElementById('clTodoList');
  if (!list) return;

  list.replaceChildren();
  todos.forEach(todo => addChecklistTodo(todo, { silent: true }));
  syncTodosCommentsReadonly();
  updateChecklistCounter();
}

async function saveChecklistTodos() {
  if (isLoading) return;

  try {
    const clTodos = Array.from(document.querySelectorAll('#clTodoList .cl-todo-item')).map(item => ({
      id: item.dataset.todoId,
      checked: item.querySelector('.cl-todo-checkbox')?.checked || false,
      text: item.querySelector('.cl-todo-text')?.value || '',
      comments: item.querySelector('.cl-todo-comments')?.value || ''
    }));

    await chrome.storage.local.set({ clTodos });
  } catch (error) {
    console.error('🔴 [SAVE] Error saving checklist todos:', error);
  }
}

function syncTodosCommentsReadonly() {
  const target = document.getElementById('clTodosComments');
  if (!target) return;

  const comments = Array.from(document.querySelectorAll('#clTodoList .cl-todo-comments'))
    .map(textarea => textarea.value.trim())
    .filter(Boolean);

  target.value = comments.join('\n\n');
}

function updateTicketTypeVisibility() {
  const ticketType = document.getElementById('clTicketType')?.value || 'amend';
  const demiseFields = document.getElementById('clDemiseFields');
  const newPageFields = document.getElementById('clNewPageFields');

  if (demiseFields) demiseFields.hidden = ticketType !== 'demise';
  if (newPageFields) newPageFields.hidden = ticketType !== 'new page';
}

function isChecklistCheckboxVisible(checkbox) {
  return !checkbox.closest('[hidden]');
}

function updateChecklistCounter() {
  const checkboxes = [
    document.getElementById('clVerificarContexto'),
    document.getElementById('clVerifAdjuntos'),
    document.getElementById('clVerifRedirecciones'),
    document.getElementById('clVerifCrawl'),
    document.getElementById('clVerifEntrypoints'),
    document.getElementById('clVerifDatosNewPage'),
    ...document.querySelectorAll('#clTodoList .cl-todo-checkbox'),
    document.getElementById('clVerifItempaths'),
    document.getElementById('clVerifComentarios'),
    document.getElementById('clVerifQaLinks')
  ].filter(checkbox => checkbox && isChecklistCheckboxVisible(checkbox));

  const total = checkboxes.length;
  const checked = checkboxes.filter(checkbox => checkbox.checked).length;
  const pending = total - checked;
  const counter = document.getElementById('clCounter');
  if (!counter) return;

  if (pending === 0) {
    counter.textContent = 'Completado';
    counter.className = 'cl-counter cl-counter-done';
    return;
  }

  counter.textContent = `${pending} pendiente${pending === 1 ? '' : 's'}`;
  counter.className = 'cl-counter cl-counter-pending';
}

async function resetChecklist() {
  document.getElementById('clTodoList')?.replaceChildren();

  const clTicketType = document.getElementById('clTicketType');
  const clVerificarContexto = document.getElementById('clVerificarContexto');
  const clVerifAdjuntos = document.getElementById('clVerifAdjuntos');
  const clVerifRedirecciones = document.getElementById('clVerifRedirecciones');
  const clVerifCrawl = document.getElementById('clVerifCrawl');
  const clVerifEntrypoints = document.getElementById('clVerifEntrypoints');
  const clVerifDatosNewPage = document.getElementById('clVerifDatosNewPage');
  const clItempaths = document.getElementById('clItempaths');
  const clVerifItempaths = document.getElementById('clVerifItempaths');
  const clVerifComentarios = document.getElementById('clVerifComentarios');
  const clTodosComments = document.getElementById('clTodosComments');
  const clVerifQaLinks = document.getElementById('clVerifQaLinks');

  if (clTicketType) clTicketType.value = 'amend';
  if (clVerificarContexto) clVerificarContexto.checked = false;
  if (clVerifAdjuntos) clVerifAdjuntos.checked = false;
  if (clVerifRedirecciones) clVerifRedirecciones.checked = false;
  if (clVerifCrawl) clVerifCrawl.checked = false;
  if (clVerifEntrypoints) clVerifEntrypoints.checked = false;
  if (clVerifDatosNewPage) clVerifDatosNewPage.checked = false;
  if (clItempaths) clItempaths.value = '';
  if (clVerifItempaths) clVerifItempaths.checked = false;
  if (clVerifComentarios) clVerifComentarios.checked = false;
  if (clTodosComments) clTodosComments.value = '';
  if (clVerifQaLinks) clVerifQaLinks.checked = false;

  await chrome.storage.local.set({
    clTicketType: 'amend',
    clVerificarContexto: false,
    clVerifAdjuntos: false,
    clVerifRedirecciones: false,
    clVerifCrawl: false,
    clVerifEntrypoints: false,
    clVerifDatosNewPage: false,
    clTodos: [],
    clItempaths: '',
    clVerifItempaths: false,
    clVerifComentarios: false,
    clVerifQaLinks: false
  });
  await chrome.storage.local.remove('clTodosComments');

  updateTicketTypeVisibility();
  updateChecklistCounter();
  showChecklistMessage('Checklist reseteado', 'success');
}

function showChecklistMessage(message, type) {
  const el = document.getElementById('clMessage');
  if (!el) return;

  el.textContent = message;
  el.className = `result-message show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}
