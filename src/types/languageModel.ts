/**
 * TypeScript declarations for the Prompt API
 * Based on the Web Machine Learning Community Group specification
 * 
 * @see https://github.com/webmachinelearning/prompt-api
 * @see https://github.com/webmachinelearning/writing-assistance-apis
 */

declare global {
  // Core interfaces
  interface LanguageModel extends EventTarget {
    readonly inputUsage: number;
    readonly inputQuota: number;
    readonly topK: number;
    readonly temperature: number;
    
    onquotaoverflow: ((this: LanguageModel, ev: Event) => any) | null;

    prompt(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<string>;
    promptStreaming(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): ReadableStream<string>;
    append(input: LanguageModelPrompt, options?: LanguageModelAppendOptions): Promise<void>;
    
    measureInputUsage(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;
    clone(options?: LanguageModelCloneOptions): Promise<LanguageModel>;
    destroy(): void;
  }

  // Static methods interface
  interface LanguageModelConstructor {
    create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
    params(): Promise<LanguageModelParams | null>;
  }

  // Supported language codes for Prompt API
  // Valid values: "en" (English), "ja" (Japanese), "es" (Spanish)
  type LanguageCode = "en" | "ja" | "es";

  // Writer API interfaces
  interface Writer {
    readonly sharedContext: string;
    readonly tone: WriterTone;
    readonly format: WriterFormat;
    readonly length: WriterLength;
    readonly expectedInputLanguages: readonly LanguageCode[] | null;
    readonly expectedContextLanguages: readonly LanguageCode[] | null;
    readonly outputLanguage: LanguageCode | null;
    readonly inputQuota: number;

    write(input: string, options?: WriterWriteOptions): Promise<string>;
    writeStreaming(input: string, options?: WriterWriteOptions): ReadableStream<string>;
    measureInputUsage(input: string, options?: WriterWriteOptions): Promise<number>;
    destroy(): void;
  }

  interface WriterConstructor {
    create(options?: WriterCreateOptions): Promise<Writer>;
    availability(options?: WriterCreateCoreOptions): Promise<Availability>;
  }

  interface LanguageModelParams {
    readonly defaultTopK: number;
    readonly maxTopK: number;
    readonly defaultTemperature: number;
    readonly maxTemperature: number;
  }

  // Enums
  type LanguageModelMessageRole = "system" | "user" | "assistant";
  type LanguageModelMessageType = "text" | "image" | "audio";
  type Availability = "unavailable" | "downloadable" | "downloading" | "available";
  type WriterTone = "formal" | "neutral" | "casual";
  type WriterFormat = "plain-text" | "markdown";
  type WriterLength = "short" | "medium" | "long";

  // Type definitions
  type LanguageModelPrompt = LanguageModelMessage[] | string;
  type LanguageModelMessageValue = ImageBitmapSource | AudioBuffer | BufferSource | string;

  // Tool function callback
  type LanguageModelToolFunction = (...args: any[]) => Promise<string>;

  // Dictionaries
  interface LanguageModelTool {
    name: string;
    description: string;
    inputSchema: object;
    execute: LanguageModelToolFunction;
  }

  interface LanguageModelCreateCoreOptions {
    topK?: number;
    temperature?: number;
    expectedInputs?: readonly LanguageModelExpected[];
    expectedOutputs?: readonly LanguageModelExpected[];
    tools?: readonly LanguageModelTool[];
  }

  interface LanguageModelCreateOptions extends LanguageModelCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
    initialPrompts?: readonly LanguageModelMessage[];
  }

  interface LanguageModelPromptOptions {
    responseConstraint?: object;
    omitResponseConstraintInput?: boolean;
    signal?: AbortSignal;
  }

  interface LanguageModelAppendOptions {
    signal?: AbortSignal;
  }

  interface LanguageModelCloneOptions {
    signal?: AbortSignal;
  }

  interface LanguageModelExpected {
    type: LanguageModelMessageType;
    languages: readonly LanguageCode[];
  }

  interface LanguageModelMessage {
    role: LanguageModelMessageRole;
    content: string | LanguageModelMessageContent[];
    prefix?: boolean;
  }

  interface LanguageModelMessageContent {
    type: LanguageModelMessageType;
    value: LanguageModelMessageValue;
  }

  // Writer API dictionaries
  interface WriterCreateCoreOptions {
    tone?: WriterTone;
    format?: WriterFormat;
    length?: WriterLength;
    expectedInputLanguages?: readonly LanguageCode[];
    expectedContextLanguages?: readonly LanguageCode[];
    outputLanguage?: LanguageCode | null;
  }

  interface WriterCreateOptions extends WriterCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
    sharedContext?: string;
  }

  interface WriterWriteOptions {
    context?: string;
    signal?: AbortSignal;
  }

  // Monitor callback for download progress
  type CreateMonitorCallback = (monitor: LanguageModelMonitor) => void;

  interface LanguageModelMonitor {
    addEventListener(type: "downloadprogress", listener: (event: ProgressEvent) => void): void;
    removeEventListener(type: "downloadprogress", listener: (event: ProgressEvent) => void): void;
  }

  // Extend Window interface to include LanguageModel and Writer
  interface Window {
    LanguageModel: LanguageModelConstructor;
    Writer: WriterConstructor;
  }

  // Make LanguageModel and Writer available globally
  const LanguageModel: LanguageModelConstructor;
  const Writer: WriterConstructor;
}

export {};
