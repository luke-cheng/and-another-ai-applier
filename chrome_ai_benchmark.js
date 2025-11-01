/**
 * Chrome Browser AI API Benchmark for Auto-Fill Agent
 * Tests different approaches for form filling with resume and job description data
 * Focus: Prompting strategies, structured output, and .prompt() vs .append()
 */

// Benchmark configuration
const BENCHMARK_CONFIG = {
  iterations: 3, // Number of runs per test
  timeout: 1000, // 10 second timeout per test
  enableDetailedLogging: true,
  testStrategies: [
    "zero-shot",
    "session-clone-prompt",
    "session-clone-append", 
    "session-append",
    "batch-structured",
    "batch-freeform",
  ],
};

// Performance measurement utilities
class BenchmarkTimer {
  constructor() {
    this.startTime = 0;
    this.endTime = 0;
    this.results = [];
  }

  start() {
    this.startTime = performance.now();
  }

  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  measure(fn) {
    this.start();
    const result = fn();
    const duration = this.end();
    return { result, duration };
  }

  async measureAsync(fn) {
    this.start();
    const result = await fn();
    const duration = this.end();
    return { result, duration };
  }
}

// Result aggregation and analysis
class BenchmarkResults {
  constructor() {
    this.results = new Map();
    this.summary = {};
  }

  addResult(testName, strategy, iteration, data) {
    if (!this.results.has(testName)) {
      this.results.set(testName, new Map());
    }
    if (!this.results.get(testName).has(strategy)) {
      this.results.get(testName).set(strategy, []);
    }
    this.results.get(testName).get(strategy).push(data);
  }

  calculateStats(testName, strategy) {
    const data = this.results.get(testName)?.get(strategy) || [];
    if (data.length === 0) return null;

    const durations = data.map((d) => d.duration);
    const accuracies = data.map((d) => d.accuracy || 0);
    const tokenCounts = data.map((d) => d.tokens || 0);

    return {
      count: data.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
      avgTokens: tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length,
      totalTokens: tokenCounts.reduce((sum, d) => sum + d, 0),
      errorRate: data.filter((d) => d.error).length / data.length,
    };
  }

  generateReport() {
    console.log("\n=== CHROME BROWSER AI API BENCHMARK REPORT ===\n");

    for (const [testName, strategies] of this.results) {
      console.log(`\n📊 ${testName.toUpperCase()}`);
      console.log("=".repeat(60));

      for (const [strategy, data] of strategies) {
        const stats = this.calculateStats(testName, strategy);
        if (stats) {
          console.log(`\n🔧 ${strategy}:`);
          console.log(`   Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
          console.log(`   Min/Max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms`);
          console.log(`   Accuracy: ${(stats.avgAccuracy * 100).toFixed(1)}%`);
          console.log(`   Avg Tokens: ${stats.avgTokens.toFixed(0)}`);
          console.log(`   Total Tokens: ${stats.totalTokens}`);
          console.log(`   Error Rate: ${(stats.errorRate * 100).toFixed(1)}%`);
        }
      }
    }
  }
}

// Sample resume data (realistic test data)
const sampleResume = {
  personalInfo: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@email.com",
    phone: "555-123-4567",
    urls: {
      linkedin: "linkedin.com/in/john-doe",
      github: "github.com/john-doe",
      website: "johndoe.dev",
    },
    location: {
      address: "123 Main St",
      city: "Pittsburgh",
      state: "PA",
      zipCode: "15213",
    },
  },
  experience: [
    {
      companyName: "MOYU LLC",
      jobTitle: "Lead Developer & Co-Founder",
      location: "Pittsburgh, PA",
      startDate: "Nov 2024",
      endDate: "Present",
      bulletsPoints: [
        "Led full-stack development for a B2B SaaS startup, delivering a 3D model version control system",
        "Architected regulatory-compliant solution by transitioning JavaScript web app to cross-platform desktop using Electron.js",
        "Built intuitive 3D visualization features (Next.js, Three.js) for non-technical end-users",
        "Established CI/CD pipelines with GitHub Actions and scaled infrastructure on AWS",
        "Achieved 20-35% faster design turnaround times in internal beta",
      ],
    },
    {
      companyName: "UPMC",
      jobTitle: "Graduate Software Developer", 
      location: "Pittsburgh, PA",
      startDate: "Feb 2023",
      endDate: "Jan 2024",
      bulletsPoints: [
        "Developed full-stack platform for physicians using Spring Boot, React, and AWS",
        "Integrated Python NLP microservice to analyze clinical notes",
        "Reduced patient case lookup time from hours to minutes",
        "Ensured HIPAA-compliant data handling",
      ],
    },
  ],
  education: [
    {
      schoolName: "University of Pittsburgh",
      major: "Computer & Information Science",
      location: {
        city: "Pittsburgh",
        state: "PA",
        zipCode: "15213",
      },
      gpa: 3.8,
      startDate: "Aug 2022",
      endDate: "May 2024",
      degree: "Master's Degree",
    },
  ],
  skills: ["JavaScript", "React", "Node.js", "Python", "AWS", "Docker", "Spring Boot", "TypeScript"],
  projects: [
    {
      name: "Android Morse Code Keyboard",
      description: "Built custom IME with haptic feedback for Morse learning",
      techStack: ["Android", "Java", "Kotlin"],
    },
  ],
};

// Sample job description
const sampleJobDescription = `
About the job
Job Title: Software Engineer (Medical Device)


About Us
Dopl Technologies is redefining access to healthcare through remote robotic care delivery. By combining robotics, AI, and spatial computing, we're addressing clinician shortages and burnout while ensuring timely access to diagnostic and interventional care. Our first product allows expert ultrasound technicians (i.e., sonographers) to scan patients remotely, unlocking new markets and improving health equity in underserved communities. 



We're an innovative, deep-tech, impact-focused startup delivering a first-to-market solution that will change the face of healthcare delivery.


Learn more about Dopl here. 



About You 

We're seeking mission-driven builders who are passionate about technology that matters. Whether you're an engineer, clinician, or operator, you'll join a fast-moving team tackling one of healthcare's biggest challenges: access. Curiosity, collaboration, and a commitment to impact define our culture.


Why Join Us
Backed by leading investors, including Techstars, Precursor Ventures, and Tacoma Venture Fund.
Proven demand → 2000 patients scanned across 4 rural hospitals, reducing wait times by 92%.
First commercially viable remote robotic ultrasound system in the U.S.
Patent awarded with dozens more in the pipeline (so much cool tech/innovation in this space!); FDA submission expected in 2026.
Be part of an all-star team with a strong track record of success.


Job Description
We are seeking a talented and motivated Software Engineer to be part of a highly collaborative, cross-functional engineering team working on next-generation telerobotic ultrasound systems. This role bridges engineering excellence with design control leadership, serving as the technical voice that ensures every line of code, requirement, and test is aligned with regulatory submission readiness. You will contribute to system architecture, design, implementation, testing, and integration of software components that connect complex hardware systems. The ideal candidate has experience working within regulated environments and is passionate about creating safe, reliable, and innovative healthcare technology. 



Job Location
Dopl Headquarters are located in Bellevue, WA
This is a hybrid role with regular onsite collaboration in Bellevue, WA. 


Responsibilities
Design, develop, and maintain software for medical devices and supporting systems.
Collaborate with cross-functional teams, including hardware, quality, regulatory, and clinical teams, to ensure product safety and compliance.
Lead or participate in software design reviews, code reviews, and formal risk assessments. Ensure design outputs meet traceability expectations.
Ensure the system complies with relevant standards, such as IEC 62304, ISO 13485, ISO 14971, and FDA 21 CFR Part 820, the Quality Management System Regulation (QMSR).
Support verification and validation planning and execution, including unit, integration, and system-level testing.
Create and maintain software documentation required for regulatory submissions, including software specifications, test plans, and design history file content.
Troubleshoot and resolve software issues to improve performance and reliability.
Drive continuous improvement of software development processes, configuration management, and quality system integrations.


Qualifications
Experience developing software for medical devices or products in other regulated industries.
Proficiency in one or more programming languages (e.g., C++, Python, or NodeJS).
Working knowledge and practical understanding of software development life cycle (SDLC) and medical device regulatory standards, including IEC 62304, ISO 13485, and ISO 14971.
Strong analytical, documentation, and problem-solving skills.
Excellent communication and teamwork abilities.


Preferred Skills 

Bachelor's degree in Computer Science, Software Engineering, Biomedical Engineering, or related field (Master's preferred).
Experience with cloud-connected or mobile medical devices.
Familiarity with cybersecurity and data privacy requirements for medical software, including threat modeling and secure communication.
Knowledge of usability engineering per IEC 62366 and FDA cybersecurity guidance.
`;

// Form field definitions for testing
const FORM_FIELDS = {
  personalInfo: [
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "lastName", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "linkedInAccount", label: "LinkedIn", type: "url", required: false },
  ],
  workExperience: [
    { name: "jobTitle", label: "Job Title", type: "text", required: true },
    { name: "companyName", label: "Company", type: "text", required: true },
    { name: "location", label: "Location", type: "text", required: false },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: false },
    { name: "currentlyWorkHere", label: "I currently work here", type: "checkbox", required: false },
    { name: "roleDescription", label: "Role Description", type: "textarea", required: false },
  ],
  education: [
    { name: "schoolName", label: "School or University", type: "text", required: true },
    { name: "degree", label: "Degree", type: "select", required: true },
    { name: "major", label: "Major", type: "text", required: false },
    { name: "gpa", label: "GPA", type: "number", required: false },
  ],
  skills: [
    { name: "skills", label: "Skills", type: "multiselect", required: false },
  ],
};

// Test scenarios
const TEST_SCENARIOS = {
  basic: {
    name: "Basic Form Filling",
    fields: ["firstName", "lastName", "email", "phone", "jobTitle", "companyName"],
  },
  complex: {
    name: "Complex Form Filling", 
    fields: ["firstName", "lastName", "email", "phone", "linkedInAccount", "jobTitle", "companyName", "location", "startDate", "endDate", "roleDescription", "schoolName", "degree", "skills"],
  },
  performance: {
    name: "Performance Test (Many Fields)",
    fields: ["firstName", "lastName", "email", "phone", "linkedInAccount", "jobTitle", "companyName", "location", "startDate", "endDate", "currentlyWorkHere", "roleDescription", "schoolName", "degree", "major", "gpa", "skills"],
  },
  structured: {
    name: "Structured Output Test",
    fields: ["firstName", "lastName", "email", "jobTitle", "companyName", "startDate", "skills"],
  },
};

// Chrome Browser AI API Test Strategies
class ChromeAIBenchmark {
  constructor() {
    this.timer = new BenchmarkTimer();
    this.results = new BenchmarkResults();
    this.model = null;
  }

  async initialize() {
    try {
      // Check if Chrome Browser AI API is available
      if (!window.LanguageModel) {
        throw new Error("Chrome Browser AI API (window.LanguageModel) is not available. Make sure you're running this in Chrome with AI features enabled.");
      }

      // Initialize the language model
      this.model = await window.LanguageModel.create({
        temperature: 0.1, // Low temperature for consistent results
        topK: 40,
      });

      console.log("✅ Chrome Browser AI API initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Chrome Browser AI API:", error);
      return false;
    }
  }

  // Strategy 1: Zero-shot prompting
  async testZeroShot(scenario, iteration) {
    const { result, duration } = await this.timer.measureAsync(async () => {
      const results = {};

      for (const fieldName of scenario.fields) {
        try {
          const field = this.getFieldDefinition(fieldName);
          const prompt = this.buildZeroShotPrompt(field, sampleResume, sampleJobDescription);

          const response = await this.model.prompt(prompt);
          const value = this.extractValue(response, field);

          results[fieldName] = {
            value,
            success: true,
            tokens: this.estimateTokens(prompt + response),
          };
        } catch (error) {
          results[fieldName] = {
            value: null,
            success: false,
            error: error.message,
          };
        }
      }

      return results;
    });

    this.results.addResult(scenario.name, "zero-shot", iteration, {
      duration,
      result,
      accuracy: this.calculateAccuracy(result),
      tokens: Object.values(result).reduce((sum, r) => sum + (r.tokens || 0), 0),
    });

    return result;
  }

  // Strategy 2: Session-based with .prompt() (using clone)
  async testSessionClonePrompt(scenario, iteration) {
    const { result, duration } = await this.timer.measureAsync(async () => {
      const results = {};

      for (const fieldName of scenario.fields) {
        try {
          const field = this.getFieldDefinition(fieldName);
          // Create a cloned model instance for each field
          const clonedModel = await this.model.clone();
          
          const contextPrompt = this.buildContextPrompt(sampleResume, sampleJobDescription);
          const fieldPrompt = this.buildFieldPrompt(field);
          
          // Combine context and field prompt
          const fullPrompt = `${contextPrompt}\n\n${fieldPrompt}`;
          const response = await clonedModel.prompt(fullPrompt);
          const value = this.extractValue(response, field);

          results[fieldName] = {
            value,
            success: true,
            tokens: this.estimateTokens(fullPrompt + response),
          };
        } catch (error) {
          results[fieldName] = {
            value: null,
            success: false,
            error: error.message,
          };
        }
      }

      return results;
    });

    this.results.addResult(scenario.name, "session-clone-prompt", iteration, {
      duration,
      result,
      accuracy: this.calculateAccuracy(result),
      tokens: Object.values(result).reduce((sum, r) => sum + (r.tokens || 0), 0),
    });

    return result;
  }

  // Strategy 3: Session-based with .append() (using clone)
  async testSessionCloneAppend(scenario, iteration) {
    const { result, duration } = await this.timer.measureAsync(async () => {
      const results = {};

      for (const fieldName of scenario.fields) {
        try {
          const field = this.getFieldDefinition(fieldName);
          // Create a cloned model instance for each field
          const clonedModel = await this.model.clone();
          
          const contextPrompt = this.buildContextPrompt(sampleResume, sampleJobDescription);
          const fieldPrompt = this.buildFieldPrompt(field);
          
          // Use append instead of prompt
          await clonedModel.append(contextPrompt);
          const response = await clonedModel.prompt(fieldPrompt);
          const value = this.extractValue(response, field);

          results[fieldName] = {
            value,
            success: true,
            tokens: this.estimateTokens(contextPrompt + fieldPrompt + response),
          };
        } catch (error) {
          results[fieldName] = {
            value: null,
            success: false,
            error: error.message,
          };
        }
      }

      return results;
    });

    this.results.addResult(scenario.name, "session-clone-append", iteration, {
      duration,
      result,
      accuracy: this.calculateAccuracy(result),
      tokens: Object.values(result).reduce((sum, r) => sum + (r.tokens || 0), 0),
    });

    return result;
  }

  // Strategy 4: Session-based with .append() (building context)
  async testSessionAppend(scenario, iteration) {
    const { result, duration } = await this.timer.measureAsync(async () => {
      const results = {};
      let contextPrompt = this.buildContextPrompt(sampleResume, sampleJobDescription);

      for (const fieldName of scenario.fields) {
        try {
          const field = this.getFieldDefinition(fieldName);
          const fieldPrompt = this.buildFieldPrompt(field);

          // Simulate append by building up context
          const fullPrompt = `${contextPrompt}\n\n${fieldPrompt}`;
          const response = await this.model.prompt(fullPrompt);
          const value = this.extractValue(response, field);

          results[fieldName] = {
            value,
            success: true,
            tokens: this.estimateTokens(fullPrompt + response),
          };

          // Update context for next iteration (simulating append)
          contextPrompt += `\n\nField: ${field.label} = ${value}`;
        } catch (error) {
          results[fieldName] = {
            value: null,
            success: false,
            error: error.message,
          };
        }
      }

      return results;
    });

    this.results.addResult(scenario.name, "session-append", iteration, {
      duration,
      result,
      accuracy: this.calculateAccuracy(result),
      tokens: Object.values(result).reduce((sum, r) => sum + (r.tokens || 0), 0),
    });

    return result;
  }

  // Strategy 5: Batch processing with structured JSON output
  async testBatchStructured(scenario, iteration) {
    const { result, duration } = await this.timer.measureAsync(async () => {
      try {
        const prompt = this.buildBatchStructuredPrompt(scenario, sampleResume, sampleJobDescription);
        const response = await this.model.prompt(prompt);
        const structuredResult = this.parseStructuredOutput(response);

        return structuredResult;
      } catch (error) {
        return {
          error: error.message,
          success: false,
        };
      }
    });

    this.results.addResult(scenario.name, "batch-structured", iteration, {
      duration,
      result,
      accuracy: this.calculateAccuracy(result),
      tokens: this.estimateTokens(prompt + JSON.stringify(result)),
    });

    return result;
  }

  // Strategy 6: Batch processing with free-form output
  async testBatchFreeform(scenario, iteration) {
    const { result, duration } = await this.timer.measureAsync(async () => {
      try {
        const prompt = this.buildBatchFreeformPrompt(scenario, sampleResume, sampleJobDescription);
        const response = await this.model.prompt(prompt);
        const freeformResult = this.parseFreeformOutput(response, scenario.fields);

        return freeformResult;
      } catch (error) {
        return {
          error: error.message,
          success: false,
        };
      }
    });

    this.results.addResult(scenario.name, "batch-freeform", iteration, {
      duration,
      result,
      accuracy: this.calculateAccuracy(result),
      tokens: this.estimateTokens(prompt + JSON.stringify(result)),
    });

    return result;
  }

  // Helper methods
  getFieldDefinition(fieldName) {
    for (const category of Object.values(FORM_FIELDS)) {
      const field = category.find((f) => f.name === fieldName);
      if (field) return field;
    }
    throw new Error(`Field ${fieldName} not found`);
  }

  buildZeroShotPrompt(field, resume, jobDescription) {
    return `You are an AI assistant helping to fill out job application forms.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

FIELD TO FILL:
- Label: ${field.label}
- Type: ${field.type}
- Required: ${field.required}

Please provide ONLY the value for the "${field.label}" field based on the resume and job description. Be concise and accurate.`;
  }

  buildContextPrompt(resume, jobDescription) {
    return `You are an AI assistant helping to fill out job application forms.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

I will ask you to fill specific form fields based on this information. Please be ready to provide accurate, concise answers.`;
  }

  buildFieldPrompt(field) {
    return `Please provide the value for the "${field.label}" field (type: ${field.type}, required: ${field.required}). Be concise and accurate.`;
  }

  buildBatchStructuredPrompt(scenario, resume, jobDescription) {
    const fields = scenario.fields.map((name) => this.getFieldDefinition(name));

    return `You are an AI assistant helping to fill out job application forms.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Please fill out the following form fields. Return your response as a JSON object with the field names as keys:

FIELDS TO FILL:
${fields.map((f) => `- ${f.name}: ${f.label} (${f.type}, required: ${f.required})`).join("\n")}

Return ONLY a valid JSON object with the field values. No additional text or explanation.`;
  }

  buildBatchFreeformPrompt(scenario, resume, jobDescription) {
    const fields = scenario.fields.map((name) => this.getFieldDefinition(name));

    return `You are an AI assistant helping to fill out job application forms.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Please fill out the following form fields. For each field, provide the value on a new line in the format "FieldName: Value":

FIELDS TO FILL:
${fields.map((f) => `- ${f.name}: ${f.label} (${f.type}, required: ${f.required})`).join("\n")}

Provide the values in the requested format.`;
  }

  extractValue(responseText, field) {
    const text = responseText.trim();

    if (field.type === "checkbox") {
      return text.toLowerCase().includes("yes") || text.toLowerCase().includes("true");
    }

    if (field.type === "date") {
      // Extract date patterns
      const dateMatch = text.match(/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{4}/);
      return dateMatch ? dateMatch[0] : text;
    }

    if (field.type === "multiselect") {
      // Extract comma-separated values
      const items = text.split(',').map(item => item.trim()).filter(item => item.length > 0);
      return items;
    }

    return text;
  }

  parseStructuredOutput(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON found in response");
    } catch (error) {
      return { error: error.message, success: false };
    }
  }

  parseFreeformOutput(responseText, fieldNames) {
    const result = {};
    const lines = responseText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const fieldName = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (fieldNames.includes(fieldName)) {
          result[fieldName] = value;
        }
      }
    }

    return result;
  }

  calculateAccuracy(result) {
    if (result.error) return 0;

    const values = Object.values(result);
    const successful = values.filter((v) => v.success && v.value !== null && v.value !== "");
    return successful.length / values.length;
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Run all tests for a scenario
  async runScenario(scenario) {
    console.log(`\n🧪 Running ${scenario.name}...`);

    for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
      console.log(`  Iteration ${i + 1}/${BENCHMARK_CONFIG.iterations}`);

      // Run all strategies
      await this.testZeroShot(scenario, i);
      await this.testSessionClonePrompt(scenario, i);
      await this.testSessionCloneAppend(scenario, i);
      await this.testSessionAppend(scenario, i);
      await this.testBatchStructured(scenario, i);
      await this.testBatchFreeform(scenario, i);
    }
  }

  // Run all benchmarks
  async runAllBenchmarks() {
    console.log("🚀 Starting Chrome Browser AI API Benchmark...\n");

    const initialized = await this.initialize();
    if (!initialized) return;

    // Run main form filling scenarios
    for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
      await this.runScenario(scenario);
    }

    this.results.generateReport();
  }

  // Run specific test categories
  async runBasicTests() {
    console.log("🚀 Running Basic Tests...\n");

    const initialized = await this.initialize();
    if (!initialized) return;

    await this.runScenario(TEST_SCENARIOS.basic);
    this.results.generateReport();
  }

  async runPerformanceTests() {
    console.log("🚀 Running Performance Tests...\n");

    const initialized = await this.initialize();
    if (!initialized) return;

    await this.runScenario(TEST_SCENARIOS.performance);
    this.results.generateReport();
  }

  async runStructuredTests() {
    console.log("🚀 Running Structured Output Tests...\n");

    const initialized = await this.initialize();
    if (!initialized) return;

    await this.runScenario(TEST_SCENARIOS.structured);
    this.results.generateReport();
  }
}

// Main execution functions
async function runBenchmark() {
  const benchmark = new ChromeAIBenchmark();
  await benchmark.runAllBenchmarks();
}

async function runBasicBenchmark() {
  const benchmark = new ChromeAIBenchmark();
  await benchmark.runBasicTests();
}

async function runPerformanceBenchmark() {
  const benchmark = new ChromeAIBenchmark();
  await benchmark.runPerformanceTests();
}

async function runStructuredBenchmark() {
  const benchmark = new ChromeAIBenchmark();
  await benchmark.runStructuredTests();
}

// Utility function to test a single strategy
async function testSingleStrategy(strategy, scenario = "basic") {
  const benchmark = new ChromeAIBenchmark();
  await benchmark.initialize();

  const testScenario = TEST_SCENARIOS[scenario];
  console.log(`Testing ${strategy} strategy with ${testScenario.name}...`);

  switch (strategy) {
    case "zero-shot":
      return await benchmark.testZeroShot(testScenario, 0);
    case "session-clone-prompt":
      return await benchmark.testSessionClonePrompt(testScenario, 0);
    case "session-clone-append":
      return await benchmark.testSessionCloneAppend(testScenario, 0);
    case "session-append":
      return await benchmark.testSessionAppend(testScenario, 0);
    case "batch-structured":
      return await benchmark.testBatchStructured(testScenario, 0);
    case "batch-freeform":
      return await benchmark.testBatchFreeform(testScenario, 0);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}

// Export functions for use
window.runBenchmark = runBenchmark;
window.runBasicBenchmark = runBasicBenchmark;
window.runPerformanceBenchmark = runPerformanceBenchmark;
window.runStructuredBenchmark = runStructuredBenchmark;
window.testSingleStrategy = testSingleStrategy;

// Usage instructions
console.log(`
🎯 CHROME BROWSER AI API BENCHMARK READY!

Available functions:
- runBenchmark() - Run all tests (comprehensive)
- runBasicBenchmark() - Run basic form filling tests
- runPerformanceBenchmark() - Run performance tests with many fields
- runStructuredBenchmark() - Run structured output comparison tests
- testSingleStrategy(strategy, scenario) - Test a single strategy

Available strategies:
- 'zero-shot' - Each field gets full context in separate prompts
- 'session-clone-prompt' - Context + field prompt, using model.clone() + .prompt()
- 'session-clone-append' - Context + field prompt, using model.clone() + .append()
- 'session-append' - Context builds up with each field (simulating append)
- 'batch-structured' - All fields in one structured JSON prompt
- 'batch-freeform' - All fields in one free-form prompt

Available scenarios:
- 'basic' - Basic form fields (6 fields)
- 'complex' - Complex form with all fields (14 fields)
- 'performance' - Many fields for performance testing (17 fields)
- 'structured' - Structured output comparison (7 fields)

Example usage:
runBenchmark() // Run everything
testSingleStrategy('zero-shot', 'basic') // Test zero-shot with basic fields
runBasicBenchmark() // Run just basic tests

Note: This benchmark uses the Chrome Browser AI API (window.LanguageModel)
Make sure Chrome Browser AI API is enabled in your browser!
`);

// Auto-run basic test if desired
runBenchmark();
