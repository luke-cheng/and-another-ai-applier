import React, { useState, useEffect } from "react";
import { FormField, FormFillingResult } from "../../serviceWorker/ai_services/formFillerService/type";
import { ResumeData } from "../../schemas/resumeSchema";
import { useAIAvailability } from "../hooks/useAIAvailability";
import { useQuotaUsage } from "../hooks/useQuotaUsage";
import { useToast } from "./Toast";

interface AIFillerProps {
  resumeData: ResumeData | null;
}

const AIFiller: React.FC<AIFillerProps> = ({ resumeData }) => {
  const { isAIAvailable } = useAIAvailability();
  const { updateQuotaUsage, quotaPercentage, isNearLimit } = useQuotaUsage();
  const { showToast } = useToast();
  const [jobDescription, setJobDescription] = useState<string>("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isFillingForm, setIsFillingForm] = useState(false);
  const [fillingResult, setFillingResult] = useState<FormFillingResult | null>(null);
  const [uploadResume, setUploadResume] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quotaWarningShown, setQuotaWarningShown] = useState(false);

  // Show quota warning at 80%
  useEffect(() => {
    if (isNearLimit && !quotaWarningShown) {
      showToast(`Quota usage is at ${quotaPercentage.toFixed(1)}% - Consider conserving AI tokens`, 'warning', 5000);
      setQuotaWarningShown(true);
    }
    // Reset warning flag if quota drops below 80%
    if (!isNearLimit && quotaWarningShown) {
      setQuotaWarningShown(false);
    }
  }, [isNearLimit, quotaPercentage, quotaWarningShown, showToast]);

  const detectFormFields = async () => {
    setIsFillingForm(true);
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "detectFormFields",
        });

        if (response && response.fields) {
          setFormFields(response.fields);
        }
      }
    } catch (error) {
      console.error("Failed to detect form fields:", error);
      showToast("Failed to detect form fields. Make sure you're on a page with a form.", 'error');
    } finally {
      setIsFillingForm(false);
    }
  };

  const fillFormFields = async () => {
    if (!resumeData) {
      showToast("Please parse your resume first!", 'warning');
      return;
    }

    setIsFillingForm(true);
    setFillingResult(null);
    updateQuotaUsage();

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (!tab.id) {
        throw new Error("No active tab found");
      }

      const config = {
        autoNavigate: false,
        skipOptional: false,
        uploadResume: uploadResume,
      };

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "fillForm",
        resumeData,
        jobDescription: jobDescription || undefined,
        config,
      }) as FormFillingResult;

      if (response) {
        setFillingResult(response);
        
        if (response.success) {
          showToast(
            `Form filled successfully! Filled: ${response.filledFields}, Errors: ${response.errorFields}`,
            'success',
            5000
          );
        } else {
          showToast(
            `Form filling completed with errors. Filled: ${response.filledFields}, Errors: ${response.errorFields}`,
            'warning',
            5000
          );
        }
      }
    } catch (error) {
      console.error("Failed to fill form:", error);
      showToast(
        `Failed to fill form: ${error instanceof Error ? error.message : "Unknown error"}`,
        'error'
      );
    } finally {
      setIsFillingForm(false);
      updateQuotaUsage();
    }
  };

  // Combined autofill function that detects fields then fills
  const autoFillComplete = async () => {
    if (!resumeData) {
      showToast("Please parse your resume first!", 'warning');
      return;
    }

    setIsFillingForm(true);
    setFillingResult(null);

    try {
      // First detect fields
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (!tab.id) {
        throw new Error("No active tab found");
      }

      const detectResponse = await chrome.tabs.sendMessage(tab.id, {
        action: "detectFormFields",
      });

      if (detectResponse && detectResponse.fields) {
        setFormFields(detectResponse.fields);
        
        if (detectResponse.fields.length === 0) {
          showToast("No form fields detected. Make sure you're on a job application page.", 'warning');
          setIsFillingForm(false);
          return;
        }
      }

      // Then fill the form
      await updateQuotaUsage();
      
      const config = {
        autoNavigate: false,
        skipOptional: false,
        uploadResume: uploadResume,
      };

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "fillForm",
        resumeData,
        jobDescription: jobDescription || undefined,
        config,
      }) as FormFillingResult;

      if (response) {
        setFillingResult(response);
        
        if (response.success) {
          showToast(
            `Form filled successfully! Filled: ${response.filledFields}, Errors: ${response.errorFields}`,
            'success',
            5000
          );
        } else {
          showToast(
            `Form filling completed with errors. Filled: ${response.filledFields}, Errors: ${response.errorFields}`,
            'warning',
            5000
          );
        }
      }

      await updateQuotaUsage();
    } catch (error) {
      console.error("Failed to autofill form:", error);
      showToast(
        `Failed to autofill form: ${error instanceof Error ? error.message : "Unknown error"}`,
        'error'
      );
    } finally {
      setIsFillingForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Form Filler</h3>

      {/* Job Description Input */}
      <div className="mb-4">
        <label className="block mb-2">
          <strong className="text-gray-700">Job Description (Optional):</strong>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here to help AI match your resume to the job requirements"
            rows={4}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </label>
      </div>

      {/* Main Action Button */}
      <div className="mb-4">
        <button
          onClick={autoFillComplete}
          disabled={
            isFillingForm ||
            !resumeData ||
            !isAIAvailable
          }
          className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold shadow-md"
        >
          {isFillingForm
            ? "⏳ Processing..."
            : !isAIAvailable
            ? "AI Not Available"
            : "🚀 Autofill"}
        </button>

        {isFillingForm && (
          <button
            onClick={async () => {
              await chrome.runtime.sendMessage({ action: "abortAIOperation" });
              setIsFillingForm(false);
            }}
            className="mt-2 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Stop Operation
          </button>
        )}
      </div>

      {/* Quota Indicator */}
      {quotaPercentage > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Prompt Quota:</span>
            <span className={`text-sm font-bold ${
              quotaPercentage >= 80 ? 'text-red-600' : 
              quotaPercentage >= 60 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {quotaPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                quotaPercentage >= 80 ? 'bg-red-600' : 
                quotaPercentage >= 60 ? 'bg-yellow-600' : 
                'bg-green-600'
              }`}
              style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Advanced Section (Collapsible) */}
      <div className="mb-4 border-t pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span className="font-semibold">Advanced Options</span>
          <span>{showAdvanced ? '▼' : '▶'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={detectFormFields} 
                disabled={isFillingForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                Detect Form Fields
              </button>

              <button
                onClick={fillFormFields}
                disabled={
                  isFillingForm ||
                  !resumeData ||
                  formFields.length === 0 ||
                  !isAIAvailable
                }
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {isFillingForm
                  ? "Filling..."
                  : !isAIAvailable
                  ? "AI Not Available"
                  : "Auto Fill Form"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resume Upload Option */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={uploadResume}
            onChange={(e) => setUploadResume(e.target.checked)}
            className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <strong className="text-gray-700">Auto-upload Resume</strong>
          <span className="ml-1 text-gray-500">(Convert JSON resume to text file and upload)</span>
        </label>
      </div>

      {/* Filling Progress */}
      {isFillingForm && (
        <div className="mb-4">
          <div className="text-gray-700 mb-2">
            Filling form fields...
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Filling Results */}
      {fillingResult && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <strong className="text-gray-700 block mb-2">Filling Results:</strong>
          <div className="text-sm text-gray-600 mb-2">
            ✓ Filled: {fillingResult.filledFields} | ✗ Errors: {fillingResult.errorFields} | ⊘
            Skipped: {fillingResult.skippedFields}
          </div>
          {fillingResult.errors.length > 0 && (
            <div className="text-red-600 text-xs">
              <strong>Errors:</strong>
              {fillingResult.errors.map((error, idx) => (
                <div key={idx} className="mt-1">
                  {error.fieldId}: {error.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Fields Status */}
      {formFields.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <strong className="text-gray-700">Detected Fields:</strong> {formFields.length}
          <div className="text-sm text-gray-600 mt-1">
            {formFields.map((field, index) => (
              <span key={index}>
                {field.label} ({field.type})
                {index < formFields.length - 1 ? ", " : ""}
                <br />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFiller;
