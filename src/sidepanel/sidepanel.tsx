import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AIStatus from "./components/AIStatus";
import AIFiller from "./components/AIFiller";
import ResumeManagement from "./components/ResumeManagement";
import { ResumeData } from "../schemas/resumeSchema";
import { useAIAvailability } from "./hooks/useAIAvailability";
import { useQuotaUsage } from "./hooks/useQuotaUsage";
import { ToastProvider } from "./components/Toast";

const SidePanel: React.FC = () => {
  const { aiAvailability, checkAIAvailability } = useAIAvailability();
  const { quotaUsage, updateQuotaUsage } = useQuotaUsage();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  const handleRefresh = () => {
    checkAIAvailability();
    updateQuotaUsage();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            And Another AI Applier
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            AI-powered job application form filler
          </p>
        </header>

        <AIStatus
          aiAvailability={aiAvailability}
          quotaUsage={quotaUsage}
          onRefresh={handleRefresh}
        />

        <ResumeManagement onResumeDataChange={setResumeData} />

        <AIFiller resumeData={resumeData} />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <ToastProvider>
      <SidePanel />
    </ToastProvider>
  </React.StrictMode>
);

