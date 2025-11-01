// Resume Schema Definition
// This schema is used for both TypeScript type generation and AI response validation

// TypeScript interface generated from the schema
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
    /** Date in "MMM YYYY" format (e.g., "Aug 2022") */
    startDate: string;
    /** Date in "MMM YYYY" format (e.g., "May 2024") or "Present" for current positions */
    endDate: string;
    bulletsPoints: string[];
  }>;
  education: Array<{
    schoolName: string;
    degree: string;
    major: string;
    location: {
      city: string;
      state: string;
      zipCode: string;
    };
    /** Date in "MMM YYYY" format (e.g., "Aug 2022") */
    startDate: string;
    /** Date in "MMM YYYY" format (e.g., "May 2024") or "Present" for current education */
    endDate: string;
    bulletsPoints: string[];
  }>;
  skills: string[];
  certifications: string[];



  projects: Array<{
    name: string;
    bulletsPoints: string[];
    url: string;
  }>;

  workAuthorization: {
    areYou18orOlder: boolean;
    authorizedToWorkInUSA: boolean;
    needSponsorship: boolean;
    sponsorshipExplanation: string | null;
  };

  eeo: {
    gender: "Prefer not to say";
    race: "Prefer not to say";
    veteranStatus: "No";
    disabilityStatus: "No";
  };

  lastUpdated: string | null;
}

// Date pattern: matches "MMM YYYY" format (e.g., "Jan 2022", "Aug 2024") or "Present"
// Supports 3-letter month abbreviations (Jan-Dec) followed by 4-digit year
const datePattern = "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{4}$|^Present$";

export const resumeSchema = {
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
            website: { type: "string" },
          },
        },
        location: {
          type: "object",
          properties: {
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zipCode: { type: "string" },
          },
        },
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          jobTitle: { type: "string" },
          location: { type: "string" },
          startDate: {
            type: "string",
            pattern: datePattern,
          },
          endDate: {
            type: "string",
            pattern: datePattern,
          },
          bulletsPoints: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          schoolName: { type: "string" },
          degree: { type: "string" },
          major: { type: "string" },
          location: {
            type: "object",
            properties: {
              city: { type: "string" },
              state: { type: "string" },
              zipCode: { type: "string" },
            },
          },
          startDate: {
            type: "string",
            pattern: datePattern,
          },
          endDate: {
            type: "string",
            pattern: datePattern,
          },
          bulletsPoints: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    skills: {
      type: "array",
      items: {
        type: "string",
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "string",
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          bulletsPoints: {
            type: "array",
            items: { type: "string" },
          },
          url: { type: "string" },
        },
      },
    },
    workAuthorization: {
      type: "object",
      properties: {
        areYou18orOlder: { type: "boolean" ,default: true },
        authorizedToWorkInUSA: { type: "boolean" ,default: true },
        needSponsorship: { type: "boolean" ,default: true },
        sponsorshipExplanation: { type: ["string", "null"] ,default: "F1 OPT" },
      },
    },
    eeo: {
      type: "object",
      properties: {
        gender: { type: "string" },
        race: { type: "string" },
        veteranStatus: { type: "string" },
        disabilityStatus: { type: "string" },
      },
    },
    lastUpdated: { type: ["string", "null"] },
  },
} as object;