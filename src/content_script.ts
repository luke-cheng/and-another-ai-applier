// Content Script - Runs in web page context
// Handles form detection, dropdown expansion, and form filling

import { FormField, FormFillingConfig, FormFillingResult, AIResponse } from "./serviceWorker/ai_services/formFillerService/type";
import { detectFormFields } from "./content_script/fieldDetection";
import { expandAllDropdowns } from "./content_script/dropdownUtils";
import { fillFormField } from "./content_script/formFilling";
import { uploadResumeFile } from "./content_script/resumeUpload";

/**
 * Wait for website's built-in autofill to complete
 * Uses multiple strategies: UI state monitoring, DOM polling, and timeout fallback
 */
async function waitForAutofillComplete(
  initialFields: FormField[],
  maxWaitTime: number = 10000
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 500; // Poll every 500ms

  return new Promise<void>((resolve) => {
    // Strategy 1: Monitor UI indicators (e.g., spinner disappearance, pending state changes)
    const checkUIState = (): boolean => {
      // Check for Ashby-style pending indicators
      const pendingLayer = document.querySelector(
        '.ashby-application-form-autofill-input-pending-layer[data-state="visible"], .ashby-application-form-autofill-input-pending-layer:not([data-state="hidden"])'
      );
      if (pendingLayer) {
        return false; // Still pending
      }

      // Check for any spinner/loading indicators in autofill containers
      const spinners = document.querySelectorAll(
        '[class*="autofill"] [class*="spinner"], [class*="autofill"] [role="progressbar"]'
      );
      for (const spinner of Array.from(spinners)) {
        const style = window.getComputedStyle(spinner);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return false; // Still loading
        }
      }

      return true; // No loading indicators found
    };

    // Strategy 2: Poll for DOM changes (check if previously empty fields now have values)
    const checkFieldValues = (): boolean => {
      let filledCount = 0;
      for (const field of initialFields) {
        if (field.type === 'file') continue; // Skip file inputs

        const element = document.getElementById(field.id) || 
                       document.querySelector(field.selector) as HTMLElement;
        if (!element) continue;

        let currentValue: string | boolean = '';
        
        if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            currentValue = element.checked;
          } else {
            currentValue = element.value;
          }
        } else if (element instanceof HTMLTextAreaElement) {
          currentValue = element.value;
        } else if (element instanceof HTMLSelectElement) {
          currentValue = element.value;
        }

        // Check if field was empty before and now has a value
        const wasEmpty = !field.value || 
                        field.value === '' || 
                        (typeof field.value === 'boolean' && !field.value) ||
                        (Array.isArray(field.value) && field.value.length === 0);
        
        const nowHasValue = (typeof currentValue === 'string' && currentValue.trim() !== '') ||
                           (typeof currentValue === 'boolean' && currentValue) ||
                           (Array.isArray(currentValue) && currentValue.length > 0);

        if (wasEmpty && nowHasValue) {
          filledCount++;
        }
      }

      // If at least one previously empty field now has a value, autofill may be working
      // We'll consider it complete if no loading indicators are present
      return filledCount > 0 || checkUIState();
    };

    // Also use polling as a fallback - declare before MutationObserver so it can reference it
    let pollIntervalId: NodeJS.Timeout | null = null;

    // Strategy 3: Use MutationObserver for more efficient change detection
    const observer = new MutationObserver(() => {
      if (checkUIState() && checkFieldValues()) {
        observer.disconnect();
        if (pollIntervalId) clearInterval(pollIntervalId);
        resolve();
      }
    });

    // Observe changes in the document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'class', 'style'],
    });

    // Start polling as a fallback
    pollIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Timeout fallback
      if (elapsed >= maxWaitTime) {
        observer.disconnect();
        if (pollIntervalId) clearInterval(pollIntervalId);
        console.log('Autofill wait timeout - proceeding anyway');
        resolve();
        return;
      }

      // Check if autofill appears complete
      if (checkUIState() && checkFieldValues()) {
        observer.disconnect();
        if (pollIntervalId) clearInterval(pollIntervalId);
        resolve();
      }
    }, pollInterval) as NodeJS.Timeout;

    // Initial check
    if (checkUIState() && checkFieldValues()) {
      observer.disconnect();
      if (pollIntervalId) clearInterval(pollIntervalId);
      resolve();
    }
  });
}

// Main message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "detectFormFields") {
    console.log('[FIELD DETECTION] Starting field detection...');
    // Expand dropdowns and detect fields (now properly async)
    expandAllDropdowns()
      .then(async () => {
        const fields = await detectFormFields(expandAllDropdowns);
        console.log(`[FIELD DETECTION] ✓ Detected ${fields.length} form fields`);
        sendResponse({ fields });
      })
      .catch((error) => {
        console.error("[FIELD DETECTION] ✗ Error detecting form fields:", error);
        sendResponse({ fields: [] });
      });
    
    return true; // Keep channel open for async response
  }

  if (message.action === "fillForm") {
    console.log('[AUTOFILL] Starting form fill process...');
    const { resumeData, jobDescription, config } = message as {
      resumeData: any;
      jobDescription: string;
      config: FormFillingConfig;
    };

    // Restructured flow: Upload resume first, wait for autofill, then fill remaining fields
    expandAllDropdowns()
      .then(async () => {
        console.log('[AUTOFILL] Step 1: Detecting initial form fields...');
        // Step 1: Initial field detection (to capture baseline state)
        const initialFields = await detectFormFields(expandAllDropdowns);
        console.log(`[AUTOFILL] Detected ${initialFields.length} initial fields`);

        // Step 2: Upload resume FIRST (if enabled)
        let uploadSuccess = false;
        if (config.uploadResume && resumeData) {
          console.log('[AUTOFILL] Step 2: Uploading resume file...');
          uploadSuccess = await uploadResumeFile(resumeData);
          
          if (uploadSuccess) {
            console.log('[AUTOFILL] ✓ Resume uploaded successfully, waiting for website ATS to process...');
            
            // Step 3: Wait for website's built-in autofill to complete
            console.log('[AUTOFILL] Step 3: Waiting for website ATS autofill to complete...');
            await waitForAutofillComplete(initialFields);
            console.log('[AUTOFILL] ✓ ATS autofill complete, re-detecting remaining empty fields...');
          } else {
            console.warn('[AUTOFILL] ✗ Failed to upload resume, proceeding with regular fill');
          }
        }

        // Step 4: Re-detect fields, filtering for empty ones only
        await expandAllDropdowns();
        const emptyFields = await detectFormFields(expandAllDropdowns, true); // filterEmpty = true

        if (emptyFields.length === 0) {
          console.log('[AUTOFILL] ✓ No empty fields found after autofill - form is complete!');
          sendResponse({
            success: true,
            filledFields: uploadSuccess ? 1 : 0,
            skippedFields: 0,
            errorFields: 0,
            responses: [],
            errors: [],
          });
          return;
        }

        console.log(`[AUTOFILL] Found ${emptyFields.length} empty fields remaining after ATS autofill`);

        // Step 5: Process only empty fields through AI
        console.log('[AUTOFILL] Step 4: Processing remaining fields with AI...');
        const aiResponses = await chrome.runtime.sendMessage({
          action: "processFormFields",
          fields: emptyFields,
          resumeData,
          jobDescription,
        });
        console.log(`[AUTOFILL] ✓ AI processed ${aiResponses.responses?.length || 0} fields`);

        // Step 6: Fill remaining empty fields with AI responses
        const result: FormFillingResult = {
          success: true,
          filledFields: uploadSuccess ? 1 : 0, // Count resume upload
          skippedFields: 0,
          errorFields: 0,
          responses: aiResponses.responses || [],
          errors: [],
        };

        if (aiResponses.responses) {
          console.log('[AUTOFILL] Step 5: Filling fields with AI responses...');
          for (const aiResponse of aiResponses.responses) {
            // Find field by id - fieldId matches element.id
            const field = emptyFields.find((f) => f.id === aiResponse.fieldId);
            if (field) {
              const success = fillFormField(field, aiResponse.output);
              if (success) {
                result.filledFields++;
              } else {
                result.errorFields++;
                result.errors.push({
                  fieldId: aiResponse.fieldId,
                  error: "Failed to fill field",
                });
              }
            } else {
              result.skippedFields++;
            }
          }
        }

        if (!uploadSuccess && config.uploadResume && resumeData) {
          result.errors.push({
            fieldId: "resume-upload",
            error: "Failed to upload resume file",
          });
        }

        console.log(`[AUTOFILL] ✓ Process complete! Filled: ${result.filledFields}, Errors: ${result.errorFields}, Skipped: ${result.skippedFields}`);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("[AUTOFILL] ✗ Error filling form:", error);
        sendResponse({
          success: false,
          filledFields: 0,
          skippedFields: 0,
          errorFields: 0,
          responses: [],
          errors: [{ fieldId: "general", error: error instanceof Error ? error.message : "Unknown error" }],
        });
      });

    return true; // Keep channel open for async response
  }

  return false;
});