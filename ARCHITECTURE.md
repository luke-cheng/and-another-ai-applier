# Project Flow & Structure

This project implements an agentic AI approach for automated job application form filling, integrating local AI and browser APIs. Because of model constraints, the system is designed so the AI works in a tool-using, agentic, but supervised flow.

## Overall Flow

1. **User uploads resume**
2. **User clicks "Auto Fill"**
3. **System detects form fields on the active page**
4. **Fields are passed, one by one, to the AI agent, which returns suggested input (or actions, e.g., clicking a button) for each**
5. **Form fields are filled sequentially (simulating tab order / accessibility flow), optionally navigating to the next page after completion**

## Component Flow

### UI (Sidepanel)

- **Auto-Fill Panel**

  - Controls for starting auto fill (step-by-step and fully automatic modes)
  - Mimics accessibility flow: Press Tab → Fetch next field/label → Get AI suggestion → Fill → Tab → etc.
  - Option to enable auto-navigation to next form page

- **Resume Management**
  - CRUD interface for editing and managing resumes, persisted to local storage (`chrome.sync`)
- **Debug Info**
  - Debug Panel displays:
    - JSON-formatted resume data
    - The input/output for the language model per field

### AI Service Flow

- **Backed by Chrome's Gemini Nano API (`LanguageModel.create()` / `Writer.create()`)**
  - Created in [`src/types/languageModel.ts`](./src/types/languageModel.ts)
  - **`LanguageModel`**: Used for parsing resumes and simple field extraction
  - **`Writer`**: Used for complex, open-ended question responses
- **Tracks model download/progress events**

  - UI progress bar updates from model events

    ```js
    const session = await LanguageModel.create({
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
    });
    ```

- **Manages token quotas**

  - Prevents input to model from exceeding quota

    ```js
    console.log(`${session.inputUsage}/${session.inputQuota}`);
    ```

### Form Detector (Content Script) Flow

- Detects form fields by scanning `input`, `textarea`, `select`, `button`, `checkbox`, `radio` elements, etc.
- Uses a tolerant, generalized approach to determine field type/role because forms vary widely
- Fields are described with labels, types, and position, then passed to the AI for tool-based action selection

  > Debug Panel shows collected fields as JSON

### Resume Storage Flow

- Resume stored as JSON in `chrome.sync`
- Exposed functions: `saveResume()`, `getResume()`, `updateResume()`
- Simple debug display in sidepanel (for transparency/troubleshooting)

### Form Filling Flow

- AI responses used to fill individual fields sequentially (with the possibility to batch-process or validate)
- Exposed functions: `fillField()`, `fillAllFields()`, `validateFill()`
- Debug displays AI request/response per field for diagnostic purposes
