// Import types from formFillerService
import { FormField } from './services/formFillerService';

// Form detection function - enhanced to detect required fields and interactive elements
const detectFormFields = (): FormField[] => {
  const fields: FormField[] = [];
  
  // Detect all form elements including buttons
  const elements = document.querySelectorAll('input, textarea, select, button');
  
  elements.forEach((element, index) => {
    const htmlElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
    
    // Skip hidden fields
    if (htmlElement.type === 'hidden') return;
    
    // Determine element type
    let elementType: 'input' | 'textarea' | 'select' | 'button' | 'checkbox' | 'radio' | 'other' = 'other';
    if (htmlElement.tagName.toLowerCase() === 'button') {
      elementType = 'button';
    } else if (htmlElement.tagName.toLowerCase() === 'textarea') {
      elementType = 'textarea';
    } else if (htmlElement.tagName.toLowerCase() === 'select') {
      elementType = 'select';
    } else if (htmlElement.type === 'checkbox') {
      elementType = 'checkbox';
    } else if (htmlElement.type === 'radio') {
      elementType = 'radio';
    } else if (htmlElement.tagName.toLowerCase() === 'input') {
      elementType = 'input';
    }
    
    // Get label text
    let label = '';
    const labelElement = document.querySelector(`label[for="${htmlElement.id}"]`);
    if (labelElement) {
      label = labelElement.textContent?.trim() || '';
    } else {
      // Try to find nearby text
      const parent = htmlElement.parentElement;
      if (parent) {
        const textNodes = Array.from(parent.childNodes).filter(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        if (textNodes.length > 0) {
          label = textNodes[0].textContent?.trim() || '';
        }
      }
    }
    
    // Check if field is required
    const isRequired = htmlElement.hasAttribute('required') || 
                      htmlElement.getAttribute('aria-required') === 'true' ||
                      label.includes('*') ||
                      label.toLowerCase().includes('required');
    
    // Generate selector
    let selector = '';
    if (htmlElement.id) {
      selector = `#${htmlElement.id}`;
    } else if (htmlElement.name) {
      selector = `[name="${htmlElement.name}"]`;
    } else {
      selector = `${htmlElement.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }
    
    // Get options for select elements
    let options: string[] | undefined;
    if (elementType === 'select') {
      const selectElement = htmlElement as HTMLSelectElement;
      options = Array.from(selectElement.options).map(option => option.text);
    }
    
    // Get checked state for checkboxes and radio buttons
    let checked: boolean | undefined;
    if (elementType === 'checkbox' || elementType === 'radio') {
      checked = (htmlElement as HTMLInputElement).checked;
    }
    
    // Get appropriate label for buttons
    let fieldLabel = label;
    if (elementType === 'button') {
      fieldLabel = htmlElement.textContent?.trim() || htmlElement.value || `Button ${index + 1}`;
    } else if (!fieldLabel) {
      fieldLabel = (htmlElement as HTMLInputElement | HTMLTextAreaElement).placeholder || `Field ${index + 1}`;
    }
    
    fields.push({
      id: htmlElement.id || `field_${index}`,
      label: fieldLabel,
      type: htmlElement.type || htmlElement.tagName.toLowerCase(),
      value: htmlElement.value || '',
      selector: selector,
      required: isRequired,
      elementType: elementType,
      options: options,
      checked: checked
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

// Interactive element handling functions
const clickElement = (selector: string): boolean => {
  try {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.click();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clicking element:', error);
    return false;
  }
};

const toggleCheckbox = (selector: string, checked: boolean): boolean => {
  try {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (element && element.type === 'checkbox') {
      if (element.checked !== checked) {
        element.click();
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error toggling checkbox:', error);
    return false;
  }
};

const selectRadioButton = (selector: string): boolean => {
  try {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (element && element.type === 'radio') {
      element.click();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error selecting radio button:', error);
    return false;
  }
};

const selectOption = (selector: string, value: string): boolean => {
  try {
    const element = document.querySelector(selector) as HTMLSelectElement;
    if (element) {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error selecting option:', error);
    return false;
  }
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
      
    case 'clickElement':
      try {
        const success = clickElement(msg.selector);
        sendResponse({ success });
      } catch (error) {
        console.error('Error clicking element:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    case 'toggleCheckbox':
      try {
        const success = toggleCheckbox(msg.selector, msg.checked);
        sendResponse({ success });
      } catch (error) {
        console.error('Error toggling checkbox:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    case 'selectRadioButton':
      try {
        const success = selectRadioButton(msg.selector);
        sendResponse({ success });
      } catch (error) {
        console.error('Error selecting radio button:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    case 'selectOption':
      try {
        const success = selectOption(msg.selector, msg.value);
        sendResponse({ success });
      } catch (error) {
        console.error('Error selecting option:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});
