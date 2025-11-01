// Lightweight Base AI Service
// Provides core session management and common AI operations

/// <reference path="../../types/languageModel.ts" />

export interface AIAvailability {
  status: Availability | 'checking';
  error?: string;
}

export interface AISession {
  session: LanguageModel;
  params: LanguageModelParams;
}

export interface AIProgressCallback {
  (progress: number): void;
}

export interface AIErrorCallback {
  (error: string): void;
}

export class BaseAIService {
  private currentSession: LanguageModel | null = null;
  private isInitialized = false;
  private abortController: AbortController | null = null;

  /**
   * Check if the AI model is available
   */
  async checkAvailability(): Promise<AIAvailability> {
    try {
      // Validate context - LanguageModel should be available in background/service worker
      if (typeof LanguageModel === 'undefined') {
        return {
          status: 'unavailable',
          error: 'LanguageModel API is not available in this context. Ensure code runs in background service worker.'
        };
      }

      const availability = await LanguageModel.availability();
      return { status: availability };
    } catch (error) {
      console.error('Failed to check AI availability:', error);
      return {
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get model parameters
   */
  async getModelParams(): Promise<LanguageModelParams | null> {
    try {
      // Validate context
      if (typeof LanguageModel === 'undefined') {
        throw new Error('LanguageModel API is not available in this context');
      }

      return await LanguageModel.params();
    } catch (error) {
      console.error('Failed to get model parameters:', error);
      throw new Error('Failed to get model parameters');
    }
  }

  /**
   * Create a new AI session with system prompt
   */
  async createSession(
    systemPrompt: string,
    onProgress?: AIProgressCallback,
    onError?: AIErrorCallback
  ): Promise<AISession> {
    try {
      // Validate context
      if (typeof LanguageModel === 'undefined') {
        throw new Error('LanguageModel API is not available in this context. Ensure code runs in background service worker.');
      }

      // Check availability first
      const availability = await this.checkAvailability();
      if (availability.status === 'unavailable') {
        throw new Error('AI model is not available on this device');
      }

      // Get model parameters
      const params = await this.getModelParams();
      if (!params) {
        throw new Error('Failed to get model parameters');
      }

      // Create abort controller for this session
      this.abortController = new AbortController();

      // Create session with system prompt and abort signal
      const session = await LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        signal: this.abortController.signal,
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [{
          role: "system",
          content: systemPrompt
        }],
        monitor: (m: LanguageModelMonitor) => {
          m.addEventListener("downloadprogress", (e: ProgressEvent) => {
            const progress = e.loaded * 100;
            if (onProgress) {
              onProgress(progress);
            }
          });
        },
      });

      this.currentSession = session;
      this.isInitialized = true;

      return { session, params };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (onError) {
        onError(errorMessage);
      }
      throw new Error(`Failed to create AI session: ${errorMessage}`);
    }
  }

  /**
   * Get the current session (for internal use by services)
   */
  getCurrentSession(): LanguageModel | null {
    return this.currentSession;
  }

  /**
   * Clone the current session (for parallel processing if needed)
   */
  async cloneSession(): Promise<LanguageModel> {
    if (!this.currentSession) {
      throw new Error('No active AI session to clone');
    }

    return await this.currentSession.clone();
  }

  /**
   * Get session usage information
   */
  getSessionUsage(): { inputUsage: number; inputQuota: number } | null {
    if (!this.currentSession) {
      return null;
    }

    try {
      return {
        inputUsage: this.currentSession.inputUsage,
        inputQuota: this.currentSession.inputQuota
      };
    } catch (error) {
      console.warn('Failed to get session usage:', error);
      return null;
    }
  }

  /**
   * Abort the current AI operation
   */
  abortOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
      console.log('AI operation aborted by user');
    }
  }

  /**
   * Check if an operation is currently running
   */
  isOperationRunning(): boolean {
    return this.isInitialized && this.currentSession !== null && this.abortController !== null;
  }

  /**
   * Destroy the current session
   */
  async destroySession(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.currentSession.destroy();
        this.currentSession = null;
        this.isInitialized = false;
        this.abortController = null;
      } catch (error) {
        console.warn('Failed to destroy session:', error);
      }
    }
  }

  /**
   * Check if a session is active
   */
  isSessionActive(): boolean {
    return this.isInitialized && this.currentSession !== null;
  }
}

// Export singleton instance
export const baseAIService = new BaseAIService();
export default baseAIService;
