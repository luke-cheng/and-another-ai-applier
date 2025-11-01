// Form Filling Utilities
// Handles filling form fields with AI responses

import { FormField, FormFieldType } from "../serviceWorker/ai_services/formFillerService/type";

// Convert null/empty/falsey AI responses to "n/a" for text fields
// For checkboxes/radios/selects, empty means no selection (don't convert)
function normalizeAIResponse(value: string | boolean, fieldType: FormFieldType): string | boolean {
  // For boolean fields (checkbox), return as-is
  if (typeof value === 'boolean') {
    return value;
  }

  const strValue = String(value).trim();

  // For selection fields (radio, checkbox, select), empty means no selection
  if (fieldType === "checkbox" || fieldType === "radio" || 
      fieldType === "radio-group" || fieldType === "checkbox-group" ||
      fieldType === "select" || fieldType === "multi-select") {
    return strValue; // Return as-is, empty means unselected
  }

  // For text fields, convert null/empty to "n/a"
  if (!strValue || strValue === 'null' || strValue === 'undefined' || strValue === '') {
    return 'n/a';
  }

  return strValue;
}

// Fill a single form field based on its type
// Uses fieldId (which matches HTMLElement.id) to map AI responses to elements
export function fillFormField(field: FormField, value: string | boolean): boolean {
  try {
    // Normalize value based on field type
    const normalizedValue = normalizeAIResponse(value, field.type);

    switch (field.type) {
      case "text":
      case "email":
      case "tel":
      case "url":
      case "password":
      case "number":
      case "date":
      case "datetime-local":
      case "time":
      case "month":
      case "week":
      case "search":
      case "color": {
        // Use fieldId to find the element - fieldId matches HTMLElement.id
        const element = document.getElementById(field.id) || document.querySelector(field.selector) as HTMLElement;
        if (!element) {
          console.warn(`Field not found: ${field.id} (selector: ${field.selector})`);
          return false;
        }
        const input = element as HTMLInputElement;
        input.value = String(normalizedValue);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }

      case "textarea": {
        const element = document.getElementById(field.id) || document.querySelector(field.selector) as HTMLElement;
        if (!element) {
          console.warn(`Field not found: ${field.id} (selector: ${field.selector})`);
          return false;
        }
        const textarea = element as HTMLTextAreaElement;
        textarea.value = String(normalizedValue);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }

      case "checkbox": {
        const element = document.getElementById(field.id) || document.querySelector(field.selector) as HTMLElement;
        if (!element) {
          console.warn(`Field not found: ${field.id} (selector: ${field.selector})`);
          return false;
        }
        const checkbox = element as HTMLInputElement;
        // For checkbox, normalizeValue is already a boolean or empty string
        if (typeof normalizedValue === 'boolean') {
          checkbox.checked = normalizedValue;
        } else {
          const strValue = String(normalizedValue).toLowerCase();
          checkbox.checked = strValue === "true" || strValue === "yes";
        }
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        checkbox.dispatchEvent(new Event("click", { bubbles: true }));
        break;
      }

      case "radio": {
        // For radio buttons, find the one with matching value
        const radioGroup = document.querySelectorAll<HTMLInputElement>(
          `input[type="radio"][name="${field.name || ""}"]`
        );
        const valueStr = String(normalizedValue).toLowerCase();
        radioGroup.forEach((radio) => {
          if (radio.value.toLowerCase() === valueStr || radio.id === field.id) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
            radio.dispatchEvent(new Event("click", { bubbles: true }));
          }
        });
        break;
      }

      case "radio-group": {
        // For radio-group, find the matching radio by value or label
        const valueStr = String(normalizedValue).toLowerCase();
        let found = false;

        if (field.options) {
          field.options.forEach(opt => {
            if (opt.element && 
                (opt.value.toLowerCase() === valueStr || 
                 opt.label.toLowerCase() === valueStr)) {
              (opt.element as HTMLInputElement).checked = true;
              opt.element.dispatchEvent(new Event("change", { bubbles: true }));
              opt.element.dispatchEvent(new Event("click", { bubbles: true }));
              found = true;
            }
          });
        }

        // Fallback: try to find by selector
        if (!found && field.groupName) {
          const radioGroup = document.querySelectorAll<HTMLInputElement>(
            `input[type="radio"][name="${field.groupName}"]`
          );
          radioGroup.forEach((radio) => {
            if (radio.value.toLowerCase() === valueStr) {
              radio.checked = true;
              radio.dispatchEvent(new Event("change", { bubbles: true }));
              radio.dispatchEvent(new Event("click", { bubbles: true }));
              found = true;
            }
          });
        }

        if (!found && valueStr && valueStr !== '') {
          console.warn(`Could not find radio option matching: ${valueStr}`);
          return false;
        }
        break;
      }

      case "checkbox-group": {
        // For checkbox-group, parse JSON array and check matching checkboxes
        let selectedValues: string[] = [];
        try {
          // Try to parse as JSON array first
          selectedValues = JSON.parse(String(normalizedValue));
        } catch (e) {
          // If not JSON, treat as comma-separated string
          selectedValues = String(normalizedValue).split(',').map(v => v.trim());
        }

        const valueStrs = selectedValues.map(v => v.toLowerCase());
        let foundCount = 0;

        if (field.options) {
          field.options.forEach(opt => {
            const shouldBeChecked = valueStrs.includes(opt.value.toLowerCase()) ||
                                  valueStrs.includes(opt.label.toLowerCase());
            
            if (opt.element) {
              (opt.element as HTMLInputElement).checked = shouldBeChecked;
              if (shouldBeChecked) {
                opt.element.dispatchEvent(new Event("change", { bubbles: true }));
                foundCount++;
              }
            }
          });
        }

        if (foundCount === 0 && valueStrs.length > 0 && valueStrs[0] !== '') {
          console.warn(`Could not find checkbox options matching: ${valueStrs.join(', ')}`);
          return false;
        }
        break;
      }

      case "select":
      case "multi-select": {
        const element = document.getElementById(field.id) || document.querySelector(field.selector) as HTMLElement;
        if (!element) {
          console.warn(`Field not found: ${field.id} (selector: ${field.selector})`);
          return false;
        }
        const select = element as HTMLSelectElement;
        const valueStr = String(normalizedValue);
        
        // Try to find option by value
        const option = Array.from(select.options).find(
          (opt) => opt.value === valueStr || opt.text.toLowerCase().includes(valueStr.toLowerCase())
        );

        if (option) {
          option.selected = true;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          // Try to set by index if value is numeric
          const index = parseInt(valueStr);
          if (!isNaN(index) && index >= 0 && index < select.options.length) {
            select.selectedIndex = index;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            console.warn(`Could not find option for value: ${valueStr}`);
            return false;
          }
        }
        break;
      }

      case "custom-dropdown": {
        const element = document.getElementById(field.id) || document.querySelector(field.selector) as HTMLElement;
        if (!element) {
          console.warn(`Field not found: ${field.id} (selector: ${field.selector})`);
          return false;
        }
        // Try to trigger dropdown and select option
        const clickable = element as HTMLElement;
        clickable.click();

        // Use MutationObserver to wait for dropdown to appear
        const selector = '[role="option"], .dropdown-item, .select-option';
        const observer = new MutationObserver((mutations, obs) => {
          const options = document.querySelectorAll(selector);
          if (options.length > 0) {
            const valueStr = String(normalizedValue).toLowerCase();
            let found = false;
            
            options.forEach((option) => {
              if (option.textContent?.toLowerCase().includes(valueStr)) {
                (option as HTMLElement).click();
                found = true;
              }
            });
            
            obs.disconnect();
            if (!found) {
              console.warn(`Could not find option matching: ${normalizedValue}`);
            }
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false
        });

        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          const options = document.querySelectorAll(selector);
          const valueStr = String(normalizedValue).toLowerCase();
          options.forEach((option) => {
            if (option.textContent?.toLowerCase().includes(valueStr)) {
              (option as HTMLElement).click();
            }
          });
        }, 300);
        break;
      }

      default:
        console.warn(`Unknown field type: ${field.type}`);
        return false;
    }

    return true;
  } catch (error) {
    console.error(`Error filling field ${field.id}:`, error);
    return false;
  }
}
