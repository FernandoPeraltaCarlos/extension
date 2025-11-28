// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
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
    });
  });

  // Link Finder functionality
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultMessage = document.getElementById('resultMessage');

  searchBtn.addEventListener('click', handleSearch);
  clearBtn.addEventListener('click', handleClear);
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
