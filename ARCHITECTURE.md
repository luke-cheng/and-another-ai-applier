# Project Structure Decisions

> This is more or less an agentic ai. However due to the limited capablity of local model, we'll need to provide the agent

## Architecture Overview

Simple workflow: User uploads resume → User clicks "Auto Fill" → Form detection → AI processing → Form filling

## Component Design

## UI (sidepanel)

### Main function

- Auto-Fill Control Panel

  - toggle: two form filling mode

    1. fetch all form label and then run them parrelly though the ai service and fill the form with ai's reponse.
    2. mimicing accessbility where we use tab -> fetch label -> push to AI to get response -> use the AI input to fill the form -> tab ->...

  - toggle: Fully auto mode (which will also navigate to the next page after all form is filled)

- Resume Management Section
  - CRUD for local storage in a text field
- Debug information

### Debug Pannel

Display simple json to frontend. e.g json formated resume, languageModel's input and output.

## Serivce

### AI Service

- Uses Chrome's built-in Gemini Nano API (globally accessible via `LanguageModel.create()` or `Writer.create()`)
  - `LanguageModel`: For simple form fields and resume parsing
  - `Writer`: For questions like "Why do you want to work with xxx?"
- Keeps track of the model downloading progress, which will show to a progress bar in the UI

```js
const session = await LanguageModel.create({
  monitor(m) {
    m.addEventListener("downloadprogress", (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  },
});
```

- Prevents input from exceeding the model's maximum tokens.

```js
console.log(`${session.inputUsage}/${session.inputQuota}`);
```

### Form Detector

- Two detection modes with a switch in the side panel:
  - Basic form detection (simple input fields)
  - Accessibility-based detection (ARIA labels, semantic HTML)
- Users can test both modes to determine which works better

> Debug Panel: display all fetched fields

### Resume Storage

- Simple JSON structure for resume data
- Storage with `chrome.sync`
- Functions: saveResume(), getResume(), updateResume()

> Debug Panel: show simple JSON.stringify resume

### Form Filler

- Fills form fields with AI responses
- Functions: fillField(), fillAllFields(), validateFill()

> Debug Panel: show AI's input/output for each field.
