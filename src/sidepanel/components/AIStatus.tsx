import React from "react";
import { AIAvailability } from "../../serviceWorker/ai_services/baseAIService";

interface AIStatusProps {
  aiAvailability: AIAvailability;
  quotaUsage: {
    inputUsage: number;
    inputQuota: number;
  } | null;
  onRefresh: () => void;
}

const AIStatus: React.FC<AIStatusProps> = ({
  aiAvailability,
  quotaUsage,
  onRefresh,
}) => {
  const getStatusColor = () => {
    switch (aiAvailability.status) {
      case "available":
        return "text-green-600";
      case "downloading":
      case "downloadable":
        return "text-yellow-600";
      case "unavailable":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Status</h3>
      
      {/* AI Availability Status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong className="text-gray-700">AI Status:</strong>
          <span className={`ml-2 ${getStatusColor()}`}>
            {aiAvailability.status === "available"
              ? "✓ Available"
              : aiAvailability.status === "downloading"
              ? "⏳ Downloading"
              : aiAvailability.status === "downloadable"
              ? "⏳ Downloadable (Click to download)"
              : aiAvailability.status === "unavailable"
              ? "✗ Unavailable"
              : "⏳ Checking..."}
          </span>
        </div>
        <button 
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Quota Usage */}
      {quotaUsage && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <div className="mb-2">
            <strong className="text-gray-700">Input Quota Usage:</strong> 
            <span className="ml-2">{quotaUsage.inputUsage}/{quotaUsage.inputQuota} tokens</span>
          </div>
          <div>
            <strong className="text-gray-700">Usage Percentage:</strong>{" "}
            <span className="ml-2">{((quotaUsage.inputUsage / quotaUsage.inputQuota) * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {aiAvailability.status === "unavailable" && aiAvailability.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
          <strong>Error:</strong> {aiAvailability.error}
        </div>
      )}
    </div>
  );
};

export default AIStatus;
