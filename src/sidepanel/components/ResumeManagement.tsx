import React, { useState, useEffect } from "react";
import { ResumeData } from "../../schemas/resumeSchema";
import { useAIAvailability } from "../hooks/useAIAvailability";
import { useQuotaUsage } from "../hooks/useQuotaUsage";
import { convertResumeToDocx } from "../../content_script/resumeConverters";
import { useToast } from "./Toast";

interface ResumeManagementProps {
  onResumeDataChange: (data: ResumeData | null) => void;
}

// Animated dots component for the parsing state
const AnimatedDots: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4); // Cycles 0-3 dots
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span aria-live="polite">
      {"." .repeat(dotCount)}
    </span>
  );
};

const ResumeManagement: React.FC<ResumeManagementProps> = ({
  onResumeDataChange,
}) => {
  const { isAIAvailable } = useAIAvailability();
  const { updateQuotaUsage } = useQuotaUsage();
  const { showToast } = useToast();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadResumeData();
  }, []);

  const loadResumeData = async () => {
    try {
      const result = await chrome.storage.sync.get([
        "resumeData",
        "resumeText",
      ]);
      if (result.resumeData) {
        setResumeData(result.resumeData);
        onResumeDataChange(result.resumeData);
      }
      if (result.resumeText) {
        setResumeText(result.resumeText);
      }
    } catch (error) {
      console.error("Failed to load resume data:", error);
    }
  };

  const saveResumeData = async (data: ResumeData, text?: string) => {
    try {
      // Automatically set lastUpdated timestamp
      const dataWithTimestamp = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };
      
      const storageData: { resumeData: ResumeData; resumeText?: string } = {
        resumeData: dataWithTimestamp,
      };
      if (text !== undefined) {
        storageData.resumeText = text;
      }
      await chrome.storage.sync.set(storageData);
      setResumeData(dataWithTimestamp);
      onResumeDataChange(dataWithTimestamp);
      if (text !== undefined) {
        setResumeText(text);
      }
    } catch (error) {
      console.error("Failed to save resume data:", error);
    }
  };

  const parseResumeWithAI = async () => {
    if (!resumeText.trim()) {
      showToast("Please enter your resume text first", 'warning');
      return;
    }

    setIsParsingResume(true);
    setDownloadProgress(0);

    // Listen for progress updates from background
    const progressListener = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.resumeParseProgress) {
        const progress = changes.resumeParseProgress.newValue as number;
        setDownloadProgress(progress);
        updateQuotaUsage();
      }
    };
    chrome.storage.onChanged.addListener(progressListener);

    try {
      // Route through background service worker
      const response = await chrome.runtime.sendMessage({
        action: "parseResume",
        resumeText,
      });

      if (response?.success && response.parsedData) {
        const parsedData = response.parsedData as ResumeData;

        // Save both the parsed data and update the text field with structured JSON
        const structuredJson = JSON.stringify(parsedData, null, 2);
        await saveResumeData(parsedData, structuredJson);
        setResumeText(structuredJson);

        showToast("Resume parsed successfully!", 'success');
      } else {
        throw new Error(response?.error || "Failed to parse resume");
      }
    } catch (error) {
      console.error("Failed to parse resume:", error);

      // Check if the error is due to abort
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Resume parsing was aborted by user");
        // Don't show error toast for user-initiated abort
      } else {
        showToast(
          `Failed to parse resume: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          'error'
        );
      }
    } finally {
      chrome.storage.onChanged.removeListener(progressListener);
      setIsParsingResume(false);
      setDownloadProgress(0);
      updateQuotaUsage();
    }
  };

  const handleResumeTextChange = (value: string) => {
    setResumeText(value);
    // Try to parse as JSON and update resumeData if valid
    try {
      const parsed = JSON.parse(value);
      setResumeData(parsed);
      onResumeDataChange(parsed);
      saveResumeData(parsed, value);
    } catch (error) {
      // Not valid JSON, that's okay - user might be editing raw text
    }
  };

  const downloadResumeAsDocx = async () => {
    if (!resumeData) {
      showToast("No resume data available to download", 'warning');
      return;
    }

    try {
      const blob = await convertResumeToDocx(resumeData);
      const url = URL.createObjectURL(blob);
      
      // Direct download
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up blob URL
      URL.revokeObjectURL(url);
      
      showToast("Resume downloaded successfully!", 'success');
    } catch (error) {
      console.error("Failed to download resume:", error);
      showToast("Failed to download resume as DOCX", 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Resume Management</h3>

      <div className="mb-4">
        <label className="block mb-2">
          <strong className="text-gray-700">Resume Text:</strong>
          <textarea
            value={resumeText}
            onChange={(e) => handleResumeTextChange(e.target.value)}
            placeholder="Paste your raw resume text here (any format - PDF text, Word doc text, plain text, etc.) or edit the structured JSON below"
            disabled={isParsingResume}
            rows={8}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={parseResumeWithAI}
          disabled={isParsingResume || !resumeText.trim() || !isAIAvailable}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-1"
        >
          {isParsingResume ? 
            <>
              Parsing Resume<AnimatedDots />
            </>
            : "Parse Resume with AI"}
        </button>

        {isParsingResume && (
          <button
            onClick={async () => {
              await chrome.runtime.sendMessage({ action: "abortAIOperation" });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Stop Parsing
          </button>
        )}
      </div>

      {/* Resume Status */}
      {resumeData && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-md">
            <strong className="text-gray-700">Resume Status:</strong>
            <br />
            <span className="text-green-700">✓ Ready for use</span>
            <br />
            <strong className="text-gray-700">Last Updated:</strong>{" "}
            <span className="text-gray-600">
              {resumeData.lastUpdated
                ? new Date(resumeData.lastUpdated).toLocaleString()
                : "Never"}
            </span>
          </div>

          {/* Download Resume Section */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md">
            <strong className="text-gray-700">Download Resume:</strong>
            <br />
            <button
              onClick={downloadResumeAsDocx}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Download as DOCX
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Downloads resume as a DOCX file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeManagement;
