// Form Filler Service - Shared Types and Utilities

export type FormFieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "password"
  | "number"
  | "date"
  | "datetime-local"
  | "time"
  | "month"
  | "week"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "radio-group"
  | "checkbox-group"
  | "fieldset-group"
  | "file"
  | "hidden"
  | "range"
  | "color"
  | "search"
  | "custom-dropdown"
  | "multi-select";

export interface FormFieldOption {
  value: string;
  label: string;
  selected?: boolean;
  id?: string; // For radio/checkbox group items
  element?: HTMLElement; // Reference to actual DOM element
}

export interface FormField {
  id: string;
  name?: string;
  label: string;
  type: FormFieldType;
  element?: HTMLElement; // Reference for content script use
  selector: string; // CSS selector for finding the element
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | string[] | boolean;
  options?: FormFieldOption[];
  surroundingText?: string; // Context around the field
  accept?: string; // For file inputs
  description?: string; // Long-form question text from fieldset/aria-describedby
  groupName?: string; // For identifying related fields (name attribute for radio-group)
  formatHint?: string; // Format guidance (e.g., "YYYY-MM" for month inputs)
  subFields?: FormField[]; // For fieldset-group type
  isGroup?: boolean; // Flag to identify grouped fields
}

export interface AIResponse {
  fieldId: string;
  input: string; // Field context sent to AI
  output: string; // AI-generated response
  confidence?: number;
}

export interface FormFillingConfig {
  autoNavigate: boolean;
  skipOptional: boolean;
  uploadResume: boolean;
}

export interface FormFillingResult {
  success: boolean;
  filledFields: number;
  skippedFields: number;
  errorFields: number;
  responses: AIResponse[];
  errors: Array<{ fieldId: string; error: string }>;
}

