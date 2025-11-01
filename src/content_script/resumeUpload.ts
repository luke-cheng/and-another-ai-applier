// Resume Upload Utilities
// Handles uploading resume files to form inputs

import { getFieldLabel } from "./fieldDetection";
import { 
  detectFileFormatFromAccept, 
  convertResumeToFormat,
  convertResumeToText 
} from "./resumeConverters";
import { ResumeData } from "../schemas/resumeSchema";

// Upload resume file to file input
// Now accepts ResumeData and automatically detects the preferred format from the input's accept attribute
export async function uploadResumeFile(
  resumeData: ResumeData, 
  fieldSelector?: string
): Promise<boolean> {
  console.log('[RESUME UPLOAD] Starting resume upload process...');
  try {
    // Find file input (resume/CV upload field)
    let fileInput: HTMLInputElement | null = null;

    if (fieldSelector) {
      fileInput = document.querySelector(fieldSelector) as HTMLInputElement;
    } else {
      // Priority 1: Look for autofill-specific file inputs (e.g., Ashby)
      const autofillSelectors = [
        'input[type="file"]',
      ];
      
      // Check for autofill-related classes in parent elements
      for (const selector of autofillSelectors) {
        const inputs = document.querySelectorAll<HTMLInputElement>(selector);
        for (const input of Array.from(inputs)) {
          // Check if input is inside an autofill-related container
          const parent = input.closest('[class*="autofill"], [class*="ashby-application-form-autofill"]');
          if (parent) {
            fileInput = input;
            break;
          }
        }
        if (fileInput) break;
      }

      // Priority 2: Try to find by common patterns with accept attributes (PDF/doc preferred)
      if (!fileInput) {
        const patterns = [
          'input[type="file"][accept*="pdf"]',
          'input[type="file"][accept*="doc"]',
          'input[type="file"][accept*="msword"]',
          'input[type="file"][accept*="wordprocessingml"]',
          'input[type="file"][accept*="opendocument"]',
          'input[type="file"][accept*="rtf"]',
          'input[type="file"][accept*="txt"]',
          'input[type="file"][name*="resume"]',
          'input[type="file"][name*="cv"]',
          'input[type="file"]',
        ];

        for (const pattern of patterns) {
          const inputs = document.querySelectorAll<HTMLInputElement>(pattern);
          for (const input of Array.from(inputs)) {
            // Skip hidden inputs unless they're specifically autofill-related
            const isHidden = input.style.display === 'none' || 
                           input.hasAttribute('hidden') ||
                           (input.tabIndex === -1 && !input.closest('[class*="autofill"]'));
            
            if (isHidden && !input.closest('[class*="autofill"]')) {
              continue;
            }

            const label = getFieldLabel(input).toLowerCase();
            if (
              label.includes("resume") ||
              label.includes("cv") ||
              label.includes("curriculum") ||
              label.includes("document") ||
              label.includes("autofill")
            ) {
              fileInput = input;
              break;
            }
          }
          if (fileInput) break;
        }
      }

      // Priority 3: If still no file input found, accept any file input (even hidden ones for autofill)
      if (!fileInput) {
        const allFileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
        if (allFileInputs.length > 0) {
          // Prefer visible ones, but accept hidden if that's all we have
          fileInput = Array.from(allFileInputs).find(input => {
            const style = window.getComputedStyle(input);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }) || allFileInputs[0];
        }
      }
    }

    if (!fileInput) {
      console.warn('[RESUME UPLOAD] ✗ Could not find resume file input field');
      return false;
    }

    // Extract preferred file format from accept attribute
    const acceptAttribute = fileInput.accept || fileInput.getAttribute('accept');
    const preferredFormat = detectFileFormatFromAccept(acceptAttribute);
    
    console.log(`[RESUME UPLOAD] Detected file format: ${preferredFormat} (accept: ${acceptAttribute || 'none'})`);

    // Convert resume to the preferred format
    console.log('[RESUME UPLOAD] Converting resume to preferred format...');
    const { blob, filename, mimeType } = await convertResumeToFormat(resumeData, preferredFormat);
    console.log(`[RESUME UPLOAD] ✓ Converted resume: ${filename} (${mimeType})`);

    // Create File object with proper MIME type and extension
    const file = new File([blob], filename, { type: mimeType });

    // Create a DataTransfer object to set the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Set the files property
    fileInput.files = dataTransfer.files;

    // Trigger change event
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    console.log('[RESUME UPLOAD] ✓ Resume file uploaded successfully');
    return true;
  } catch (error) {
    console.error('[RESUME UPLOAD] ✗ Error uploading resume file:', error);
    return false;
  }
}

// Legacy function for backward compatibility - converts resume JSON to plain text
// This is now a wrapper around the new converter system
export function resumeJsonToText(resumeData: ResumeData): string {
  return convertResumeToText(resumeData);
}
