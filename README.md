# And Another AI Applier

A Chrome extension that uses the browser's built-in Gemini AI to automate job application form filling. The AI analyzes fields and context to generate responses.

Key philosophy: **We do the heavy lifting, AI does the thinking**. We detect fields, extract context, and group related inputs. The AI focuses on picking the best responses.

## Why this tool?

- **Free**: Uses on-device Gemini
- **Private**: No external APIs; data stays on your machine
- **Smart**: Groups and interprets form fields so the AI focuses on answering

## Architecture Overview

This Chrome extension follows Manifest V3 architecture with clear separation between UI components, service workers, and content scripts. All AI operations are centralized in the background service worker to maintain context isolation, as the `window.LanguageModel` API is only available in extension contexts (background worker, side panel, options page) but not in content scripts.

### Component Hierarchy

- **Frontend (Side Panel)**: React components in [src/sidepanel/sidepanel.tsx](./src/sidepanel/sidepanel.tsx) that provide the user interface
- **Background Service Worker**: [src/background.ts](./src/background.ts) routes all AI operations and maintains context isolation
- **Content Script**: [src/content_script.ts](./src/content_script.ts) handles DOM manipulation and form field detection
- **Services Layer**: Domain-specific services in [src/serviceWorker/ai_services/](./src/serviceWorker/ai_services/) that use the base AI service for session management

## Frontend Components

The side panel UI is built with React and consists of three main components orchestrated by the main [SidePanel component](./src/sidepanel/sidepanel.tsx):

### AIStatus Component

Located in [src/sidepanel/components/AIStatus.tsx](./src/sidepanel/components/AIStatus.tsx), this component displays the current state of the AI service:

- Shows AI availability status (available, downloading, unavailable)
- Displays quota usage (input tokens used vs quota limit)
- Provides a refresh button to re-check availability
- Automatically updates via the `useAIAvailability` and `useQuotaUsage` hooks

The component receives data from custom hooks that communicate with the background service worker via message passing. When the user clicks refresh or the component mounts, it sends a `checkAIAvailability` message to the background worker, which calls [baseAIService.checkAvailability()](./src/serviceWorker/ai_services/baseAIService.ts) directly.

### ResumeManagement Component

Located in [src/sidepanel/components/ResumeManagement.tsx](./src/sidepanel/components/ResumeManagement.tsx), this component provides full CRUD operations for resume data:

**Create/Update Operations:**

- User pastes raw resume text into a textarea
- Clicks "Parse Resume with AI" button
- Component sends `parseResume` message to background worker via `chrome.runtime.sendMessage()`
- Background worker receives message and calls `resumeParserService.parseResume()`
- Progress updates are forwarded via `chrome.storage.local` events (since message passing doesn't support streaming callbacks)
- Component listens to storage changes to display parsing progress
- Once complete, parsed JSON data is saved to `chrome.storage.sync` for persistence
- Component updates local state and passes parsed data to parent via `onResumeDataChange` callback

**Read Operations:**

- On component mount, loads resume data from `chrome.storage.sync`
- Displays resume status including last updated timestamp, name, experience entries count, etc.
- Allows editing JSON directly in the textarea for manual adjustments

**Delete Operations:**

- User can clear the textarea to effectively delete resume data
- Storage is updated when resume data is removed

**Abort Functionality:**

- When parsing is in progress, user can click "Stop Parsing" button
- Sends `abortAIOperation` message to background worker
- Background worker calls `baseAIService.abortOperation()` which aborts the current AI session

**Storage Access:**

- Currently uses `chrome.storage.sync` directly from the component (not routed through service worker)
- Resume data persists across devices via Chrome sync

### AIFiller Component

Located in [src/sidepanel/components/AIFiller.tsx](./src/sidepanel/components/AIFiller.tsx), this component orchestrates the form filling workflow:

**Form Field Detection:**

- User clicks "Detect Form Fields" button
- Component uses `chrome.tabs.sendMessage()` to send `detectFormFields` action to the content script in the active tab
- Content script responds with detected fields
- Component displays count and list of detected fields

**Auto-Fill Workflow:**

- User selects filling mode (automatic, step-by-step, or fully-auto)
- Optionally enters job description for context-aware responses
- Optionally enables resume file upload checkbox
- Clicks "Auto Fill Form" button
- Component sends `fillForm` message to content script with resume data, job description, and config
- Content script handles the complete filling process (see Content Script section below)
- Component receives results and displays success/error statistics

**Abort Functionality:**

- During form filling, user can click "Stop Operation" button
- Sends `abortAIOperation` message to background worker
- Background worker aborts the AI processing session

## Background Service Worker

The [background service worker](./src/background.ts) serves as the central message router and ensures all AI operations run in the correct context. It handles the following message actions:

**AI Infrastructure Messages (from side panel):**

- `checkAIAvailability`: Routes to [baseAIService.checkAvailability()](./src/serviceWorker/ai_services/baseAIService.ts) to check if the LanguageModel API is available
- `getQuotaUsage`: Routes to [baseAIService.getSessionUsage()](./src/serviceWorker/ai_services/baseAIService.ts) to retrieve current token usage and quota limits
- `abortAIOperation`: Routes to [baseAIService.abortOperation()](./src/serviceWorker/ai_services/baseAIService.ts) to cancel the current AI operation

**Domain Operation Messages:**

- `parseResume`: Routes to [resumeParserService.parseResume()](./src/serviceWorker/ai_services/resumeParserService.ts) for resume parsing. Progress is forwarded via chrome.storage.local events
- `processFormFields`: Routes to [formFillerService.processFormFields()](./src/serviceWorker/ai_services/formFillerService/index.ts) when content script needs AI to generate responses for form fields

All infrastructure calls go directly to `baseAIService` to maintain a single source of truth for the AI session state. Domain-specific operations use specialized services that compose `baseAIService` for session management.

**Key Difference from Content Script:**
The background service worker runs in an isolated extension context with access to `window.LanguageModel` API, while content scripts run in web page contexts and cannot access this API. This is why all AI operations must be routed through the background worker.

## Content Script Modules

The content script is modularized into separate utilities based on functionality. The main [content_script.ts](./src/content_script.ts) acts as a message handler that coordinates these modules:

### Field Detection Module

Located in [src/content_script/fieldDetection.ts](./src/content_script/fieldDetection.ts), this module:

- Generates unique IDs for form fields
- Detects all form fields by scanning `input`, `textarea`, and `select` elements
- Groups radio buttons by `name`, checkboxes by `fieldset` or name patterns
- Extracts full question/description text from fieldsets, aria-describedby, and surrounding DOM elements
- Adds format hints for date/month/time inputs (YYYY-MM, YYYY-MM-DD, etc.)
- Ensures each element has an `id` for mapping AI responses to HTML elements
- Returns structured field data: id, label, type, options, description, context, and format hints

The `detectFormFields()` function is async and first calls `expandAllDropdowns()` to ensure dropdown options are visible before detection.

### Dropdown Utilities Module

Located in [src/content_script/dropdownUtils.ts](./src/content_script/dropdownUtils.ts), this module:

- Expands standard `<select>` elements by setting their `size` attribute
- Handles custom dropdown implementations (Select2, Chosen, Bootstrap dropdowns, etc.)
- Uses `MutationObserver` instead of hardcoded timeouts to detect when dropdowns actually expand
- Watches for DOM changes in dropdown menus and resolves when dropdowns become visible
- Provides a fallback timeout as a safety net

### Form Filling Module

Located in [src/content_script/formFilling.ts](./src/content_script/formFilling.ts), this module:

- Maps AI responses to HTML elements via `fieldId`
- Handles text inputs, textareas, checkboxes, radio/checkbox groups, selects, and custom dropdowns
- Converts empty/null responses to "n/a" for text fields (leaves selection fields empty if no match)
- For radio/checkbox groups, finds matching options by value or label
- Uses `MutationObserver` for custom dropdowns to wait for options to appear
- Dispatches DOM events (input, change, click) to trigger form validation
- Returns success/failure status for each field

### Resume Upload Module

Located in [src/content_script/resumeUpload.ts](./src/content_script/resumeUpload.ts), this module:

- Converts structured resume JSON to plain text format using [resumeJsonToText()](./src/content_script/resumeUpload.ts)
- Finds file input fields using common patterns (accept attributes, name attributes, labels)
- Creates a File object from resume text using Blob and DataTransfer APIs
- Sets the file on the input element and dispatches change events
- Returns success/failure status

## Complete Auto-Fill Event Sequence

When a user clicks "Auto Fill Form", the following sequence occurs:

1. **AIFiller Component** sends `fillForm` message to content script with resume data, job description, and config

2. **Content Script** receives message and begins processing:

   - Calls `expandAllDropdowns()` to expand all dropdown menus
   - Calls `detectFormFields()` which:
     - Groups radios by name, checkboxes by fieldset
     - Extracts full question text from fieldsets/aria-describedby
     - Adds format hints (YYYY-MM, etc.)
     - Returns array of FormField objects

3. **Content Script** sends `processFormFields` message to background worker with detected fields, resume data, and job description

4. **Background Worker** receives message and routes to `formFillerService.processFormFields()`:

   - Creates AI session with system prompt (resume + job description)
   - For each field, builds type-specific prompt (description, format hints, options)
   - Uses JSON schema constraints to enforce proper formats
   - Returns array of AIResponse objects with fieldId and generated output

5. **Content Script** receives AI responses and fills fields:

   - Maps `fieldId` to DOM elements
   - Converts null to "n/a" for text fields
   - Matches radio/checkbox selections by value or label
   - Dispatches DOM events to trigger form validation

6. **Content Script** handles resume upload (if enabled):

   - Converts resume JSON to text
   - Finds file input field and uploads resume as text file
   - Dispatches change events

7. **Content Script** handles auto-navigation (if enabled):

   - Finds submit/next buttons by type or text content
   - Clicks the button after a short delay

8. **Content Script** sends results back to AIFiller component:

   - Returns FormFillingResult with success status, filled/skipped/error counts, and error details

9. **AIFiller Component** displays results to the user:
   - Shows success message with statistics
   - Updates quota usage display
   - Allows user to review which fields were filled

## Resume CRUD Operations

Resume management uses `chrome.storage.sync` for persistence across devices:

**Create/Update Flow:**

- User pastes resume text in ResumeManagement component
- Component sends `parseResume` message to background worker
- Background worker uses `resumeParserService` to parse unstructured text into structured JSON
- Progress is tracked via chrome.storage.local events
- Parsed JSON is returned and saved to chrome.storage.sync (currently saved directly from component, not routed through service worker)
- Component updates local state and displays parsed resume

**Read Flow:**

- Component loads resume from chrome.storage.sync on mount
- Displays resume status and allows editing
- Changes are saved automatically when JSON is edited (directly to chrome.storage.sync)

**Delete Flow:**

- User clears textarea or removes resume data
- Storage is updated to remove resume (directly via chrome.storage.sync)
- Component state is cleared

The resume data structure is defined in [src/schemas/resumeSchema.ts](./src/schemas/resumeSchema.ts) and includes personal info, experience, education, skills, certifications, and projects.

## AI Control and Usage Management

All AI infrastructure is managed through [baseAIService](./src/serviceWorker/ai_services/baseAIService.ts):

**Session Management:**

- Creates a single LanguageModel session that is shared across all operations
- Session is created with a system prompt appropriate for the task (resume parsing or form filling)
- Uses the same session for multiple operations to maintain context (no unnecessary cloning)
- Tracks session state (active/inactive) and abort controller

**Availability Checking:**

- Checks if `window.LanguageModel` API is available (only in extension contexts)
- Returns availability status: unavailable, downloadable, downloading, or available
- Validates context before attempting to use the API

**Quota Management:**

- Tracks input token usage and quota limit from the LanguageModel session
- Provides usage information to UI components for display
- Hooks like `useQuotaUsage` poll for quota updates via background worker

**Abort Functionality:**

- Abort controller allows canceling in-progress AI operations
- Can be triggered from UI components (side panel) or content script
- Properly cleans up session state when aborted

## Service Architecture

**Base AI Service** ([baseAIService.ts](./src/serviceWorker/ai_services/baseAIService.ts)):

- Singleton service managing the single LanguageModel session
- Provides session creation, availability checking, quota tracking, and abort functionality
- All infrastructure calls from background worker go directly here

**Form Filler Service** ([formFillerService/index.ts](./src/serviceWorker/ai_services/formFillerService/index.ts)):

- Composes baseAIService for session management
- Builds prompts from field context: labels, descriptions, format hints, options
- Uses type-specific JSON schemas (e.g., date patterns, enum constraints for selects)
- Injects full question text so the AI sees the actual question, not just a label

**Resume Parser Service** ([resumeParserService.ts](./src/serviceWorker/ai_services/resumeParserService.ts)):

- Composes baseAIService for session management
- Focuses on domain logic: parsing unstructured resume text into structured JSON
- Uses schema validation via response constraints

Both domain services use composition rather than inheritance to maintain flexibility and clear separation of concerns.

## Technical Details

### AI Service

- **Backed by Chrome's Gemini Nano API**
  - Created in [src/types/languageModel.ts](./src/types/languageModel.ts) sourced from (https://github.com/webmachinelearning/prompt-api)
  - **`LanguageModel`**: Used for parsing resumes and simple field extraction
  - **`Writer`**: Used for complex, open-ended question responses (e.g. "Why do you want to work for us?")
- Initial testing shows it does not support parallel sessions
- **Tracks model download/progress/token quotas**

### Form Detection and Filling

#### How It Works

1. Click autofill → detect fields by scanning `input`, `textarea`, `select`, etc.
2. Expand dropdowns to expose hidden options
3. Extract and structure fields:
   - Group radios/checkboxes
   - Grab full question text from fieldsets
   - Add format hints (YYYY-MM for month, etc.)
   - Extract options, labels, and context
4. Build type-specific prompts for the AI:
   - Text: "What's your phone number?" + format hint
   - Radio: question + "Select ONE from: Yes, No"
   - Month: question + "Format: YYYY-MM"
5. AI returns structured JSON (enforced by schema)
6. Fill fields: convert null to "n/a" for text; match selections by value/label
7. Optional: auto-submit or navigate to the next page

## User Actions

1. User uploads resume and clicks "Parse Resume"
2. User navigates to a job application website and clicks "Auto Fill" in the sidebar
3. Done.
