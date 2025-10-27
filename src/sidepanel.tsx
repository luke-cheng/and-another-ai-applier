import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { resumeParserService, ResumeData } from "./services/resumeParserService";
import { formFillerService, FormField, AIResponse } from "./services/formFillerService";
import { baseAIService, AIAvailability } from "./services/baseAIService";

// Types are now imported from specialized services

const SidePanel = () => {
  // State management
  const [currentURL, setCurrentURL] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [isFillingForm, setIsFillingForm] = useState(false);// form filling
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [aiAvailability, setAiAvailability] = useState<AIAvailability>({ status: 'checking' });
  const [quotaUsage, setQuotaUsage] = useState<{ inputUsage: number; inputQuota: number } | null>(null);
  
  // Form filling modes
  const [fullyAutoMode, setFullyAutoMode] = useState(false);
  
  // Debug panel visibility
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url || "");
    });
    
    // Load resume data from storage
    loadResumeData();
    
    // Check AI availability
    checkAIAvailability();
  }, []);

  const checkAIAvailability = async () => {
    try {
      const availability = await baseAIService.checkAvailability();
      setAiAvailability(availability);
    } catch (error) {
      console.error('Failed to check AI availability:', error);
      setAiAvailability({ status: 'unavailable', error: 'Failed to check availability' });
    }
  };

  const updateQuotaUsage = () => {
    const usage = baseAIService.getSessionUsage();
    setQuotaUsage(usage);
  };

  const loadResumeData = async () => {
    try {
      const result = await chrome.storage.sync.get(['resumeData', 'resumeText']);
      if (result.resumeData) {
        setResumeData(result.resumeData);
      }
      if (result.resumeText) {
        setResumeText(result.resumeText);
      }
    } catch (error) {
      console.error('Failed to load resume data:', error);
    }
  };

  const saveResumeData = async (data: ResumeData, text?: string) => {
    try {
      const storageData: { resumeData: ResumeData; resumeText?: string } = { resumeData: data };
      if (text !== undefined) {
        storageData.resumeText = text;
      }
      await chrome.storage.sync.set(storageData);
      setResumeData(data);
      if (text !== undefined) {
        setResumeText(text);
      }
    } catch (error) {
      console.error('Failed to save resume data:', error);
    }
  };

  const detectFormFields = async () => {
    setIsFillingForm(true);
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'detectFormFields'
        });
        
        if (response && response.fields) {
          setFormFields(response.fields);
        }
      }
    } catch (error) {
      console.error('Failed to detect form fields:', error);
    } finally {
      setIsFillingForm(false);
    }
  };

  const fillFormFields = async () => {
    if (!resumeData || formFields.length === 0) return;
    
    setIsFillingForm(true);
    
    try {
      // Initialize form filler with resume data and job description
      await formFillerService.initialize(
        resumeData,
        jobDescription.trim() || undefined, // Pass job description if not empty
        (progress) => setDownloadProgress(progress),
        (error) => console.error('Form Filler Error:', error)
      );

      // Update quota usage after initialization
      updateQuotaUsage();

      // Process fields using optimized approach
      const responses = await formFillerService.fillFieldsWithDOM(
        formFields,
        (progress) => {
          setDownloadProgress(progress);
          updateQuotaUsage(); // Update quota during processing
        }
      );
      
      setAiResponses(responses);
      
      // If fully auto mode is enabled, navigate to next page
      if (fullyAutoMode) {
        await formFillerService.navigateToNextPage();
      }
      
    } catch (error) {
      console.error('Failed to fill form fields:', error);
      
      // Check if the error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Form filling was aborted by user');
        // Don't show error alert for user-initiated abort
      } else {
        // Show user-friendly error message
        alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    } finally {
      // Clean up form filler
      await formFillerService.cleanup();
      setIsFillingForm(false);
      setDownloadProgress(0);
      setQuotaUsage(null);
    }
  };

  const parseResumeWithAI = async () => {
    if (!resumeText.trim()) {
      alert('Please enter your resume text first');
      return;
    }

    setIsParsingResume(true);
    setDownloadProgress(0);

    try {
      const parsedData = await resumeParserService.parseResume(
        resumeText,
        (progress) => {
          setDownloadProgress(progress);
          updateQuotaUsage(); // Update quota during parsing
        },
        (error) => console.error('Resume Parser Error:', error)
      );
      
      // Save both the parsed data and update the text field with structured JSON
      const structuredJson = JSON.stringify(parsedData, null, 2);
      await saveResumeData(parsedData, structuredJson);
      setResumeText(structuredJson);
      
      alert('Resume parsed successfully!');
    } catch (error) {
      console.error('Failed to parse resume:', error);
      
      // Check if the error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Resume parsing was aborted by user');
        // Don't show error alert for user-initiated abort
      } else {
        alert(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsParsingResume(false);
      setDownloadProgress(0);
      setQuotaUsage(null);
    }
  };

  const handleResumeTextChange = (value: string) => {
    setResumeText(value);
    // Try to parse as JSON and update resumeData if valid
    try {
      const parsed = JSON.parse(value);
      setResumeData(parsed);
      saveResumeData(parsed, value);
    } catch (error) {
      // Not valid JSON, that's okay - user might be editing raw text
    }
  };

  return (
    <div>
      <h2>AI Form Filler</h2>
      
      {/* Current Page Info */}
      <div>
        <strong>Current Page:</strong><br />
        <small>{currentURL}</small>
        <br /><br />
        <strong>AI Status:</strong> 
        <span>
          {aiAvailability.status === 'available' ? '✓ Available' :
           aiAvailability.status === 'downloading' ? '⏳ Downloading' :
           aiAvailability.status === 'unavailable' ? '✗ Unavailable' : '⏳ Checking...'}
        </span>
        <button onClick={checkAIAvailability}>
          Refresh
        </button>
      </div>

      {/* Auto-Fill Control Panel */}
      <div>
        <h3>Auto-Fill Control Panel</h3>
        

        {/* Fully Auto Mode Toggle */}
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={fullyAutoMode}
              onChange={(e) => setFullyAutoMode(e.target.checked)}
            />
            <strong>Fully Auto Mode</strong> (Navigate to next page after completion)
          </label>
        </div>

        {/* Action Buttons */}
        <div>
          <button 
            onClick={detectFormFields}
            disabled={isFillingForm}
          >
            Detect Form Fields
          </button>
          
          <button 
            onClick={fillFormFields}
            disabled={isFillingForm || !resumeData || formFields.length === 0 || aiAvailability.status !== 'available'}
          >
            {isFillingForm ? 'Filling Form...' : 
             aiAvailability.status !== 'available' ? 'AI Not Available' : 'Auto Fill Form'}
          </button>

          {(isFillingForm || isParsingResume) && (
            <button 
              onClick={() => {
                if (isFillingForm) {
                  formFillerService.abortOperation();
                } else if (isParsingResume) {
                  resumeParserService.abortOperation();
                }
              }}
            >
              Stop Operation
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {downloadProgress > 0 && (
          <div>
            <div>AI Model Download Progress: {downloadProgress.toFixed(0)}%</div>
          </div>
        )}

        {/* Quota Usage */}
        {quotaUsage && (
          <div>
            <div>Input Quota Usage: {quotaUsage.inputUsage}/{quotaUsage.inputQuota} tokens</div>
            <div>Usage Percentage: {((quotaUsage.inputUsage / quotaUsage.inputQuota) * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* Resume Management Section */}
      <div>
        <h3>Resume Management</h3>
        
        <div>
          <label>
            <strong>Resume Text:</strong>
            <textarea
              value={resumeText}
              onChange={(e) => handleResumeTextChange(e.target.value)}
              placeholder="Paste your raw resume text here (any format - PDF text, Word doc text, plain text, etc.) or edit the structured JSON below"
              disabled={isParsingResume}
            />
          </label>
        </div>

        <div>
          <label>
            <strong>Job Description (Optional):</strong>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to help AI match your resume to the job requirements"
              rows={4}
            />
          </label>
        </div>

        <div>
          <button 
            onClick={parseResumeWithAI}
            disabled={isParsingResume || !resumeText.trim() || aiAvailability.status !== 'available'}
          >
            {isParsingResume ? 'Parsing Resume...' : 'Parse Resume with AI'}
          </button>

          {isParsingResume && (
            <button 
              onClick={() => {
                if (isFillingForm) {
                  formFillerService.abortOperation();
                } else if (isParsingResume) {
                  resumeParserService.abortOperation();
                }
              }}
            >
              Stop Parsing
            </button>
          )}
        </div>

        {/* Progress Bar for Resume Parsing */}
        {downloadProgress > 0 && isParsingResume && (
          <div>
            <div>AI Parsing Progress: {downloadProgress.toFixed(0)}%</div>
          </div>
        )}

        {/* Resume Status */}
        {resumeData && (
          <div>
            <strong>Resume Status:</strong>
            <br />
            <span>✓ Ready for use</span>
            <br />
            <strong>Last Updated:</strong> {resumeData.lastUpdated ? new Date(resumeData.lastUpdated).toLocaleString() : 'Never'}
            <br />
            <strong>Name:</strong> {resumeData.personalInfo?.firstName} {resumeData.personalInfo?.lastName}
            <br />
            <strong>Experience Entries:</strong> {resumeData.experience?.length || 0}
            <br />
            <strong>Education Entries:</strong> {resumeData.education?.length || 0}
            <br />
            <strong>Skills:</strong> {resumeData.skills?.length || 0}
          </div>
        )}
      </div>

      {/* Debug Panel Toggle */}
      <div>
        <button onClick={() => setShowDebugPanel(!showDebugPanel)}>
          {showDebugPanel ? 'Hide' : 'Show'} Debug Panel
        </button>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div>
          <h3>Debug Information</h3>
          
          <div>
            <strong>Resume Data (JSON):</strong>
            <pre>
              {JSON.stringify(resumeData, null, 2)}
            </pre>
          </div>

          <div>
            <strong>Detected Form Fields:</strong>
            <pre>
              {JSON.stringify(formFields, null, 2)}
            </pre>
          </div>

          <div>
            <strong>AI Input/Output:</strong>
            <pre>
              {JSON.stringify(aiResponses, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);
