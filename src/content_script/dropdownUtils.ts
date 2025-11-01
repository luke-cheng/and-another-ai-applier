// Dropdown Expansion Utilities
// Handles expanding dropdowns including custom implementations

// Expand all dropdowns including custom ones
// Uses MutationObserver instead of hardcoded timeouts for better reliability
export function expandAllDropdowns(): Promise<void> {
  return new Promise((resolve) => {
    // Standard <select> elements
    const selects = document.querySelectorAll("select");
    selects.forEach((select) => {
      select.size = Math.min(select.options.length, 10); // Show options
      select.style.height = "auto";
    });

    // Custom dropdowns - common patterns
    const customDropdownPatterns = [
      "[role='combobox']",
      "[role='listbox']",
      ".dropdown",
      ".select2-container",
      ".chosen-container",
      ".select-dropdown",
      "[data-toggle='dropdown']",
      ".ui-selectmenu",
      ".select-menu",
    ];

    const clickedElements: HTMLElement[] = [];
    
    customDropdownPatterns.forEach((pattern) => {
      const elements = document.querySelectorAll(pattern);
      elements.forEach((element) => {
        // Try to expand by clicking
        if (element instanceof HTMLElement) {
          try {
            const clickable = element as HTMLElement;
            const event = new MouseEvent("click", { bubbles: true, cancelable: true });
            clickable.dispatchEvent(event);
            
            // Also try mousedown/mouseup for some dropdowns
            clickable.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            clickable.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            clickedElements.push(clickable);
          } catch (e) {
            console.debug("Could not expand dropdown:", pattern, e);
          }
        }
      });
    });

    // Use MutationObserver to detect when dropdowns actually expand
    const dropdownMenuSelectors = ".dropdown-menu, .select-dropdown-menu, .ui-menu, .chosen-results, [role='listbox']";
    
    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout>;
    let resolved = false;

    const checkAndExpand = () => {
      const dropdownMenus = document.querySelectorAll(dropdownMenuSelectors);
      let foundVisible = false;
      
      dropdownMenus.forEach((menu) => {
        if (menu instanceof HTMLElement) {
          const computedStyle = window.getComputedStyle(menu);
          if (computedStyle.display !== "none" || computedStyle.visibility !== "hidden") {
            foundVisible = true;
          }
          menu.style.display = "block";
          menu.style.visibility = "visible";
          menu.style.opacity = "1";
        }
      });

      // Resolve if we found visible menus or after a reasonable timeout
      if (foundVisible || dropdownMenus.length > 0) {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (timeoutId) clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }
    };

    // Set up MutationObserver to watch for DOM changes
    observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          hasRelevantChanges = true;
        }
      });
      if (hasRelevantChanges) {
        checkAndExpand();
      }
    });

    // Observe the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "aria-expanded"]
    });

    // Initial check
    checkAndExpand();

    // Fallback timeout (longer than before, but still reasonable)
    timeoutId = setTimeout(() => {
      checkAndExpand();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 500); // Increased from 100ms but with MutationObserver this should rarely be needed
  });
}
