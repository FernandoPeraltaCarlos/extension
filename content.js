// Store highlighted elements for cleanup
let highlightedElements = [];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search') {
    const count = performSearch(request.data);
    sendResponse({ count });
  } else if (request.action === 'clear') {
    clearHighlights();
    sendResponse({ success: true });
  }
  return true;
});

function performSearch(data) {
  const { searchUrl, bgColor, fontSize, searchText, partialSearch } = data;

  // Clear previous highlights
  clearHighlights();

  let count = 0;

  // Search in link href attributes
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    const matches = partialSearch
      ? href.includes(searchUrl)
      : href === searchUrl;

    if (matches) {
      applyHighlight(link, bgColor, fontSize);
      count++;
    }
  });

  // Search in visible text (if enabled)
  if (searchText) {
    const textNodes = getTextNodesContaining(searchUrl, partialSearch);
    textNodes.forEach(node => {
      highlightTextNode(node, searchUrl, bgColor, fontSize, partialSearch);
      count++;
    });
  }

  return count;
}

function applyHighlight(element, bgColor, fontSize) {
  // Store original styles
  const originalStyles = {
    backgroundColor: element.style.backgroundColor,
    fontSize: element.style.fontSize,
    element: element
  };

  highlightedElements.push(originalStyles);

  // Apply new styles
  element.style.backgroundColor = bgColor;
  element.style.fontSize = fontSize + 'px';
  element.setAttribute('data-highlighted', 'true');
}

function highlightTextNode(node, searchText, bgColor, fontSize, partialSearch) {
  const parent = node.parentNode;
  const text = node.textContent;

  // Create a span wrapper
  const span = document.createElement('span');
  span.style.backgroundColor = bgColor;
  span.style.fontSize = fontSize + 'px';
  span.setAttribute('data-highlighted-text', 'true');
  span.textContent = text;

  // Store original node for cleanup
  highlightedElements.push({
    type: 'textNode',
    span: span,
    originalNode: node,
    parent: parent
  });

  // Replace text node with highlighted span
  parent.replaceChild(span, node);
}

function getTextNodesContaining(searchText, partialSearch) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script and style elements
        if (node.parentElement.tagName === 'SCRIPT' ||
            node.parentElement.tagName === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }

        const text = node.textContent.trim();
        if (!text) return NodeFilter.FILTER_REJECT;

        const matches = partialSearch
          ? text.includes(searchText)
          : text === searchText;

        return matches ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }

  return textNodes;
}

function clearHighlights() {
  highlightedElements.forEach(item => {
    if (item.type === 'textNode') {
      // Restore original text node
      item.parent.replaceChild(item.originalNode, item.span);
    } else {
      // Restore original element styles
      item.element.style.backgroundColor = item.backgroundColor;
      item.element.style.fontSize = item.fontSize;
      item.element.removeAttribute('data-highlighted');
    }
  });

  highlightedElements = [];
}
