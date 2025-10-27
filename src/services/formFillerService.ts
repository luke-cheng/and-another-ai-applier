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
  required: boolean;
  elementType: 'input' | 'textarea' | 'select' | 'button' | 'checkbox' | 'radio' | 'other';
  options?: string[]; // For select, radio, checkbox groups
  checked?: boolean; // For checkboxes and radio buttons
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
   * Initialize the form filler with resume data and optional job description
   */
  async initialize(
    resumeData: ResumeData,
    jobDescription?: string,
    onProgress?: AIProgressCallback,
    onError?: AIErrorCallback
  ): Promise<void> {
    try {
      // Create session with resume data and job description in system prompt
      let systemPrompt = `You are a job application assistant with dom manipulation tool.
      
      Use this resume data to fill form fields: ${JSON.stringify(resumeData, null, 2)}.`;
      
      if (jobDescription) {
        systemPrompt += `\n\nJob Description Context:\n${jobDescription}`;
      }
      
      systemPrompt += `\n\nInstructions:
- Provide only the field value, no explanations
- Be concise and accurate
- Use the most relevant information from the resume
- Match your responses to the job requirements when job description is provided
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
  async fillSingleField(field: FormField): Promise<AIResponse> {
    if (!this.currentSession) {
      throw new Error('Form filler not initialized. Call initialize() first.');
    }

    try {
      let fieldPrompt = '';
      let responseConstraint: object | undefined;
      
      // Create enhanced prompt based on field type and requirements
      if (field.elementType === 'button') {
        fieldPrompt = `Should I click the button "${field.label}"?`;
        responseConstraint = {
          type: "object",
          properties: {
            shouldClick: {
              type: "boolean",
              description: "Whether the button should be clicked to proceed with the job application"
            }
          },
          required: ["shouldClick"]
        };
      } else if (field.elementType === 'checkbox') {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        fieldPrompt = `Should I check the checkbox "${field.label}"${requiredText}?`;
        responseConstraint = {
          type: "object",
          properties: {
            shouldCheck: {
              type: "boolean",
              description: "Whether the checkbox should be checked for the job application"
            }
          },
          required: ["shouldCheck"]
        };
      } else if (field.elementType === 'radio') {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        fieldPrompt = `Should I select the radio button "${field.label}"${requiredText}?`;
        responseConstraint = {
          type: "object",
          properties: {
            shouldSelect: {
              type: "boolean",
              description: "Whether the radio button should be selected for the job application"
            }
          },
          required: ["shouldSelect"]
        };
      } else if (field.elementType === 'select') {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        const optionsText = field.options ? ` Available options: ${field.options.map((opt, index) => `${index}: ${opt}`).join(', ')}` : '';
        fieldPrompt = `Select the appropriate option for "${field.label}"${requiredText}${optionsText}.`;
        responseConstraint = {
          type: "object",
          properties: {
            selectedOptionId: {
              type: "integer",
              description: "The ID (index) of the selected option from the available options"
            }
          },
          required: ["selectedOptionId"]
        };
      } else {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        fieldPrompt = `Fill the form field "${field.label}" (type: ${field.type})${requiredText}. Provide only the field value, no explanations.`;
      }
      
      const response = await this.currentSession.prompt(fieldPrompt, {
        responseConstraint: responseConstraint
      });
      
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
  async fillFields(
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

        // Use the single field method wrapped in the optimized approach
        const response = await this.fillSingleFieldWithClonedSession(field);
        responses.push(response);
        
        // Small delay between fields to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return responses;
    } catch (error) {
      console.error('Failed to fill fields:', error);
      throw new Error('Failed to fill fields');
    }
  }

  /**
   * Fill a single field using a cloned session (optimized approach)
   */
  private async fillSingleFieldWithClonedSession(field: FormField): Promise<AIResponse> {
    // Clone session for each field (optimized approach from benchmark)
    const clonedSession = await this.baseService.cloneSession();
    
    try {
      // Create enhanced prompt based on field type and requirements
      let fieldPrompt = '';
      let responseConstraint: object | undefined;
      
      if (field.elementType === 'button') {
        fieldPrompt = `Should I click the button "${field.label}"?`;
        responseConstraint = {
          type: "object",
          properties: {
            shouldClick: {
              type: "boolean",
              description: "Whether the button should be clicked to proceed with the job application"
            }
          },
          required: ["shouldClick"]
        };
      } else if (field.elementType === 'checkbox') {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        fieldPrompt = `Should I check the checkbox "${field.label}"${requiredText}?`;
        responseConstraint = {
          type: "object",
          properties: {
            shouldCheck: {
              type: "boolean",
              description: "Whether the checkbox should be checked for the job application"
            }
          },
          required: ["shouldCheck"]
        };
      } else if (field.elementType === 'radio') {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        fieldPrompt = `Should I select the radio button "${field.label}"${requiredText}?`;
        responseConstraint = {
          type: "object",
          properties: {
            shouldSelect: {
              type: "boolean",
              description: "Whether the radio button should be selected for the job application"
            }
          },
          required: ["shouldSelect"]
        };
      } else if (field.elementType === 'select') {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        const optionsText = field.options ? ` Available options: ${field.options.map((opt, index) => `${index}: ${opt}`).join(', ')}` : '';
        fieldPrompt = `Select the appropriate option for "${field.label}"${requiredText}${optionsText}.`;
        responseConstraint = {
          type: "object",
          properties: {
            selectedOptionId: {
              type: "integer",
              description: "The ID (index) of the selected option from the available options"
            }
          },
          required: ["selectedOptionId"]
        };
      } else {
        const requiredText = field.required ? ' (REQUIRED)' : '';
        fieldPrompt = `Fill the form field "${field.label}" (type: ${field.type})${requiredText}. Provide only the field value, no explanations.`;
      }
      
      const response = await clonedSession.prompt(fieldPrompt, {
        responseConstraint: responseConstraint
      });
      
      return {
        input: fieldPrompt,
        output: response.trim(),
        field
      };
    } finally {
      // Clean up cloned session
      await clonedSession.destroy();
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
   * Handle interactive element based on field type and AI response
   */
  async handleInteractiveElement(field: FormField, aiResponse: string): Promise<void> {
    try {
      if (field.elementType === 'button') {
        const response = JSON.parse(aiResponse);
        if (response.shouldClick === true) {
          await this.clickElement(field.selector);
        }
      } else if (field.elementType === 'checkbox') {
        const response = JSON.parse(aiResponse);
        await this.toggleCheckbox(field.selector, response.shouldCheck);
      } else if (field.elementType === 'radio') {
        const response = JSON.parse(aiResponse);
        if (response.shouldSelect === true) {
          await this.selectRadioButton(field.selector);
        }
      } else if (field.elementType === 'select') {
        const response = JSON.parse(aiResponse);
        const selectedOptionId = response.selectedOptionId;
        if (field.options && field.options[selectedOptionId]) {
          await this.selectOption(field.selector, field.options[selectedOptionId]);
        }
      } else {
        // Regular input field - no structured output needed
        await this.fillFieldAndTabInDOM(field.selector, aiResponse);
      }
    } catch (error) {
      console.error(`Failed to handle interactive element ${field.label}:`, error);
      throw new Error(`Failed to handle interactive element ${field.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Click an element in the DOM
   */
  async clickElement(selector: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'clickElement',
          selector: selector
        });
      }
    } catch (error) {
      console.error('Failed to click element in DOM:', error);
      throw new Error('Failed to click element in DOM');
    }
  }

  /**
   * Toggle a checkbox in the DOM
   */
  async toggleCheckbox(selector: string, checked: boolean): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleCheckbox',
          selector: selector,
          checked: checked
        });
      }
    } catch (error) {
      console.error('Failed to toggle checkbox in DOM:', error);
      throw new Error('Failed to toggle checkbox in DOM');
    }
  }

  /**
   * Select a radio button in the DOM
   */
  async selectRadioButton(selector: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'selectRadioButton',
          selector: selector
        });
      }
    } catch (error) {
      console.error('Failed to select radio button in DOM:', error);
      throw new Error('Failed to select radio button in DOM');
    }
  }

  /**
   * Select an option in a select element in the DOM
   */
  async selectOption(selector: string, value: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'selectOption',
          selector: selector,
          value: value
        });
      }
    } catch (error) {
      console.error('Failed to select option in DOM:', error);
      throw new Error('Failed to select option in DOM');
    }
  }

  /**
   * Fill fields and interact with DOM (complete workflow)
   */
  async fillFieldsWithDOM(
    fields: FormField[],
    onProgress?: AIProgressCallback
  ): Promise<AIResponse[]> {
    const responses = await this.fillFields(fields, onProgress);
    
    // Handle each field based on its type and AI response
    for (const response of responses) {
      await this.handleInteractiveElement(response.field, response.output);
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
