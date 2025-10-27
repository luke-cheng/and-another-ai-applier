// Types
interface FormField {
  id: string;
  label: string;
  type: string;
  value: string;
  selector: string;
}

// Form detection function - uses input and label detection
const detectFormFields = (): FormField[] => {
  const fields: FormField[] = [];
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach((input, index) => {
    const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Skip hidden fields
    if (element.type === 'hidden') return;
    
    // Get label text
    let label = '';
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      label = labelElement.textContent?.trim() || '';
    } else {
      // Try to find nearby text
      const parent = element.parentElement;
      if (parent) {
        const textNodes = Array.from(parent.childNodes).filter(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        if (textNodes.length > 0) {
          label = textNodes[0].textContent?.trim() || '';
        }
      }
    }
    
    // Generate selector
    let selector = '';
    if (element.id) {
      selector = `#${element.id}`;
    } else if (element.name) {
      selector = `[name="${element.name}"]`;
    } else {
      selector = `input:nth-of-type(${index + 1})`;
    }
    
    fields.push({
      id: element.id || `field_${index}`,
      label: label || (element as HTMLInputElement | HTMLTextAreaElement).placeholder || `Field ${index + 1}`,
      type: element.type || element.tagName.toLowerCase(),
      value: element.value || '',
      selector: selector
    });
  });
  
  return fields;
};

// Form filling functions
const fillField = (selector: string, value: string): boolean => {
  try {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (element) {
      element.focus();
      element.value = value;
      
      // Trigger change events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error filling field:', error);
    return false;
  }
};

const fillFieldAndTab = (selector: string, value: string): boolean => {
  const success = fillField(selector, value);
  if (success) {
    // Simulate tab key press
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    }
  }
  return success;
};

const navigateToNextPage = (): void => {
  // Look for common "Next" or "Continue" buttons
  const nextSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:contains("Next")',
    'button:contains("Continue")',
    'button:contains("Submit")',
    '.next-button',
    '.continue-button',
    '.submit-button'
  ];
  
  for (const selector of nextSelectors) {
    const button = document.querySelector(selector) as HTMLButtonElement;
    if (button) {
      button.click();
      return;
    }
  }
  
  // If no button found, try to find a form and submit it
  const form = document.querySelector('form');
  if (form) {
    form.submit();
  }
};

// Message listener
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  console.log('Content script received message:', msg);
  
  switch (msg.action) {
    case 'detectFormFields':
      try {
        const fields = detectFormFields();
        sendResponse({ success: true, fields });
      } catch (error) {
        console.error('Error detecting form fields:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    case 'fillField':
      try {
        const success = fillField(msg.selector, msg.value);
        sendResponse({ success });
      } catch (error) {
        console.error('Error filling field:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    case 'fillFieldAndTab':
      try {
        const success = fillFieldAndTab(msg.selector, msg.value);
        sendResponse({ success });
      } catch (error) {
        console.error('Error filling field and tabbing:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    case 'navigateToNextPage':
      try {
        navigateToNextPage();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error navigating to next page:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});
