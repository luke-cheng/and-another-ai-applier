// Resume Parser Service
// Specialized service for parsing unstructured resume text into structured data

import { baseAIService, AIProgressCallback, AIErrorCallback } from './baseAIService';

export interface ResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    urls: {
      linkedin: string;
      github: string;
      website: string;
    };
    location: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  experience: Array<{
    companyName: string;
    jobTitle: string;
    location: string;
    startDate: string;
    endDate: string;
    bulletsPoints: string[];
  }>;
  education: Array<{
    schoolName: string;
    major: string;
    location: {
      city: string;
      state: string;
      zipCode: string;
    };
    gpa: number;
    startDate: string;
    endDate: string;
    description: string[];
  }>;
  skills: string[];
  certifications: string[];
  jobDescription?: string; // Optional job description for context
  legal: {
    authorizedToWorkInUSA: boolean;
    needSponsorship: boolean;
    sponsorshipExplanation: string;
  };
  projects: Array<{
    name: string;
    description: string;
    url: string;
  }>;
  customFields: Record<string, any>;
  lastUpdated: string;
}

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
- Set boolean values to false if not specified
- Use current timestamp for lastUpdated
- Be thorough but accurate
- Return only JSONfied resume data`;

      await this.baseService.createSession(
        systemPrompt,
        onProgress,
        onError
      );

      const parsePrompt = `Parse the following resume text into a structured JSON format:

Resume text to parse:
${rawResumeText}`;

      // Define the JSON schema for responseConstraint
      const resumeSchema = {
        type: "object",
        properties: {
          personalInfo: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              urls: {
                type: "object",
                properties: {
                  linkedin: { type: "string" },
                  github: { type: "string" },
                  website: { type: "string" }
                }
              },
              location: {
                type: "object",
                properties: {
                  city: { type: "string" },
                  state: { type: "string" },
                  zipCode: { type: "string" }
                }
              }
            }
          },
          experience: {
            type: "array",
            items: {
              type: "object",
              properties: {
                companyName: { type: "string" },
                jobTitle: { type: "string" },
                location: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                bulletsPoints: { type: "array", items: { type: "string" } }
              }
            }
          },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                schoolName: { type: "string" },
                major: { type: "string" },
                location: {
                  type: "object",
                  properties: {
                    city: { type: "string" },
                    state: { type: "string" },
                    zipCode: { type: "string" }
                  }
                },
                gpa: { type: "number" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                description: { type: "array", items: { type: "string" } }
              }
            }
          },
          skills: { type: "array", items: { type: "string" } },
          certifications: { type: "array", items: { type: "string" } },
          projects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                url: { type: "string" }
              }
            }
          },
          legal: {
            type: "object",
            properties: {
              authorizedToWorkInUSA: { type: "boolean" },
              needSponsorship: { type: "boolean" },
              sponsorshipExplanation: { type: "string" }
            }
          },
          customFields: { type: "object" },
          lastUpdated: { type: "string" }
        }
      };

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
}

// Export singleton instance
export const resumeParserService = new ResumeParserService();
export default resumeParserService;
