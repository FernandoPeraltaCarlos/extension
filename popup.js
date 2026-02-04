// Default settings
const DEFAULT_SETTINGS = {
  searchUrl: '',
  searchText: false,
  partialSearch: false,
  specialCases: false,
  bgColor: '#FF0000',
  fontSize: '12',
  cleanerInput: '',
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

  // Add change listeners to save settings automatically - AFTER loading
  setupAutoSave();
});

async function handleSearch() {
  const searchUrl = document.getElementById('searchUrl').value.trim();
  const bgColor = document.getElementById('bgColor').value;
  const fontSize = document.getElementById('fontSize').value;
  const searchText = document.getElementById('searchText').checked;
  const partialSearch = document.getElementById('partialSearch').checked;
  const specialCases = document.getElementById('specialCases').checked;

  if (!searchUrl) {
    showMessage('Please enter a URL or text to search', 'error');
    return;
  }

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'search',
      data: {
        searchUrl,
        bgColor,
        fontSize,
        searchText,
        partialSearch,
        specialCases
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
  const cleanerBtn = document.getElementById('cleanerBtn');
  const cleanerCopyBtn = document.getElementById('cleanerCopyBtn');
  const cleanerClearBtn = document.getElementById('cleanerClearBtn');

  if (!cleanerInput || !cleanerOutput || !cleanerBtn || !cleanerCopyBtn || !cleanerClearBtn) {
    return;
  }

  const updateOutput = () => {
    const rawValue = cleanerInput.value.trim();
    cleanerOutput.value = rawValue ? cleanTextToSlug(rawValue) : '';
  };

  cleanerBtn.addEventListener('click', () => {
    updateOutput();
    if (!cleanerOutput.value) {
      showCleanerMessage('Escribe un texto para convertir', 'error');
      return;
    }
    showCleanerMessage('Texto convertido', 'success');
  });

  cleanerInput.addEventListener('input', updateOutput);

  cleanerCopyBtn.addEventListener('click', async () => {
    if (!cleanerOutput.value) {
      showCleanerMessage('No hay nada para copiar', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(cleanerOutput.value);
      showCleanerMessage('Copiado al portapapeles', 'success');
    } catch (error) {
      console.error('Error copying text:', error);
      showCleanerMessage('Error al copiar', 'error');
    }
  });

  cleanerClearBtn.addEventListener('click', async () => {
    cleanerInput.value = '';
    cleanerOutput.value = '';
    await saveSettings();
    showCleanerMessage('Texto limpiado', 'success');
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
    document.getElementById('specialCases').checked = settings.specialCases;
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
      specialCases: document.getElementById('specialCases').checked,
      bgColor: document.getElementById('bgColor').value,
      fontSize: document.getElementById('fontSize').value,
      cleanerInput: document.getElementById('cleanerInput')?.value || ''
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
  const specialCases = document.getElementById('specialCases');
  const bgColor = document.getElementById('bgColor');
  const fontSize = document.getElementById('fontSize');
  const cleanerInput = document.getElementById('cleanerInput');

  // Save on input change
  searchUrl.addEventListener('input', saveSettings);
  searchText.addEventListener('change', saveSettings);
  partialSearch.addEventListener('change', saveSettings);
  specialCases.addEventListener('change', saveSettings);
  bgColor.addEventListener('change', saveSettings);
  fontSize.addEventListener('input', saveSettings);
  if (cleanerInput) {
    cleanerInput.addEventListener('input', saveSettings);
  }
}
