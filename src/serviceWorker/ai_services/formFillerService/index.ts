// Form Filler Service
// Processes form fields with AI to generate appropriate responses

import { baseAIService } from "../baseAIService";
import { FormField, AIResponse } from "./type";
import { ResumeData } from "../../../schemas/resumeSchema";

export class FormFillerService {
  private baseService = baseAIService;

  /**
   * Process form fields with AI to generate responses
   */
  async processFormFields(
    fields: FormField[],
    resumeData: ResumeData,
    jobDescription?: string
  ): Promise<AIResponse[]> {
    try {
      // Build initial system prompt
      const initialSystemPrompt = this.buildInitialSystemPrompt(resumeData, fields, jobDescription);
      
      // Create base session
      await this.baseService.createSession(initialSystemPrompt);
      
      // Process each field
      const responses: AIResponse[] = [];
      for (const field of fields) {
        const response = await this.processField(field, resumeData, jobDescription);
        responses.push(response);
      }
      
      return responses;
    } catch (error) {
      console.error('Failed to process form fields:', error);
      throw new Error(`Failed to process form fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up the base session
      await this.baseService.destroySession();
    }
  }

  /**
   * Build initial system prompt for AI session
   * This prompt is used once at session creation and provides overall context
   */
  private buildInitialSystemPrompt(resumeData: ResumeData, fields: FormField[], jobDescription?: string): string {
    let systemPrompt = `You are a job application assistant.

Form Fields Detection:
These form fields were automatically detected from the job application page using DOM parsing, attribute extraction, and surrounding context analysis.

Form Fields JSON Keys:
- id: Unique identifier for the field
- name: HTML name attribute (if available)
- label: Visible label text describing what the field is for
- type: HTML input type (text, email, tel, date, select, textarea, etc.)
- element: Reference to the DOM element (for internal use)
- selector: CSS selector to locate the field
- placeholder: Hint text shown in empty fields
- required: Whether the field must be filled
- disabled: Whether the field is disabled
- value: Current or default value
- options: Available options for select/dropdown fields (array of {value, label})
- surroundingText: Contextual text around the field for better understanding
- accept: File types accepted (for file inputs)

All Detected Form Fields:
${JSON.stringify(fields)}

Resume Data to Use:
${JSON.stringify(resumeData)}`;

    if (jobDescription) {
      systemPrompt += `\n\nJob Description Context:\n${jobDescription}`;
    }

    systemPrompt += `\n\nInstructions:
- Provide only the field value, no explanations
- Be concise and accurate
- Use the most relevant information from the resume
- Match your responses to the job requirements when job description is provided
- For dropdown/select fields, choose the best matching option from the available options
- For yes/no questions (e.g., "Are you authorized to work in USA?"), prefer "Yes" when available as an option
- If a "Prefer not to answer", "I don't wish to answer", "Decline to answer", or similar option is available, use that option instead of answering the question directly
- ⚠️ REQUIRED FIELDS: If a field is marked as REQUIRED, you MUST provide a valid answer - never return empty/null
- For optional fields: If no relevant data exists, you may return empty/null`;

    return systemPrompt;
  }

  /**
   * Get response schema based on field type
   */
  private getResponseSchemaForField(field: FormField): any {
    const baseSchema = {
      type: "object" as const,
      additionalProperties: false
    };

    switch (field.type) {
      case "month":
        return {
          ...baseSchema,
          properties: {
            value: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}$",
              description: "Format: YYYY-MM"
            }
          },
          required: ["value"]
        };

      case "date":
        return {
          ...baseSchema,
          properties: {
            value: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "Format: YYYY-MM-DD"
            }
          },
          required: ["value"]
        };

      case "datetime-local":
        return {
          ...baseSchema,
          properties: {
            value: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$",
              description: "Format: YYYY-MM-DDTHH:mm"
            }
          },
          required: ["value"]
        };

      case "time":
        return {
          ...baseSchema,
          properties: {
            value: {
              type: "string",
              pattern: "^\\d{2}:\\d{2}$",
              description: "Format: HH:mm"
            }
          },
          required: ["value"]
        };

      case "radio-group":
        if (field.options && field.options.length > 0) {
          return {
            ...baseSchema,
            properties: {
              selectedValue: {
                type: "string",
                enum: field.options.map(opt => opt.value)
              }
            },
            required: ["selectedValue"]
          };
        }
        break;

      case "checkbox":
        return {
          ...baseSchema,
          properties: {
            checked: {
              type: "boolean"
            }
          },
          required: ["checked"]
        };

      case "checkbox-group":
        if (field.options && field.options.length > 0) {
          return {
            ...baseSchema,
            properties: {
              selectedValues: {
                type: "array",
                items: {
                  type: "string",
                  enum: field.options.map(opt => opt.value)
                }
              }
            },
            required: ["selectedValues"]
          };
        }
        break;

      case "select":
      case "multi-select":
      case "custom-dropdown":
        if (field.options && field.options.length > 0) {
          return {
            ...baseSchema,
            properties: {
              selectedValue: {
                type: "string",
                enum: field.options.map(opt => opt.value)
              }
            },
            required: ["selectedValue"]
          };
        }
        break;

      case "number":
      case "range":
        return {
          ...baseSchema,
          properties: {
            value: {
              type: "number"
            }
          },
          required: ["value"]
        };
    }

    // Default: string value
    return {
      ...baseSchema,
      properties: {
        value: {
          type: "string"
        }
      },
      required: ["value"]
    };
  }

  /**
   * Get fallback value for required fields that AI couldn't answer
   */
  private getRequiredFieldFallback(field: FormField): string {
    // For dropdowns with options, select first valid option
    if ((field.type === 'select' || field.type === 'custom-dropdown' || field.type === 'radio-group') 
        && field.options && field.options.length > 0) {
      return field.options[0].value;
    }
    
    // For checkboxes, default to false/unchecked
    if (field.type === 'checkbox') {
      return 'false';
    }
    
    // For text fields, use "n/a" (will be handled by normalizeAIResponse)
    return 'n/a';
  }

  /**
   * Build field context for AI prompt
   */
  private buildFieldContext(field: FormField): string {
    // Add REQUIRED emphasis at the top
    let context = field.required 
      ? `⚠️ REQUIRED FIELD - Must provide a valid answer\nField Label: ${field.label}`
      : `Field Label: ${field.label}`;
    
    if (field.description) {
      context += `\nDescription: ${field.description}`;
    }
    
    if (field.placeholder) {
      context += `\nPlaceholder: ${field.placeholder}`;
    }
    
    if (field.surroundingText) {
      context += `\nContext: ${field.surroundingText}`;
    }
    
    if (field.type) {
      context += `\nField Type: ${field.type}`;
    }
    
    // Add specific instructions based on field type
    if (field.type === "radio-group") {
      if (field.options && field.options.length > 0) {
        context += `\n\nSelect ONE option from: ${field.options.map(opt => opt.label).join(', ')}`;
        context += `\n\nImportant: If this is a yes/no question and "Yes" is available, select "Yes". If "Prefer not to answer", "I don't wish to answer", "Decline to answer", or similar privacy option is available, prefer that option over answering the question directly.`;
      }
    } else if (field.type === "checkbox-group") {
      if (field.options && field.options.length > 0) {
        context += `\n\nSelect ALL that apply from: ${field.options.map(opt => opt.label).join(', ')}`;
      }
    } else if (field.options && field.options.length > 0) {
      const optionLabels = field.options.map(opt => opt.label);
      context += `\nOptions: ${optionLabels.join(', ')}`;
      
      // Check if this looks like a yes/no question or has privacy options
      const hasYesOption = optionLabels.some(label => /^yes$/i.test(label.trim()));
      const hasPrivacyOption = optionLabels.some(label => 
        /prefer not to answer|don't wish to answer|decline to answer|prefer not to say|no answer|n\/a/i.test(label)
      );
      
      if (hasPrivacyOption) {
        context += `\n\nIMPORTANT: Select the privacy/prefer-not-to-answer option if available, rather than answering the question directly.`;
      } else if (hasYesOption && /authorized|eligible|qualified|permit|can you|are you/i.test(field.label)) {
        context += `\n\nIMPORTANT: This appears to be a yes/no eligibility question. Select "Yes" from the available options.`;
      }
    }
    
    if (field.formatHint) {
      context += `\nFormat: ${field.formatHint}`;
    }
    
    // Update the final instruction based on required status
    if (field.required) {
      context += `\n\n⚠️ CRITICAL: This field is REQUIRED. You MUST provide a valid answer. Cannot be empty, null, or omitted.`;
    } else {
      context += `\n\nReturn null or empty string if no relevant data exists.`;
    }
    
    return context;
  }

  /**
   * Process a single field with AI
   */
  private async processField(
    field: FormField,
    resumeData: ResumeData,
    jobDescription?: string
  ): Promise<AIResponse> {
    const maxRetries = field.required ? 2 : 0; // Retry up to 2 times for required fields
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
        // Build field context
        const fieldContext = this.buildFieldContext(field);
        
        // Clone session for parallel processing
        const clonedSession = await this.baseService.cloneSession();
        
        // Get custom schema based on field type
        const responseSchema = this.getResponseSchemaForField(field);
        
        // Build prompt
        const fieldPrompt = fieldContext;
        
        // Process with structured output
        const response = await clonedSession.prompt(fieldPrompt, {
          responseConstraint: responseSchema
        });
        
        // Parse JSON response and extract value based on schema type
        const parsed = JSON.parse(response);
        let outputValue = "";
        
        // Handle different response structures
        if (parsed.value !== undefined) {
          outputValue = String(parsed.value);
        } else if (parsed.selectedValue !== undefined) {
          outputValue = String(parsed.selectedValue);
        } else if (parsed.checked !== undefined) {
          outputValue = String(parsed.checked);
        } else if (parsed.selectedValues !== undefined && Array.isArray(parsed.selectedValues)) {
          outputValue = JSON.stringify(parsed.selectedValues);
        }
        
        // Clean up cloned session
        await clonedSession.destroy();
        
        // Validate required fields
        if (field.required) {
          const isEmpty = !outputValue || 
                         outputValue.trim() === '' || 
                         outputValue === 'null' || 
                         outputValue === 'undefined';
          
          if (isEmpty && attempts < maxRetries) {
            console.warn(`Required field ${field.id} returned empty. Retrying... (${attempts + 1}/${maxRetries})`);
            attempts++;
            continue; // Retry
          }
          
          if (isEmpty) {
            // Last resort fallback for required fields
            console.warn(`Required field ${field.id} returned empty after all retries. Using fallback value.`);
            outputValue = this.getRequiredFieldFallback(field);
          }
        }
        
        // Success - return response
        return {
          fieldId: field.id,
          input: fieldContext,
          output: outputValue,
          confidence: attempts > 0 ? 0.7 : 1.0, // Lower confidence if retried
        };
      } catch (error) {
        if (attempts >= maxRetries) {
          // Failed all retries
          console.error(`Failed to process required field ${field.id} after ${attempts} attempts:`, error);
          return {
            fieldId: field.id,
            input: this.buildFieldContext(field),
            output: field.required ? this.getRequiredFieldFallback(field) : "",
            confidence: 0,
          };
        }
        attempts++;
      }
    }
    
    // Should never reach here, but TypeScript needs it
    return {
      fieldId: field.id,
      input: this.buildFieldContext(field),
      output: field.required ? this.getRequiredFieldFallback(field) : "",
      confidence: 0,
    };
  }

  /**
   * Abort current operation
   */
  abortOperation(): void {
    this.baseService.abortOperation();
  }

  /**
   * Check if operation is running
   */
  isOperationRunning(): boolean {
    return this.baseService.isOperationRunning();
  }
}

// Export singleton instance
export const formFillerService = new FormFillerService();
export default formFillerService;

