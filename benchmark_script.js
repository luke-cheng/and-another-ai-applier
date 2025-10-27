// Chrome Prompt API Benchmark Script
// Run this in Chrome DevTools Console on a page with the Prompt API available
// This will test the performance of different AI operations

console.log("🚀 Starting Chrome Prompt API Benchmark...\n");

// Test data - similar to what our extension uses
const testResumeData = {
  personalInfo: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@email.com",
    phone: "+1-555-123-4567",
    urls: {
      linkedin: "https://linkedin.com/in/johndoe",
      github: "https://github.com/johndoe",
      website: "https://johndoe.dev",
    },
    location: {
      address: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
    },
  },
  experience: [
    {
      companyName: "Tech Corp",
      jobTitle: "Senior Software Engineer",
      location: "San Francisco, CA",
      startDate: "2020-01",
      endDate: "2023-12",
      bulletsPoints: [
        "Led development of microservices architecture",
        "Improved system performance by 40%",
        "Mentored 5 junior developers",
      ],
    },
    {
      companyName: "StartupXYZ",
      jobTitle: "Full Stack Developer",
      location: "Remote",
      startDate: "2018-06",
      endDate: "2019-12",
      bulletsPoints: [
        "Built React frontend applications",
        "Developed Node.js backend APIs",
        "Implemented CI/CD pipelines",
      ],
    },
  ],
  education: [
    {
      schoolName: "University of California",
      major: "Computer Science",
      location: {
        address: "Berkeley, CA",
        city: "Berkeley",
        state: "CA",
        zipCode: "94720",
      },
      gpa: 3.8,
      startDate: "2014-09",
      endDate: "2018-05",
      description: ["Graduated Magna Cum Laude", "Dean's List 6 semesters"],
    },
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "AWS",
    "Docker",
  ],
  certifications: ["AWS Solutions Architect", "Google Cloud Professional"],
  legal: {
    authorizedToWorkInUSA: true,
    needSponsorship: false,
    sponsorshipExplanation: "",
  },
  projects: [
    {
      name: "E-commerce Platform",
      description: "Full-stack e-commerce solution with React and Node.js",
      url: "https://github.com/johndoe/ecommerce",
    },
  ],
  customFields: {},
  lastUpdated: new Date().toISOString(),
};

const testFormFields = [
  {
    id: "firstName",
    label: "First Name",
    type: "text",
    value: "",
    selector: "#firstName",
  },
  {
    id: "lastName",
    label: "Last Name",
    type: "text",
    value: "",
    selector: "#lastName",
  },
  {
    id: "email",
    label: "Email Address",
    type: "email",
    value: "",
    selector: "#email",
  },
  {
    id: "phone",
    label: "Phone Number",
    type: "tel",
    value: "",
    selector: "#phone",
  },
  {
    id: "linkedin",
    label: "LinkedIn Profile",
    type: "url",
    value: "",
    selector: "#linkedin",
  },
  {
    id: "github",
    label: "GitHub Profile",
    type: "url",
    value: "",
    selector: "#github",
  },
  {
    id: "website",
    label: "Personal Website",
    type: "url",
    value: "",
    selector: "#website",
  },
  {
    id: "address",
    label: "Street Address",
    type: "text",
    value: "",
    selector: "#address",
  },
  { id: "city", label: "City", type: "text", value: "", selector: "#city" },
  { id: "state", label: "State", type: "text", value: "", selector: "#state" },
  {
    id: "zipCode",
    label: "ZIP Code",
    type: "text",
    value: "",
    selector: "#zipCode",
  },
  {
    id: "currentTitle",
    label: "Current Job Title",
    type: "text",
    value: "",
    selector: "#currentTitle",
  },
  {
    id: "currentCompany",
    label: "Current Company",
    type: "text",
    value: "",
    selector: "#currentCompany",
  },
  {
    id: "yearsExperience",
    label: "Years of Experience",
    type: "text",
    value: "",
    selector: "#yearsExperience",
  },
  {
    id: "skills",
    label: "Key Skills",
    type: "text",
    value: "",
    selector: "#skills",
  },
];

// Benchmark utilities
function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function runBenchmark() {
  const results = {};

  try {
    // Test 1: Check Availability
    console.log("📊 Test 1: Checking AI Availability...");
    const availabilityStart = performance.now();
    const availability = await window.LanguageModel.availability();
    const availabilityTime = performance.now() - availabilityStart;
    results.availability = { time: availabilityTime, status: availability };
    console.log(
      `✅ Availability check: ${formatTime(
        availabilityTime
      )} - Status: ${availability}\n`
    );

    if (availability === "unavailable") {
      console.log("❌ AI not available, skipping remaining tests");
      return results;
    }

    // Test 2: Get Model Parameters
    console.log("📊 Test 2: Getting Model Parameters...");
    const paramsStart = performance.now();
    const params = await window.LanguageModel.params();
    const paramsTime = performance.now() - paramsStart;
    results.params = { time: paramsTime, data: params };
    console.log(
      `✅ Parameters: ${formatTime(paramsTime)} - Temp: ${
        params.defaultTemperature
      }, TopK: ${params.defaultTopK}\n`
    );

    // Test 3: Create Session (Cold Start)
    console.log("📊 Test 3: Creating Session (Cold Start)...");
    const createStart = performance.now();
    const session = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [
        {
          role: "system",
          content:
            "You are a job application assistant. You help users fill out online job applications by filling in form fields from a well formatted resume text into structured formats. Be accurate, thorough, and professional in your responses.",
        },
      ],
    });
    const createTime = performance.now() - createStart;
    results.createSession = { time: createTime };
    console.log(`✅ Session created: ${formatTime(createTime)}\n`);

    // Test 4: Single Prompt - Zero-Shot Approach
    console.log("📊 Test 4: Single Prompt - Zero-Shot Approach...");
    const zeroShotSingleSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });

    const zeroShotSinglePrompt = `Based on this resume data: ${JSON.stringify(
      testResumeData,
      null,
      2
    )}, fill the form field "First Name" (type: text). Field to fill: "First Name" (text)`;
    const zeroShotSingleStart = performance.now();
    const zeroShotSingleResponse = await zeroShotSingleSession.prompt(
      zeroShotSinglePrompt
    );
    const zeroShotSingleTime = performance.now() - zeroShotSingleStart;
    results.zeroShotSingle = {
      time: zeroShotSingleTime,
      responseLength: zeroShotSingleResponse.length,
    };

    await zeroShotSingleSession.destroy();
    console.log(
      `✅ Zero-shot single prompt: ${formatTime(
        zeroShotSingleTime
      )} - Response: "${zeroShotSingleResponse}"\n`
    );

    // Test 4.5: Single Prompt - System Prompt Approach
    console.log("📊 Test 4.5: Single Prompt - System Prompt Approach...");
    const systemSingleSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [
        {
          role: "system",
          content: `You are a job application assistant. Use this resume data to fill form fields: ${JSON.stringify(
            testResumeData,
            null,
            2
          )}. Provide only the field value, no explanations.`,
        },
      ],
    });

    const systemSinglePrompt = `Fill the form field "First Name" (type: text)`;
    const systemSingleStart = performance.now();
    const systemSingleResponse = await systemSingleSession.prompt(
      systemSinglePrompt
    );
    const systemSingleTime = performance.now() - systemSingleStart;
    results.systemSingle = {
      time: systemSingleTime,
      responseLength: systemSingleResponse.length,
    };

    await systemSingleSession.destroy();
    console.log(
      `✅ System prompt single: ${formatTime(
        systemSingleTime
      )} - Response: "${systemSingleResponse}"\n`
    );

    // Compare single prompt approaches
    const singlePromptSpeedup = zeroShotSingleTime / systemSingleTime;
    console.log(
      `⚡ Single Prompt Comparison: System prompt is ${singlePromptSpeedup.toFixed(
        2
      )}x ${singlePromptSpeedup > 1 ? "slower" : "faster"} than zero-shot\n`
    );

    // Test 6: Zero-Shot Approach (Create New Session Per Field)
    console.log("📊 Test 6: Zero-Shot Approach (New Session Per Field)...");
    const zeroShotStart = performance.now();
    const zeroShotResults = [];

    for (let i = 0; i < testFormFields.length; i++) {
      const field = testFormFields[i];

      // Create new session for each field (zero-shot)
      const fieldSessionStart = performance.now();
      const fieldSession = await window.LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });

      const fieldPrompt = `Based on this resume data: ${JSON.stringify(
        testResumeData,
        null,
        2
      )}, fill the form field "${field.label}" (type: ${
        field.type
      }). Field to fill: "${field.label}" (${field.type})`;

      const promptStart = performance.now();
      const fieldResponse = await fieldSession.prompt(fieldPrompt);
      const promptTime = performance.now() - promptStart;

      await fieldSession.destroy();
      const totalFieldTime = performance.now() - fieldSessionStart;

      zeroShotResults.push({
        field: field.label,
        time: totalFieldTime,
        response: fieldResponse,
      });
    }

    const zeroShotTime = performance.now() - zeroShotStart;
    results.zeroShotApproach = {
      time: zeroShotTime,
      averagePerField: zeroShotTime / testFormFields.length,
      fieldResults: zeroShotResults,
    };
    console.log(
      `✅ Zero-shot approach: ${formatTime(zeroShotTime)} (avg: ${formatTime(
        zeroShotTime / testFormFields.length
      )} per field)\n`
    );

    // Test 7: System Prompt + Clone Approach
    console.log("📊 Test 7: System Prompt + Clone Approach...");
    const systemPromptStart = performance.now();

    // Create base session with resume data in system prompt
    const baseSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [
        {
          role: "system",
          content: `You are a job application assistant. Use this resume data to fill form fields: ${JSON.stringify(
            testResumeData,
            null,
            2
          )}. Provide only the field value, no explanations.`,
        },
      ],
    });

    const cloneResults = [];
    for (let i = 0; i < testFormFields.length; i++) {
      const field = testFormFields[i];

      // Clone session for each field
      const cloneStart = performance.now();
      const clonedSession = await baseSession.clone({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });

      const fieldPrompt = `Fill the form field "${field.label}" (type: ${field.type})`;

      const promptStart = performance.now();
      const fieldResponse = await clonedSession.prompt(fieldPrompt);
      const promptTime = performance.now() - promptStart;

      await clonedSession.destroy();
      const totalFieldTime = performance.now() - cloneStart;

      cloneResults.push({
        field: field.label,
        time: totalFieldTime,
        response: fieldResponse,
      });
    }

    await baseSession.destroy();
    const systemPromptTime = performance.now() - systemPromptStart;
    results.systemPromptClone = {
      time: systemPromptTime,
      averagePerField: systemPromptTime / testFormFields.length,
      fieldResults: cloneResults,
    };
    console.log(
      `✅ System prompt + clone: ${formatTime(
        systemPromptTime
      )} (avg: ${formatTime(
        systemPromptTime / testFormFields.length
      )} per field)\n`
    );

    // Test 7.5: System Prompt + Append Approach (No Cloning)
    console.log("📊 Test 7.5: System Prompt + Append Approach (No Cloning)...");
    const appendStart = performance.now();

    // Create base session with resume data in system prompt
    const appendSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [
        {
          role: "system",
          content: `You are a job application assistant. Use this resume data to fill form fields: ${JSON.stringify(
            testResumeData,
            null,
            2
          )}. Provide only the field value, no explanations.`,
        },
      ],
    });

    const appendResults = [];
    for (let i = 0; i < testFormFields.length; i++) {
      const field = testFormFields[i];

      const fieldPrompt = `Fill the form field "${field.label}" (type: ${field.type})`;

      const promptStart = performance.now();
      const fieldResponse = await appendSession.prompt(fieldPrompt);
      const promptTime = performance.now() - promptStart;

      appendResults.push({
        field: field.label,
        time: promptTime,
        response: fieldResponse,
      });
    }

    await appendSession.destroy();
    const appendTime = performance.now() - appendStart;
    results.systemPromptAppend = {
      time: appendTime,
      averagePerField: appendTime / testFormFields.length,
      fieldResults: appendResults,
    };
    console.log(
      `✅ System prompt + append: ${formatTime(appendTime)} (avg: ${formatTime(
        appendTime / testFormFields.length
      )} per field)\n`
    );

    // Test 8: Sequential Prompts (Current Approach)
    console.log("📊 Test 8: Sequential Prompts (Current Approach)...");
    const sequentialStart = performance.now();
    
    // Create clean session for sequential test
    const sequentialSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    
    const sequentialResults = [];

    for (let i = 0; i < testFormFields.length; i++) {
      const field = testFormFields[i];
      const fieldPrompt = `Based on this resume data: ${JSON.stringify(
        testResumeData,
        null,
        2
      )}, fill the form field "${field.label}" (type: ${
        field.type
      }). Field to fill: "${field.label}" (${field.type})`;

      const fieldStart = performance.now();
      const fieldResponse = await sequentialSession.prompt(fieldPrompt);
      const fieldTime = performance.now() - fieldStart;

      sequentialResults.push({
        field: field.label,
        time: fieldTime,
        response: fieldResponse,
      });
    }
    
    await sequentialSession.destroy();

    const sequentialTime = performance.now() - sequentialStart;
    results.sequentialPrompts = {
      time: sequentialTime,
      averagePerField: sequentialTime / testFormFields.length,
      fieldResults: sequentialResults,
    };
    console.log(
      `✅ Sequential prompts: ${formatTime(sequentialTime)} (avg: ${formatTime(
        sequentialTime / testFormFields.length
      )} per field)\n`
    );

    // Test 9: Parallel Prompts (Async Comparison)
    console.log("📊 Test 9: Parallel Prompts (Async Comparison)...");
    const parallelStart = performance.now();

    // Create clean session for parallel test
    const parallelSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });

    // Create parallel promises for all fields
    const parallelPromises = testFormFields.map(async (field, index) => {
      const fieldPrompt = `Based on this resume data: ${JSON.stringify(
        testResumeData,
        null,
        2
      )}, fill the form field "${field.label}" (type: ${
        field.type
      }). Field to fill: "${field.label}" (${field.type})`;

      const fieldStart = performance.now();
      const fieldResponse = await parallelSession.prompt(fieldPrompt);
      const fieldTime = performance.now() - fieldStart;

      return {
        field: field.label,
        time: fieldTime,
        response: fieldResponse,
      };
    });

    // Wait for all parallel operations to complete
    const parallelResults = await Promise.all(parallelPromises);
    const parallelTime = performance.now() - parallelStart;
    
    await parallelSession.destroy();

    results.parallelPrompts = {
      time: parallelTime,
      averagePerField: parallelTime / testFormFields.length,
      fieldResults: parallelResults,
    };
    console.log(
      `✅ Parallel prompts: ${formatTime(parallelTime)} (avg: ${formatTime(
        parallelTime / testFormFields.length
      )} per field)\n`
    );

    // Compare all approaches
    console.log("🔄 Approach Comparison:");
    console.log(`Zero-shot: ${formatTime(zeroShotTime)}`);
    console.log(`System + Clone: ${formatTime(systemPromptTime)}`);
    console.log(`System + Append: ${formatTime(appendTime)}`);
    console.log(`Sequential: ${formatTime(sequentialTime)}`);
    console.log(`Parallel: ${formatTime(parallelTime)}`);
    console.log(
      `Parallel vs Sequential: ${(sequentialTime / parallelTime).toFixed(
        2
      )}x faster`
    );
    console.log(
      `Append vs Clone: ${(systemPromptTime / appendTime).toFixed(2)}x ${
        systemPromptTime > appendTime ? "slower" : "faster"
      }\n`
    );

    // Test 10: Session Usage Tracking
    console.log("📊 Test 10: Session Usage Tracking...");
    const usageStart = performance.now();
    
    // Create a fresh session for usage tracking
    const usageSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    
    const usage = {
      inputUsage: usageSession.inputUsage,
      inputQuota: usageSession.inputQuota,
    };
    const usageTime = performance.now() - usageStart;
    
    await usageSession.destroy();
    results.usageTracking = { time: usageTime, usage: usage };
    console.log(
      `✅ Usage tracking: ${formatTime(usageTime)} - Usage: ${
        usage.inputUsage
      }/${usage.inputQuota}\n`
    );

    // Test 11: Create Session (Warm Start)
    console.log("📊 Test 11: Creating Session (Warm Start)...");
    const warmCreateStart = performance.now();
    const warmSession = await window.LanguageModel.create({
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    const warmCreateTime = performance.now() - warmCreateStart;
    results.warmCreateSession = { time: warmCreateTime };
    console.log(`✅ Warm session created: ${formatTime(warmCreateTime)}\n`);

    // Clean up
    await session.destroy();
    await warmSession.destroy();

    // Summary
    console.log("📈 BENCHMARK SUMMARY");
    console.log("==================");

    const sortedResults = Object.entries(results)
      .filter(([key, value]) => typeof value.time === "number")
      .sort(([, a], [, b]) => b.time - a.time);

    console.log("\n🏆 Slowest Operations:");
    sortedResults.forEach(([operation, data], index) => {
      console.log(`${index + 1}. ${operation}: ${formatTime(data.time)}`);
    });

    console.log("\n⚡ Fastest Operations:");
    sortedResults
      .slice(-3)
      .reverse()
      .forEach(([operation, data], index) => {
        console.log(`${index + 1}. ${operation}: ${formatTime(data.time)}`);
      });

    // Approach Analysis
    if (
      results.zeroShotApproach &&
      results.systemPromptClone &&
      results.systemPromptAppend &&
      results.sequentialPrompts &&
      results.parallelPrompts
    ) {
      console.log("\n🔄 Approach Performance Analysis:");
      console.log(
        `Zero-shot (new session per field): ${formatTime(
          results.zeroShotApproach.time
        )}`
      );
      console.log(
        `System prompt + clone: ${formatTime(results.systemPromptClone.time)}`
      );
      console.log(
        `System prompt + append: ${formatTime(results.systemPromptAppend.time)}`
      );
      console.log(
        `Sequential (current approach): ${formatTime(
          results.sequentialPrompts.time
        )}`
      );
      console.log(
        `Parallel (async): ${formatTime(results.parallelPrompts.time)}`
      );

      console.log("\n⚡ Speed Comparisons:");
      console.log(
        `Parallel vs Sequential: ${(
          results.sequentialPrompts.time / results.parallelPrompts.time
        ).toFixed(2)}x faster`
      );
      console.log(
        `System+Append vs System+Clone: ${(
          results.systemPromptClone.time / results.systemPromptAppend.time
        ).toFixed(2)}x ${
          results.systemPromptClone.time > results.systemPromptAppend.time
            ? "slower"
            : "faster"
        }`
      );
      console.log(
        `System+Append vs Zero-shot: ${(
          results.zeroShotApproach.time / results.systemPromptAppend.time
        ).toFixed(2)}x ${
          results.zeroShotApproach.time > results.systemPromptAppend.time
            ? "slower"
            : "faster"
        }`
      );

      // Find best and worst approaches
      const allApproaches = [
        { name: "Zero-shot", time: results.zeroShotApproach.time },
        { name: "System+Clone", time: results.systemPromptClone.time },
        { name: "System+Append", time: results.systemPromptAppend.time },
        { name: "Sequential", time: results.sequentialPrompts.time },
        { name: "Parallel", time: results.parallelPrompts.time },
      ];

      const sortedApproaches = allApproaches.sort((a, b) => a.time - b.time);
      const best = sortedApproaches[0];
      const worst = sortedApproaches[sortedApproaches.length - 1];

      console.log(
        `\n🏆 Best Approach: ${best.name} (${formatTime(best.time)})`
      );
      console.log(
        `🐌 Worst Approach: ${worst.name} (${formatTime(worst.time)})`
      );
      console.log(
        `📊 Performance Difference: ${(worst.time / best.time).toFixed(
          2
        )}x difference`
      );
    }

    // Single Prompt Analysis
    if (results.zeroShotSingle && results.systemSingle) {
      console.log("\n🔍 Single Prompt Analysis:");
      console.log(
        `Zero-shot single prompt: ${formatTime(results.zeroShotSingle.time)}`
      );
      console.log(
        `System prompt single: ${formatTime(results.systemSingle.time)}`
      );
      console.log(
        `Single prompt winner: ${
          results.zeroShotSingle.time < results.systemSingle.time
            ? "Zero-shot"
            : "System prompt"
        }`
      );
    }

    // Memory usage
    if (performance.memory) {
      console.log("\n💾 Memory Usage:");
      console.log(`Used: ${formatMemory(performance.memory.usedJSHeapSize)}`);
      console.log(`Total: ${formatMemory(performance.memory.totalJSHeapSize)}`);
      console.log(`Limit: ${formatMemory(performance.memory.jsHeapSizeLimit)}`);
    }

    return results;
  } catch (error) {
    console.error("❌ Benchmark failed:", error);
    return { error: error.message };
  }
}

// Run the benchmark
runBenchmark().then((results) => {
  console.log("\n🎯 Benchmark Complete!");
  console.log("Copy the results above and paste them back to the developer.");

  // Store results globally for inspection
  window.benchmarkResults = results;
  console.log("\n💡 Results stored in window.benchmarkResults for inspection");
});
