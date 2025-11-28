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
  const { searchUrl, bgColor, fontSize, searchText, partialSearch, specialCases } = data;

  // Clear previous highlights
  clearHighlights();

  let count = 0;

  // Get current page domain for URL resolution
  const currentDomain = window.location.origin;
  const currentPath = window.location.pathname;

  // Normalize the search URL
  const normalizedSearchUrl = normalizeUrl(searchUrl, currentDomain);

  // Search in link href attributes
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');

    // Resolve href to absolute URL
    const resolvedHref = resolveUrl(href, currentDomain, currentPath, specialCases);

    if (!resolvedHref) return;

    // Normalize the resolved href
    const normalizedHref = normalizeUrl(resolvedHref, currentDomain);

    // Check if it matches
    const matches = matchesSearch(normalizedHref, normalizedSearchUrl, partialSearch);

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

// Normalize URL for comparison
function normalizeUrl(url, currentDomain) {
  if (!url) return '';

  let normalized = url.trim();

  // If URL doesn't have protocol, add current domain
  if (normalized.startsWith('/')) {
    normalized = currentDomain + normalized;
  } else if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    // Assume it's missing protocol
    normalized = 'https://' + normalized;
  }

  try {
    const urlObj = new URL(normalized);

    // Normalize protocol (treat http and https as same)
    let protocol = 'https:';

    // Normalize hostname (treat www and non-www as same)
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Rebuild normalized URL
    let normalizedResult = protocol + '//' + hostname + urlObj.pathname;

    // Remove trailing slash for consistency (except for root)
    if (normalizedResult.endsWith('/') && normalizedResult.length > protocol.length + hostname.length + 3) {
      normalizedResult = normalizedResult.slice(0, -1);
    }

    return normalizedResult;
  } catch (e) {
    return normalized;
  }
}

// Resolve relative URLs to absolute
function resolveUrl(href, currentDomain, currentPath, specialCases) {
  if (!href) return null;

  const trimmedHref = href.trim();

  // Absolute URLs (http:// or https://)
  if (trimmedHref.startsWith('http://') || trimmedHref.startsWith('https://')) {
    return trimmedHref;
  }

  // Protocol-relative URLs (//example.com/path)
  if (trimmedHref.startsWith('//')) {
    if (specialCases) {
      return 'https:' + trimmedHref;
    }
    return null;
  }

  // Absolute paths (/path)
  if (trimmedHref.startsWith('/')) {
    return currentDomain + trimmedHref;
  }

  // Relative paths (./ or ../)
  if (trimmedHref.startsWith('./') || trimmedHref.startsWith('../')) {
    if (specialCases) {
      try {
        // Use URL constructor to resolve relative paths
        const baseUrl = currentDomain + currentPath;
        const resolved = new URL(trimmedHref, baseUrl);
        return resolved.href;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Other relative paths (path/to/file)
  if (specialCases) {
    try {
      const baseUrl = currentDomain + currentPath;
      const resolved = new URL(trimmedHref, baseUrl);
      return resolved.href;
    } catch (e) {
      return null;
    }
  }

  return null;
}

// Check if normalized href matches normalized search URL
function matchesSearch(normalizedHref, normalizedSearchUrl, partialSearch) {
  if (!normalizedHref || !normalizedSearchUrl) return false;

  if (partialSearch) {
    // Partial search: href must START WITH search URL
    return normalizedHref.startsWith(normalizedSearchUrl);
  } else {
    // Exact match
    return normalizedHref === normalizedSearchUrl;
  }
}
