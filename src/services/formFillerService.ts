// Form Filler Service
// Specialized service for filling form fields using AI with system prompt + clone approach

import { baseAIService, AIProgressCallback, AIErrorCallback } from './baseAIService';
import { ResumeData } from './resumeParserService';

export interface FormField {
  id: string;
  label: string;
  type: string;
  value: string;
  selector: string;
}

export interface AIResponse {
  input: string;
  output: string;
  field: FormField;
}

export class FormFillerService {
  private baseService = baseAIService;
  private currentSession: any = null;

  /**
   * Initialize the form filler with resume data
   */
  async initialize(
    resumeData: ResumeData,
    onProgress?: AIProgressCallback,
    onError?: AIErrorCallback
  ): Promise<void> {
    try {
      // Create session with resume data in system prompt
      const systemPrompt = `You are a job application assistant. Use this resume data to fill form fields: ${JSON.stringify(resumeData, null, 2)}. 

Instructions:
- Provide only the field value, no explanations
- Be concise and accurate
- Use the most relevant information from the resume
- If no relevant data exists, leave empty`;

      await this.baseService.createSession(
        systemPrompt,
        onProgress,
        onError
      );

      this.currentSession = await this.baseService.cloneSession();
    } catch (error) {
      console.error('Failed to initialize form filler:', error);
      throw new Error(`Failed to initialize form filler: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fill a single form field
   */
  async fillField(field: FormField): Promise<AIResponse> {
    if (!this.currentSession) {
      throw new Error('Form filler not initialized. Call initialize() first.');
    }

    try {
      const fieldPrompt = `Fill the form field "${field.label}" (type: ${field.type})`;
      
      const response = await this.currentSession.prompt(fieldPrompt);
      
      return {
        input: fieldPrompt,
        output: response.trim(),
        field
      };
    } catch (error) {
      console.error(`Failed to fill field ${field.label}:`, error);
      throw new Error(`Failed to fill field ${field.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fill multiple form fields sequentially (optimized approach)
   */
  async fillFieldsSequential(
    fields: FormField[],
    onProgress?: AIProgressCallback
  ): Promise<AIResponse[]> {
    if (!this.currentSession) {
      throw new Error('Form filler not initialized. Call initialize() first.');
    }

    const responses: AIResponse[] = [];

    try {
      // Process fields sequentially using the optimized approach
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        
        // Update progress
        if (onProgress) {
          onProgress((i / fields.length) * 100);
        }

        // Clone session for each field (optimized approach from benchmark)
        const clonedSession = await this.baseService.cloneSession();
        
        const fieldPrompt = `Fill the form field "${field.label}" (type: ${field.type})`;
        const response = await clonedSession.prompt(fieldPrompt);
        
        // Clean up cloned session
        await clonedSession.destroy();
        
        responses.push({
          input: fieldPrompt,
          output: response.trim(),
          field
        });
        
        // Small delay between fields to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return responses;
    } catch (error) {
      console.error('Failed to fill fields sequentially:', error);
      throw new Error('Failed to fill fields sequentially');
    }
  }

  /**
   * Fill a field in the DOM
   */
  async fillFieldInDOM(selector: string, value: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'fillField',
          selector: selector,
          value: value
        });
      }
    } catch (error) {
      console.error('Failed to fill field in DOM:', error);
      throw new Error('Failed to fill field in DOM');
    }
  }

  /**
   * Fill a field and tab to the next field
   */
  async fillFieldAndTabInDOM(selector: string, value: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'fillFieldAndTab',
          selector: selector,
          value: value
        });
      }
    } catch (error) {
      console.error('Failed to fill field and tab in DOM:', error);
      throw new Error('Failed to fill field and tab in DOM');
    }
  }

  /**
   * Navigate to the next page
   */
  async navigateToNextPage(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'navigateToNextPage'
        });
      }
    } catch (error) {
      console.error('Failed to navigate to next page:', error);
      throw new Error('Failed to navigate to next page');
    }
  }

  /**
   * Fill fields and interact with DOM (complete workflow)
   */
  async fillFieldsWithDOM(
    fields: FormField[],
    onProgress?: AIProgressCallback
  ): Promise<AIResponse[]> {
    const responses = await this.fillFieldsSequential(fields, onProgress);
    
    // Fill fields in DOM
    for (const response of responses) {
      await this.fillFieldAndTabInDOM(response.field.selector, response.output);
    }
    
    return responses;
  }

  /**
   * Check if the service is available
   */
  async checkAvailability() {
    return await this.baseService.checkAvailability();
  }

  /**
   * Get current session usage
   */
  getSessionUsage() {
    return this.baseService.getSessionUsage();
  }

  /**
   * Abort current operation
   */
  abortOperation() {
    this.baseService.abortOperation();
  }

  /**
   * Check if operation is running
   */
  isOperationRunning() {
    return this.baseService.isOperationRunning();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.currentSession.destroy();
        this.currentSession = null;
      } catch (error) {
        console.warn('Failed to destroy form filler session:', error);
      }
    }
    await this.baseService.destroySession();
  }
}

// Export singleton instance
export const formFillerService = new FormFillerService();
export default formFillerService;
