// Resume Parser Service
// Specialized service for parsing unstructured resume text into structured data

import { baseAIService, AIProgressCallback, AIErrorCallback } from './baseAIService';
import { ResumeData, resumeSchema } from '../../schemas/resumeSchema';

export class ResumeParserService {
  private baseService = baseAIService;

  /**
   * Parse unstructured resume text into structured ResumeData format
   */
  async parseResume(
    rawResumeText: string,
    onProgress?: AIProgressCallback,
    onError?: AIErrorCallback
  ): Promise<ResumeData> {
    try {
      // Create session with resume parsing system prompt
      const systemPrompt = `You are a resume parsing expert. Parse plain resume text into structured JSON format.

Instructions:
- Extract all available information from the resume
- Use empty strings for missing fields
- Use empty arrays for missing lists
- Be thorough but accurate

Date Format Requirements:
- All dates must be in "MMM YYYY" format (e.g., "Jan 2022", "Aug 2024")
- Use 3-letter month abbreviations: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
- For current positions or ongoing education, use "Present" as the endDate value
- Convert any date format found in the resume to this standardized format`;

      await this.baseService.createSession(
        systemPrompt,
        onProgress,
        onError
      );

      const parsePrompt = `Parse the following resume text into a structured JSON format:

Resume text to parse:
${rawResumeText}`;

      // Use the imported schema for responseConstraint

      // Get the current session and make the request
      const session = await this.baseService.cloneSession();
      const response = await session.prompt(parsePrompt, {
        responseConstraint: resumeSchema
      });

      // Clean up the cloned session
      await session.destroy();

      // Parse the JSON response - responseConstraint ensures it's valid
      const parsedData = JSON.parse(response);

      return parsedData as ResumeData;
    } catch (error) {
      console.error('Failed to parse resume:', error);
      throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up the base session
      await this.baseService.destroySession();
    }
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
}

// Export singleton instance
export const resumeParserService = new ResumeParserService();
export default resumeParserService;
