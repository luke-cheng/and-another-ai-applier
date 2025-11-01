// Field Detection Utilities
// Detects and analyzes form fields on the page

import { FormField, FormFieldType } from "../serviceWorker/ai_services/formFillerService/type";

// Generate unique ID for form fields
let fieldIdCounter = 0;
export function generateFieldId(): string {
  return `ai-applier-field-${++fieldIdCounter}`;
}

// Get label text for a form field
export function getFieldLabel(element: HTMLElement): string {
  // Try multiple methods to get label
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || "";
  }

  // Check aria-labelledby (follow ID references)
  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const ids = ariaLabelledBy.split(/\s+/);
    const labelTexts: string[] = [];
    ids.forEach(labelledById => {
      const labelledByElement = document.getElementById(labelledById);
      if (labelledByElement) {
        const text = labelledByElement.textContent?.trim();
        if (text) labelTexts.push(text);
      }
    });
    if (labelTexts.length > 0) {
      return labelTexts.join(" ");
    }
  }

  // Check aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();

  // Check placeholder
  const placeholder = (element as HTMLInputElement).placeholder;
  if (placeholder) return placeholder.trim();

  // Check parent label
  const parentLabel = element.closest("label");
  if (parentLabel) {
    const text = parentLabel.textContent?.trim();
    if (text) return text;
  }

  // For custom dropdowns, check parent containers for label
  const role = element.getAttribute("role");
  const isCustomDropdown = role === "combobox" || 
                           element.classList.contains("select-shell") ||
                           element.classList.contains("select__control");
  
  if (isCustomDropdown || element.closest(".select-shell") || element.closest(".select__container")) {
    // Look for label in parent containers
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      // Check for label element as sibling or parent
      const labelInParent = parent.querySelector("label");
      if (labelInParent) {
        const labelText = labelInParent.textContent?.trim();
        if (labelText && labelText.length > 0 && labelText.length < 200) {
          return labelText;
        }
      }
      
      // Check for preceding label sibling
      const prevLabel = parent.previousElementSibling;
      if (prevLabel && prevLabel.tagName === "LABEL") {
        const labelText = prevLabel.textContent?.trim();
        if (labelText && labelText.length > 0 && labelText.length < 200) {
          return labelText;
        }
      }
      
      parent = parent.parentElement;
      depth++;
    }
  }

  // Check preceding sibling
  const prevSibling = element.previousElementSibling;
  if (prevSibling) {
    if (prevSibling.tagName === "LABEL" || prevSibling.tagName === "SPAN") {
      const text = prevSibling.textContent?.trim();
      if (text && text.length < 200) return text;
    }
    
    // Check if preceding sibling contains a label
    if (prevSibling.tagName === "DIV" || prevSibling.tagName === "SPAN") {
      const labelInSibling = prevSibling.querySelector("label");
      if (labelInSibling) {
        const text = labelInSibling.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) return text;
      }
    }
  }

  // Check name attribute
  const name = element.getAttribute("name");
  if (name) return name.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return "Unlabeled Field";
}

// Check if a field is empty
export function isFieldEmpty(field: FormField): boolean {
  if (field.disabled) return false; // Skip disabled fields

  const value = field.value;
  
  if (value === undefined || value === null) return true;
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (typeof value === 'boolean') {
    return !value;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(v => !v || (typeof v === 'string' && v.trim() === ''));
  }
  
  return false;
}

// Check if a field element is currently empty (reads from DOM)
export function isFieldElementEmpty(element: HTMLElement, fieldType: FormFieldType): boolean {
  try {
    if (element instanceof HTMLInputElement) {
      if (fieldType === 'checkbox' || fieldType === 'radio') {
        return !element.checked;
      } else {
        return !element.value || element.value.trim() === '';
      }
    } else if (element instanceof HTMLTextAreaElement) {
      return !element.value || element.value.trim() === '';
    } else if (element instanceof HTMLSelectElement) {
      return !element.value || element.value === '' || element.selectedIndex === -1;
    } else if (fieldType === 'custom-dropdown') {
      // Check inner input value
      const innerInput = element.querySelector<HTMLInputElement>('.select__input, input[role="combobox"], input');
      if (innerInput) {
        return !innerInput.value || innerInput.value.trim() === '';
      }
      
      // Check for selected option text/indicators
      const selectedOption = element.querySelector('[aria-selected="true"], .selected, .is-selected');
      if (selectedOption) {
        const optionText = selectedOption.textContent?.trim();
        if (optionText && optionText.length > 0 && optionText !== 'Select...') {
          return false;
        }
      }
      
      // Check placeholder state
      const placeholder = element.querySelector('.select__placeholder');
      if (placeholder && placeholder.textContent?.trim() && 
          !placeholder.classList.contains('select__placeholder--is-hidden')) {
        return true; // Showing placeholder means empty
      }
      
      // Check if value attribute or text content indicates a selection
      const valueContainer = element.querySelector('.select__value-container, .select__single-value');
      if (valueContainer) {
        const valueText = valueContainer.textContent?.trim();
        if (valueText && valueText.length > 0 && valueText !== 'Select...') {
          return false;
        }
      }
      
      return true; // Default to empty if we can't determine
    }
  } catch (error) {
    console.warn('Error checking if field is empty:', error);
  }
  return true; // Default to empty if we can't determine
}

// Get full description text for a field (from aria-describedby, description divs, fieldsets)
export function getFieldDescription(element: HTMLElement): string {
  const descriptionParts: string[] = [];

  // Check aria-describedby attribute
  const ariaDescribedBy = element.getAttribute("aria-describedby");
  if (ariaDescribedBy) {
    const describedElement = document.getElementById(ariaDescribedBy);
    if (describedElement) {
      const text = describedElement.textContent?.trim();
      if (text) descriptionParts.push(text);
    }
  }

  // Check for description elements nearby
  const parent = element.parentElement;
  if (parent) {
    // Look for .description, .WizardFieldDescription classes in siblings or parent
    const descriptionElement = parent.querySelector('.description, .WizardFieldDescription');
    if (descriptionElement) {
      const text = descriptionElement.textContent?.trim();
      if (text && !descriptionParts.includes(text)) descriptionParts.push(text);
    }
  }

  // Check parent fieldset for legend text
  const fieldset = element.closest("fieldset");
  if (fieldset) {
    const legend = fieldset.querySelector("legend");
    if (legend) {
      const text = legend.textContent?.trim();
      if (text && !descriptionParts.includes(text)) descriptionParts.push(text);
    }

    // Also check for description divs in the fieldset
    const fieldsetDescriptions = fieldset.querySelectorAll('.description, .WizardFieldDescription');
    fieldsetDescriptions.forEach(desc => {
      const text = desc.textContent?.trim();
      if (text && !descriptionParts.includes(text)) descriptionParts.push(text);
    });
  }

  return descriptionParts.join(" ").substring(0, 500);
}

// Get format hint for date/month inputs
export function getFormatHint(inputType: string): string | undefined {
  const formatHints: Record<string, string> = {
    month: "YYYY-MM",
    date: "YYYY-MM-DD",
    "datetime-local": "YYYY-MM-DDTHH:mm",
    time: "HH:mm",
    week: "YYYY-Www"
  };
  return formatHints[inputType];
}

// Get surrounding context text
export function getSurroundingText(element: HTMLElement): string {
  const parent = element.parentElement;
  if (!parent) return "";

  // Get text from parent and siblings
  const textParts: string[] = [];

  // Check previous siblings
  let prev = element.previousElementSibling;
  let count = 0;
  while (prev && count < 2) {
    const text = prev.textContent?.trim();
    if (text && text.length < 100) textParts.push(text);
    prev = prev.previousElementSibling;
    count++;
  }

  // Check parent text
  const parentText = parent.textContent?.trim();
  if (parentText && parentText.length < 200) {
    textParts.push(parentText);
  }

  return textParts.join(" ").substring(0, 200);
}

// Determine if an element is likely a form field
// Filters out buttons, links, and non-interactive elements (unless they have form-related roles)
export function isFormFieldElement(element: HTMLElement): boolean {
  // Skip disabled or hidden elements
  if (element.hasAttribute('disabled')) return false;
  if (element.hasAttribute('hidden')) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const type = (element as HTMLInputElement).type;

  // Standard form elements are always form fields
  if (tagName === 'input') {
    // Exclude button-like inputs
    if (type === 'submit' || type === 'button' || type === 'reset' || type === 'hidden') {
      return false;
    }
    return true;
  }

  if (tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  // Check for form-related ARIA roles
  const formRoles = ['textbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'listbox'];
  if (role && formRoles.includes(role)) {
    return true;
  }

  // Elements with contenteditable might be rich text editors
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  // Elements with form-related attributes
  if (element.hasAttribute('name') || 
      element.hasAttribute('aria-label') || 
      element.hasAttribute('aria-labelledby') ||
      element.hasAttribute('aria-describedby') ||
      element.hasAttribute('aria-required')) {
    // But exclude if it's clearly not a form field (button, link, etc.)
    if (tagName === 'button' || tagName === 'a') {
      // Unless it has a form-related role
      if (!role || !formRoles.includes(role)) {
        return false;
      }
    }
    return true;
  }

  // Elements inside a form tag are likely form fields
  if (element.closest('form')) {
    // But exclude buttons and links unless they have form roles
    if (tagName === 'button' || tagName === 'a') {
      return role ? formRoles.includes(role) : false;
    }
    // Other elements in forms might be form fields
    if (tagName === 'div' || tagName === 'span') {
      return true; // Be permissive - let AI filter if wrong
    }
  }

  // Custom dropdown patterns
  if (element.classList.contains('select-shell') || 
      element.classList.contains('select__control') ||
      element.hasAttribute('aria-haspopup')) {
    return true;
  }

  return false;
}

// Group radio buttons by name attribute
function groupRadioButtons(): FormField[] {
  const groups = new Map<string, HTMLInputElement[]>();
  const processedRadios = new Set<HTMLInputElement>();
  const fields: FormField[] = [];

  // Collect all radio buttons
  const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');
  
  radios.forEach(radio => {
    if (radio.disabled || radio.name === "") return;
    
    if (!groups.has(radio.name)) {
      groups.set(radio.name, []);
    }
    groups.get(radio.name)!.push(radio);
  });

  // Create radio-group field for each group
  groups.forEach((radios, name) => {
    if (radios.length === 0) return;

    const id = generateFieldId();
    
    // Get label from first radio or parent fieldset
    let label = getFieldLabel(radios[0]);
    if (!label || label === "Unlabeled Field") {
      const fieldset = radios[0].closest("fieldset");
      if (fieldset) {
        const legend = fieldset.querySelector("legend");
        if (legend) label = legend.textContent?.trim() || "Radio Group";
      }
    }

    const description = getFieldDescription(radios[0]);
    const required = radios.some(r => r.required);

    // Extract options from radio buttons
    const options = radios.map(radio => {
      const radioLabel = document.querySelector<HTMLLabelElement>(`label[for="${radio.id}"]`);
      const labelText = radioLabel?.textContent?.trim() || radio.value;
      
      return {
        value: radio.value,
        label: labelText,
        selected: radio.checked,
        id: radio.id,
        element: radio
      };
    });

    const field: FormField = {
      id,
      name,
      label,
      type: "radio-group",
      selector: `input[type="radio"][name="${name}"]`,
      required,
      disabled: false,
      options,
      surroundingText: radios[0].textContent?.trim(),
      description,
      groupName: name,
      isGroup: true
    };

    fields.push(field);
    radios.forEach(r => processedRadios.add(r));
  });

  return fields;
}

// Group checkboxes by fieldset or name pattern
function groupCheckboxes(): FormField[] {
  const groups = new Map<string, { checkboxes: HTMLInputElement[]; label: string; description: string }>();
  const processedCheckboxes = new Set<HTMLInputElement>();
  const fields: FormField[] = [];

  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  
  checkboxes.forEach(checkbox => {
    if (checkbox.disabled || processedCheckboxes.has(checkbox)) return;

    // Try to find a group
    let groupKey = "";
    let groupLabel = "";
    let groupDescription = "";

    // Check if in a fieldset with other checkboxes
    const fieldset = checkbox.closest("fieldset");
    if (fieldset) {
      const fieldsetCheckboxes = fieldset.querySelectorAll('input[type="checkbox"]');
      if (fieldsetCheckboxes.length > 1) {
        // This is a checkbox group
        const legend = fieldset.querySelector("legend");
        groupLabel = legend?.textContent?.trim() || "Checkbox Group";
        groupKey = `fieldset-${fieldset.className}-${fieldset.id}`;
        groupDescription = getFieldDescription(checkbox);
      }
    }

    // If no fieldset group, check for array-style names (name[], name[0], etc.)
    if (!groupKey && checkbox.name) {
      const baseName = checkbox.name.replace(/\[\d*\]$/, '');
      const matchingCheckboxes = Array.from(document.querySelectorAll<HTMLInputElement>(
        `input[type="checkbox"][name^="${baseName}"]`
      )).filter(cb => !cb.disabled);
      
      if (matchingCheckboxes.length > 1) {
        groupKey = `array-${baseName}`;
        groupLabel = baseName.replace(/[_-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        groupDescription = getFieldDescription(checkbox);
      }
    }

    // If we found a group
    if (groupKey) {
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { checkboxes: [], label: groupLabel, description: groupDescription });
      }
      groups.get(groupKey)!.checkboxes.push(checkbox);
      processedCheckboxes.add(checkbox);
    }
  });

  // Create checkbox-group fields
  groups.forEach((group, key) => {
    if (group.checkboxes.length < 2) return; // Need at least 2 checkboxes to be a group

    const id = generateFieldId();
    const required = group.checkboxes.some(cb => cb.required);

    const options = group.checkboxes.map(checkbox => {
      const checkboxLabel = document.querySelector<HTMLLabelElement>(`label[for="${checkbox.id}"]`);
      const labelText = checkboxLabel?.textContent?.trim() || checkbox.value;
      
      return {
        value: checkbox.value,
        label: labelText,
        selected: checkbox.checked,
        id: checkbox.id,
        element: checkbox
      };
    });

    const field: FormField = {
      id,
      label: group.label,
      type: "checkbox-group",
      selector: group.checkboxes[0].name ? `input[type="checkbox"][name^="${group.checkboxes[0].name}"]` : '#invalid',
      required,
      disabled: false,
      options,
      description: group.description,
      isGroup: true
    };

    fields.push(field);
  });

  return fields;
}

// Determine field type from element properties
function determineFieldType(element: HTMLElement): FormFieldType {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const type = (element as HTMLInputElement).type;
  const ariaHasPopup = element.getAttribute('aria-haspopup');
  
  // Custom dropdown detection
  if (role === 'combobox' || 
      ariaHasPopup === 'listbox' || 
      ariaHasPopup === 'true' ||
      element.classList.contains('select-shell') ||
      element.classList.contains('select__control')) {
    return 'custom-dropdown';
  }

  // Standard HTML elements
  if (tagName === 'input') {
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'file';
    if (type === 'hidden') return 'hidden';
    if (type === 'range') return 'range';
    if (type === 'color') return 'color';
    if (type === 'search') return 'search';
    if (type === 'number') return 'number';
    if (type === 'date' || type === 'datetime-local' || type === 'time' || type === 'month' || type === 'week') {
      return type as FormFieldType;
    }
    if (type === 'email') return 'email';
    if (type === 'tel') return 'tel';
    if (type === 'url') return 'url';
    if (type === 'password') return 'password';
    return 'text';
  }

  if (tagName === 'textarea') {
    return 'textarea';
  }

  if (tagName === 'select') {
    return (element as HTMLSelectElement).multiple ? 'multi-select' : 'select';
  }

  // ARIA roles
  if (role === 'textbox') {
    return element.getAttribute('contenteditable') === 'true' ? 'textarea' : 'text';
  }
  if (role === 'checkbox') return 'checkbox';
  if (role === 'radio') return 'radio';
  if (role === 'switch') return 'checkbox';
  if (role === 'slider') return 'range';
  if (role === 'listbox') return 'select';

  // Default to text for unknown form fields
  return 'text';
}

// Extract options from a custom dropdown (comprehensive expansion and extraction)
// Uses keyboard events (Space, Enter, ArrowDown) and mouse clicks to expand dropdowns
async function extractCustomDropdownOptions(element: HTMLElement): Promise<Array<{ value: string; label: string; selected?: boolean }>> {
  const options: Array<{ value: string; label: string; selected?: boolean }> = [];
  
  try {
    // First, try to find options already in the DOM (some dropdowns render all options)
    const optionSelectors = [
      '[role="option"]',
      '.select__option',
      '.react-select__option',
      '.react-select__option:not([aria-hidden="true"])',
      '.select-option',
      '.dropdown-item',
      '.menu-item',
      '[data-option-index]'
    ];

    // Check if options are already visible in the container or parent
    const container = element.closest('.select-shell, .select__container, [role="combobox"]') || element.parentElement;
    for (const selector of optionSelectors) {
      const foundOptions = container?.querySelectorAll(selector);
      if (foundOptions && foundOptions.length > 0) {
        // Check if options are actually visible
        let visibleCount = 0;
        foundOptions.forEach(opt => {
          const style = window.getComputedStyle(opt as HTMLElement);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            visibleCount++;
            const value = opt.getAttribute('value') || 
                         opt.getAttribute('data-value') || 
                         opt.getAttribute('id') ||
                         opt.textContent?.trim() || '';
            const label = opt.textContent?.trim() || value;
            const selected = opt.getAttribute('aria-selected') === 'true' || 
                           opt.classList.contains('selected') ||
                           opt.classList.contains('is-selected') ||
                           opt.classList.contains('react-select__option--is-selected');
            options.push({ value, label, selected });
          }
        });
        if (visibleCount > 0) {
          console.debug(`Found ${visibleCount} already-visible options for dropdown`);
          return options;
        }
      }
    }

    // Options not visible, need to expand dropdown
    const isExpanded = element.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      // Already expanded, try to extract options
      return await extractVisibleOptions(container || element);
    }

    // Find the focusable element (inner input or container)
    let focusableElement: HTMLElement = element;
    const innerInput = element.querySelector<HTMLElement>('.select__input, input[role="combobox"], input[tabindex]');
    if (innerInput) {
      focusableElement = innerInput;
    }

    // Helper to create a new MutationObserver promise for each expansion attempt
    const createOptionsObserver = (): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            resolve(false);
          }
        }, 1500); // Max 1.5 seconds wait per attempt

        const observer = new MutationObserver(() => {
          // Check if options menu appeared
          const menuSelectors = [
            '[role="listbox"]',
            '.select__menu',
            '.react-select__menu',
            '.select-menu',
            '[role="menu"]'
          ];
          
          for (const selector of menuSelectors) {
            const menu = document.querySelector(selector);
            if (menu) {
              const style = window.getComputedStyle(menu);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve(true);
                  return;
                }
              }
          }
          }

          // Also check for option elements directly
          const optionElements = document.querySelectorAll('[role="option"]');
          if (optionElements.length > 0) {
            let visibleOptions = 0;
            optionElements.forEach(opt => {
              const style = window.getComputedStyle(opt as HTMLElement);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                visibleOptions++;
              }
            });
            if (visibleOptions > 0 && !resolved) {
              resolved = true;
              clearTimeout(timeout);
              observer.disconnect();
              resolve(true);
              return;
            }
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'aria-expanded', 'aria-hidden']
        });
      });
    };

    // Try multiple expansion methods sequentially
    const expansionMethods = [
      // Method 1: Focus and press Space
      async () => {
        focusableElement.focus();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const spaceEvent = new KeyboardEvent('keydown', {
          key: ' ',
          code: 'Space',
          keyCode: 32,
          bubbles: true,
          cancelable: true
        });
        focusableElement.dispatchEvent(spaceEvent);
        
        const spacePress = new KeyboardEvent('keypress', {
          key: ' ',
          code: 'Space',
          keyCode: 32,
          bubbles: true,
          cancelable: true
        });
        focusableElement.dispatchEvent(spacePress);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const spaceUp = new KeyboardEvent('keyup', {
          key: ' ',
          code: 'Space',
          keyCode: 32,
          bubbles: true,
          cancelable: true
        });
        focusableElement.dispatchEvent(spaceUp);
      },
      
      // Method 2: Press Enter
      async () => {
        focusableElement.focus();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const enterDown = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          bubbles: true,
          cancelable: true
        });
        focusableElement.dispatchEvent(enterDown);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const enterUp = new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          bubbles: true,
          cancelable: true
        });
        focusableElement.dispatchEvent(enterUp);
      },
      
      // Method 3: Press ArrowDown
      async () => {
        focusableElement.focus();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const arrowDown = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          code: 'ArrowDown',
          keyCode: 40,
          bubbles: true,
          cancelable: true
        });
        focusableElement.dispatchEvent(arrowDown);
      },
      
      // Method 4: Mouse click
      async () => {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        element.dispatchEvent(clickEvent);
        
        // Also try mousedown/mouseup
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 50));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      }
    ];

    // Try each expansion method and wait for options to appear
    for (const method of expansionMethods) {
      try {
        // Create a new observer promise for this attempt
        const optionsAppeared = createOptionsObserver();
        
        await method();
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for dropdown to expand
        
        // Check if options appeared
        const appeared = await Promise.race([
          optionsAppeared,
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 400))
        ]);
        
        if (appeared) {
          // Options menu appeared, extract them
          const extracted = await extractVisibleOptions(container || element);
          if (extracted.length > 0) {
            console.debug(`Successfully extracted ${extracted.length} options using expansion method`);
            // Close dropdown by blurring (optional, but cleaner)
            focusableElement.blur();
            return extracted;
          }
        }
        
        // Try extracting anyway (sometimes options appear but observer doesn't catch it)
        const extracted = await extractVisibleOptions(container || element);
        if (extracted.length > 0) {
          console.debug(`Successfully extracted ${extracted.length} options after expansion`);
          focusableElement.blur();
          return extracted;
        }
      } catch (error) {
        console.debug('Error in expansion method:', error);
        continue; // Try next method
      }
    }

    // If all methods failed, try one final extraction
    return await extractVisibleOptions(container || element);
  } catch (error) {
    console.debug('Could not extract dropdown options:', error);
  }

  return options;
}

// Helper function to extract visible options from the DOM
async function extractVisibleOptions(container: HTMLElement | Element | null): Promise<Array<{ value: string; label: string; selected?: boolean }>> {
  const options: Array<{ value: string; label: string; selected?: boolean }> = [];
  
  if (!container) return options;

  const optionSelectors = [
    '[role="option"]',
    '.select__option',
    '.react-select__option',
    '.select-option',
    '.dropdown-item',
    '.menu-item',
    '[data-option-index]'
  ];

  // Also search in document in case menu is rendered outside container
  const searchContainers = [container, document.body];

  for (const searchContainer of searchContainers) {
    for (const selector of optionSelectors) {
      const foundOptions = searchContainer.querySelectorAll(selector);
      if (foundOptions && foundOptions.length > 0) {
        foundOptions.forEach(opt => {
          const style = window.getComputedStyle(opt as HTMLElement);
          // Only include visible options
          if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
            const value = opt.getAttribute('value') || 
                         opt.getAttribute('data-value') || 
                         opt.getAttribute('data-option-value') ||
                         opt.getAttribute('id') ||
                         opt.textContent?.trim() || '';
            const label = opt.textContent?.trim() || value;
            
            // Skip placeholder/empty options
            if (label === 'Select...' || label === '' || label.toLowerCase() === 'none') {
              return;
            }
            
            const selected = opt.getAttribute('aria-selected') === 'true' || 
                           opt.classList.contains('selected') ||
                           opt.classList.contains('is-selected') ||
                           opt.classList.contains('react-select__option--is-selected');
            
            // Avoid duplicates
            if (!options.find(o => o.value === value && o.label === label)) {
              options.push({ value, label, selected });
            }
          }
        });
      }
    }
  }

  return options;
}

// Detect form fields by finding all focusable elements
function detectFocusableFormFields(): FormField[] {
  const fields: FormField[] = [];
  const processedIds = new Set<string>();

  // Find all potentially focusable form elements
  const selectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'textarea',
    'select',
    '[role="combobox"]',
    '[role="textbox"]',
    '[role="listbox"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
    '.select-shell',
    '.select__control',
    '[aria-haspopup="true"]'
  ];

  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      elements.forEach(element => {
        // Skip if disabled or hidden
        if (!isFormFieldElement(element)) return;

        // Skip if already processed
        const elementId = element.id || generateFieldId();
        if (processedIds.has(elementId)) return;

        // For custom dropdowns, find the inner input element
        let targetElement = element;
        if (element.getAttribute('role') === 'combobox' || 
            element.classList.contains('select-shell') ||
            element.classList.contains('select__control')) {
          // Look for inner input
          const innerInput = element.querySelector<HTMLInputElement>('.select__input, input[role="combobox"], input');
          if (innerInput && isFormFieldElement(innerInput)) {
            targetElement = innerInput;
          }
        }

        // Ensure element has ID
        if (!targetElement.id) {
          targetElement.id = elementId;
        }

        const fieldType = determineFieldType(targetElement);
        const field: FormField = {
          id: targetElement.id,
          name: targetElement.getAttribute('name') || undefined,
          label: getFieldLabel(targetElement),
          type: fieldType,
          selector: `#${targetElement.id}`,
          placeholder: (targetElement as HTMLInputElement).placeholder || undefined,
          required: targetElement.hasAttribute('required') || targetElement.getAttribute('aria-required') === 'true',
          disabled: targetElement.hasAttribute('disabled'),
          value: (targetElement as HTMLInputElement).value || undefined,
          surroundingText: getSurroundingText(targetElement),
          description: getFieldDescription(targetElement),
          formatHint: getFormatHint((targetElement as HTMLInputElement).type)
        };

        // For custom dropdowns, try to extract options (async but we'll do it synchronously here)
        if (fieldType === 'custom-dropdown') {
          // Options will be extracted later if needed, or AI can handle without options
          field.options = [];
        }

        fields.push(field);
        processedIds.add(targetElement.id);
      });
    } catch (error) {
      console.debug(`Error in selector ${selector}:`, error);
    }
  });

  return fields;
}

// Detect form fields by tab order (comprehensive fallback)
function detectByTabOrder(): FormField[] {
  const fields: FormField[] = [];
  const processedIds = new Set<string>();

  // Get all elements that can receive focus
  const focusableSelectors = [
    'input:not([type="hidden"]):not([tabindex="-1"])',
    'textarea:not([tabindex="-1"])',
    'select:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="combobox"]',
    '[role="textbox"]',
    '[contenteditable="true"]'
  ];

  focusableSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      elements.forEach(element => {
        if (!isFormFieldElement(element)) return;

        const elementId = element.id || generateFieldId();
        if (processedIds.has(elementId)) return;

        if (!element.id) {
          element.id = elementId;
        }

        const fieldType = determineFieldType(element);
        const field: FormField = {
          id: element.id,
          name: element.getAttribute('name') || undefined,
          label: getFieldLabel(element),
          type: fieldType,
          selector: `#${element.id}`,
          placeholder: (element as HTMLInputElement).placeholder || undefined,
          required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
          disabled: element.hasAttribute('disabled'),
          value: (element as HTMLInputElement).value || undefined,
          surroundingText: getSurroundingText(element),
          description: getFieldDescription(element),
          formatHint: getFormatHint((element as HTMLInputElement).type)
        };

        fields.push(field);
        processedIds.add(element.id);
      });
    } catch (error) {
      console.debug(`Error in tab order selector ${selector}:`, error);
    }
  });

  return fields;
}

// Detect form fields via ARIA attributes and roles
function detectAccessibilityFields(): FormField[] {
  const fields: FormField[] = [];
  const processedIds = new Set<string>();

  // Find elements with form-related ARIA roles
  const roleSelectors = [
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="slider"]',
    '[role="listbox"]'
  ];

  roleSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      elements.forEach(element => {
        if (!isFormFieldElement(element)) return;

        const elementId = element.id || generateFieldId();
        if (processedIds.has(elementId)) return;

        if (!element.id) {
          element.id = elementId;
        }

        const fieldType = determineFieldType(element);
        const field: FormField = {
          id: element.id,
          name: element.getAttribute('name') || undefined,
          label: getFieldLabel(element),
          type: fieldType,
          selector: `#${element.id}`,
          placeholder: (element as HTMLInputElement).placeholder || undefined,
          required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
          disabled: element.hasAttribute('disabled'),
          value: (element as HTMLInputElement).value || undefined,
          surroundingText: getSurroundingText(element),
          description: getFieldDescription(element),
          formatHint: getFormatHint((element as HTMLInputElement).type)
        };

        fields.push(field);
        processedIds.add(element.id);
      });
    } catch (error) {
      console.debug(`Error in role selector ${selector}:`, error);
    }
  });

  // Find elements with form-related ARIA attributes inside forms
  const formElements = document.querySelectorAll('form [aria-label], form [aria-labelledby], form [aria-describedby], form [aria-required="true"]');
  formElements.forEach(element => {
    if (!(element instanceof HTMLElement)) return;
    if (!isFormFieldElement(element)) return;

    const elementId = element.id || generateFieldId();
    if (processedIds.has(elementId)) return;

    if (!element.id) {
      element.id = elementId;
    }

    const fieldType = determineFieldType(element);
    const field: FormField = {
      id: element.id,
      name: element.getAttribute('name') || undefined,
      label: getFieldLabel(element),
      type: fieldType,
      selector: `#${element.id}`,
      placeholder: (element as HTMLInputElement).placeholder || undefined,
      required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
      disabled: element.hasAttribute('disabled'),
      value: (element as HTMLInputElement).value || undefined,
      surroundingText: getSurroundingText(element),
      description: getFieldDescription(element),
      formatHint: getFormatHint((element as HTMLInputElement).type)
    };

    fields.push(field);
    processedIds.add(element.id);
  });

  return fields;
}

// Detect custom dropdowns (React Select and similar patterns)
async function detectCustomDropdowns(): Promise<FormField[]> {
  const fields: FormField[] = [];
  const processedIds = new Set<string>();

  // Patterns for custom dropdowns
  const dropdownSelectors = [
    '[role="combobox"]',
    '.select-shell',
    '.select__control',
    '[aria-haspopup="listbox"]',
    '[aria-haspopup="true"][aria-expanded]'
  ];

  for (const selector of dropdownSelectors) {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      
      for (const container of Array.from(elements)) {
        if (!isFormFieldElement(container)) continue;

        // Find the inner input element
        let inputElement: HTMLElement | null = container.querySelector('.select__input, input[role="combobox"], input');
        
        // If no inner input, use the container itself
        if (!inputElement) {
          inputElement = container;
        }

        // Skip if already processed
        const elementId = inputElement.id || generateFieldId();
        if (processedIds.has(elementId)) continue;

        // Ensure element has ID
        if (!inputElement.id) {
          inputElement.id = elementId;
        }

        // Extract options (with comprehensive expansion techniques)
        console.debug(`[CUSTOM DROPDOWN] Extracting options for dropdown: ${inputElement.id}`);
        const options = await extractCustomDropdownOptions(container);
        
        // Get description
        let description = getFieldDescription(inputElement);
        
        if (options.length > 0) {
          console.debug(`[CUSTOM DROPDOWN] ✓ Extracted ${options.length} options for ${inputElement.id}`);
        } else {
          console.debug(`[CUSTOM DROPDOWN] ⚠ No options extracted for ${inputElement.id} (including DOM context for AI)`);
          
          // If we couldn't extract options, include DOM structure context for AI to parse
          // This helps AI understand the dropdown structure even without extracted options
          try {
            const containerHTML = container.outerHTML.substring(0, 1000); // First 1000 chars
            const parentHTML = container.parentElement?.outerHTML.substring(0, 500) || '';
            
            // Look for any option-related elements in the DOM (even if hidden)
            const hiddenOptions = container.querySelectorAll('[role="option"], .select__option, [data-value]');
            const optionHints: string[] = [];
            if (hiddenOptions.length > 0) {
              hiddenOptions.forEach((opt, idx) => {
                if (idx < 5) { // Limit to first 5 hints
                  const text = opt.textContent?.trim();
                  if (text && text.length < 50) {
                    optionHints.push(text);
                  }
                }
              });
            }
            
            const contextInfo = [
              `Dropdown container structure: ${containerHTML}`,
              optionHints.length > 0 ? `Found ${hiddenOptions.length} option elements (first few: ${optionHints.join(', ')})` : '',
              `Parent structure: ${parentHTML}`
            ].filter(Boolean).join(' | ');
            
            if (contextInfo) {
              description = description ? `${description}. ${contextInfo}` : contextInfo;
            }
          } catch (error) {
            console.debug('Error extracting DOM context:', error);
          }
        }

        const field: FormField = {
          id: inputElement.id,
          name: inputElement.getAttribute('name') || undefined,
          label: getFieldLabel(inputElement),
          type: 'custom-dropdown',
          selector: `#${inputElement.id}`,
          placeholder: (inputElement as HTMLInputElement).placeholder || 
                      container.querySelector('.select__placeholder')?.textContent?.trim() || 
                      undefined,
          required: inputElement.hasAttribute('required') || 
                   container.hasAttribute('aria-required') ||
                   container.querySelector('[required]') !== null,
          disabled: inputElement.hasAttribute('disabled') || container.hasAttribute('aria-disabled'),
          value: (inputElement as HTMLInputElement).value || undefined,
          options: options.length > 0 ? options : undefined,
          surroundingText: getSurroundingText(inputElement),
          description: description
        };

        fields.push(field);
        processedIds.add(inputElement.id);
        
        // Small delay between dropdowns to avoid UI conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.debug(`Error detecting custom dropdowns with ${selector}:`, error);
    }
  }

  return fields;
}

// Detect all form fields on the page
// Ensures each element has an id attribute set for fieldId mapping
// If filterEmpty is true, only returns fields that are currently empty
// Uses comprehensive detection methods: accessibility, tab order, ARIA, and custom patterns
export async function detectFormFields(
  expandDropdowns: () => Promise<void>,
  filterEmpty: boolean = false
): Promise<FormField[]> {
  const allFields: FormField[] = [];
  const fieldMap = new Map<string, FormField>(); // Map by element ID for deduplication

  // Expand dropdowns first (now async)
  console.log('[FIELD DETECTION] Expanding dropdowns...');
  await expandDropdowns();

  // Step 1: Detect and group radio buttons and checkboxes (specialized detection)
  console.log('[FIELD DETECTION] Detecting radio and checkbox groups...');
  const radioGroups = groupRadioButtons();
  const checkboxGroups = groupCheckboxes();
  
  // Track which radios and checkboxes are already in groups
  const processedRadioIds = new Set<string>();
  const processedCheckboxIds = new Set<string>();
  
  radioGroups.forEach(field => {
    if (field.options) {
      field.options.forEach(opt => {
        if (opt.id) processedRadioIds.add(opt.id);
      });
    }
    allFields.push(field);
    if (field.id) fieldMap.set(field.id, field);
  });
  
  checkboxGroups.forEach(field => {
    if (field.options) {
      field.options.forEach(opt => {
        if (opt.id) processedCheckboxIds.add(opt.id);
      });
    }
    allFields.push(field);
    if (field.id) fieldMap.set(field.id, field);
  });

  // Step 2: Primary detection - focusable form fields (accessibility-based)
  console.log('[FIELD DETECTION] Detecting focusable form fields...');
  const focusableFields = detectFocusableFormFields();
  focusableFields.forEach(field => {
    // Skip if already in a group
    if (field.id && processedRadioIds.has(field.id)) return;
    if (field.id && processedCheckboxIds.has(field.id)) return;
    
    // Deduplicate by ID, prefer more specific field types
    if (field.id && fieldMap.has(field.id)) {
      const existing = fieldMap.get(field.id)!;
      // Keep the more specific type (custom-dropdown > text, etc.)
      if (field.type === 'custom-dropdown' && existing.type !== 'custom-dropdown') {
        fieldMap.set(field.id, field);
        const index = allFields.findIndex(f => f.id === field.id);
        if (index >= 0) allFields[index] = field;
      }
    } else {
      allFields.push(field);
      if (field.id) fieldMap.set(field.id, field);
    }
  });

  // Step 3: Tab order detection (comprehensive fallback)
  console.log('[FIELD DETECTION] Detecting fields via tab order...');
  const tabOrderFields = detectByTabOrder();
  tabOrderFields.forEach(field => {
    if (field.id && processedRadioIds.has(field.id)) return;
    if (field.id && processedCheckboxIds.has(field.id)) return;
    
    if (field.id && !fieldMap.has(field.id)) {
      allFields.push(field);
      fieldMap.set(field.id, field);
    }
  });

  // Step 4: ARIA-based detection
  console.log('[FIELD DETECTION] Detecting fields via ARIA attributes...');
  const ariaFields = detectAccessibilityFields();
  ariaFields.forEach(field => {
    if (field.id && processedRadioIds.has(field.id)) return;
    if (field.id && processedCheckboxIds.has(field.id)) return;
    
    if (field.id && !fieldMap.has(field.id)) {
      allFields.push(field);
      fieldMap.set(field.id, field);
    } else if (field.id && fieldMap.has(field.id)) {
      // Prefer custom-dropdown type over others
      const existing = fieldMap.get(field.id)!;
      if (field.type === 'custom-dropdown' && existing.type !== 'custom-dropdown') {
        fieldMap.set(field.id, field);
        const index = allFields.findIndex(f => f.id === field.id);
        if (index >= 0) allFields[index] = field;
      }
    }
  });

  // Step 5: Custom dropdown detection (pattern-based)
  console.log('[FIELD DETECTION] Detecting custom dropdowns...');
  const customDropdownFields = await detectCustomDropdowns();
  customDropdownFields.forEach(field => {
    // Always prefer custom-dropdown detection over generic detection
    if (field.id && fieldMap.has(field.id)) {
      const existing = fieldMap.get(field.id)!;
      // Replace if existing is less specific
      if (existing.type !== 'custom-dropdown') {
        fieldMap.set(field.id, field);
        const index = allFields.findIndex(f => f.id === field.id);
        if (index >= 0) allFields[index] = field;
      }
    } else {
      allFields.push(field);
      if (field.id) fieldMap.set(field.id, field);
    }
  });

  // Step 6: Legacy standard input/textarea/select detection (for backwards compatibility)
  // But skip elements already detected
  console.log('[FIELD DETECTION] Detecting standard form elements...');
  const standardInputs = document.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])'
  );
  standardInputs.forEach((input) => {
    if (input.disabled) return;
    if (input.type === "radio" && processedRadioIds.has(input.id)) return;
    if (input.type === "checkbox" && processedCheckboxIds.has(input.id)) return;
    if (input.id && fieldMap.has(input.id)) return; // Already detected

    const id = input.id || generateFieldId();
    if (!input.id) input.id = id;

    const inputType = input.type || "text";
    const field: FormField = {
      id,
      name: input.name || undefined,
      label: getFieldLabel(input),
      type: inputType as FormFieldType,
      selector: `#${id}`,
      placeholder: input.placeholder || undefined,
      required: input.required,
      disabled: input.disabled,
      value: input.value || undefined,
      surroundingText: getSurroundingText(input),
      accept: input.accept || undefined,
      description: getFieldDescription(input),
      formatHint: getFormatHint(inputType),
    };

    allFields.push(field);
    fieldMap.set(id, field);
  });

  const standardTextareas = document.querySelectorAll<HTMLTextAreaElement>("textarea");
  standardTextareas.forEach((textarea) => {
    if (textarea.disabled) return;
    if (textarea.id && fieldMap.has(textarea.id)) return;

    const id = textarea.id || generateFieldId();
    if (!textarea.id) textarea.id = id;

    const field: FormField = {
      id,
      name: textarea.name || undefined,
      label: getFieldLabel(textarea),
      type: "textarea",
      selector: `#${id}`,
      placeholder: textarea.placeholder || undefined,
      required: textarea.required,
      disabled: textarea.disabled,
      value: textarea.value || undefined,
      surroundingText: getSurroundingText(textarea),
      description: getFieldDescription(textarea),
    };

    allFields.push(field);
    fieldMap.set(id, field);
  });

  const standardSelects = document.querySelectorAll<HTMLSelectElement>("select");
  standardSelects.forEach((select) => {
    if (select.disabled) return;
    if (select.id && fieldMap.has(select.id)) return;

    const id = select.id || generateFieldId();
    if (!select.id) select.id = id;

    const options: Array<{ value: string; label: string; selected?: boolean }> = [];
    Array.from(select.options).forEach((option) => {
      options.push({
        value: option.value,
        label: option.text,
        selected: option.selected,
      });
    });

    const field: FormField = {
      id,
      name: select.name || undefined,
      label: getFieldLabel(select),
      type: select.multiple ? "multi-select" : "select",
      selector: `#${id}`,
      required: select.required,
      disabled: select.disabled,
      options,
      surroundingText: getSurroundingText(select),
      description: getFieldDescription(select),
    };

    allFields.push(field);
    fieldMap.set(id, field);
  });

    // Filter empty fields if requested
  let finalFields = allFields;
  if (filterEmpty) {
    finalFields = allFields.filter(field => {
      // Check field value first
      if (!isFieldEmpty(field)) return false;
      
      // Also check DOM state
      const element = document.getElementById(field.id) || 
                     document.querySelector(field.selector) as HTMLElement;
      if (!element) return false;
      return isFieldElementEmpty(element, field.type);
    });
    console.log(`[FIELD DETECTION] ✓ Detected ${finalFields.length} empty fields (filtered from ${allFields.length} total)`);
  } else {
    console.log(`[FIELD DETECTION] ✓ Detected ${finalFields.length} total form fields`);
  }

  return finalFields;
}
