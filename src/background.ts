// Background Service Worker
// ALL AI operations should be routed through here to maintain context isolation
import { formFillerService } from "./serviceWorker/ai_services/formFillerService";
import { resumeParserService } from "./serviceWorker/ai_services/resumeParserService";
import { baseAIService } from "./serviceWorker/ai_services/baseAIService";
import { FormField, AIResponse } from "./serviceWorker/ai_services/formFillerService/type";
import { ResumeData } from "./schemas/resumeSchema";

// Handle action click to open side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle messages from content script and side panel for AI processing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Process form fields with AI (from content script)
  if (message.action === "processFormFields") {
    const { fields, resumeData, jobDescription } = message as {
      fields: FormField[];
      resumeData: ResumeData;
      jobDescription?: string;
    };

    formFillerService
      .processFormFields(fields, resumeData, jobDescription)
      .then((responses: AIResponse[]) => {
        sendResponse({ success: true, responses });
      })
      .catch((error) => {
        console.error("Error processing form fields:", error);
        sendResponse({ success: false, error: error.message, responses: [] });
      });

    return true; // Keep channel open for async response
  }

  // Parse resume with AI (from side panel)
  if (message.action === "parseResume") {
    const { resumeText } = message as { resumeText: string };

    // Set up progress callback forwarding
    let lastProgress = 0;
    
    resumeParserService
      .parseResume(
        resumeText,
        (progress) => {
          lastProgress = progress;
          // Forward progress to side panel via storage event (alternative: use port)
          chrome.storage.local.set({ 
            resumeParseProgress: progress,
            resumeParseProgressTimestamp: Date.now()
          });
        },
        (error) => {
          console.error("Resume Parser Error:", error);
        }
      )
      .then((parsedData: ResumeData) => {
        // Clean up temporary progress data after successful completion
        chrome.storage.local.remove(['resumeParseProgress', 'resumeParseProgressTimestamp']);
        sendResponse({ success: true, parsedData });
      })
      .catch((error) => {
        // Clean up temporary progress data even on error
        chrome.storage.local.remove(['resumeParseProgress', 'resumeParseProgressTimestamp']);
        console.error("Error parsing resume:", error);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      });

    return true; // Keep channel open for async response
  }

  // Check AI availability (from side panel) - call baseAIService directly
  if (message.action === "checkAIAvailability") {
    baseAIService
      .checkAvailability()
      .then((availability) => {
        sendResponse({ success: true, availability });
      })
      .catch((error) => {
        console.error("Error checking AI availability:", error);
        sendResponse({ 
          success: false, 
          availability: { status: "unavailable", error: error instanceof Error ? error.message : "Unknown error" } 
        });
      });

    return true;
  }

  // Get quota usage (from side panel) - call baseAIService directly
  if (message.action === "getQuotaUsage") {
    try {
      const usage = baseAIService.getSessionUsage();
      sendResponse({ success: true, quotaUsage: usage });
    } catch (error) {
      console.error("Error getting quota usage:", error);
      sendResponse({ success: false, quotaUsage: null });
    }
    return true;
  }

  // Abort current AI operation (from side panel or content script) - call baseAIService directly
  if (message.action === "abortAIOperation") {
    try {
      baseAIService.abortOperation();
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error aborting AI operation:", error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
    return true;
  }

  return false;
});
