import { useState, useEffect } from 'react';
import { AIAvailability } from '../../serviceWorker/ai_services/baseAIService';

export const useAIAvailability = () => {
  const [aiAvailability, setAiAvailability] = useState<AIAvailability>({
    status: "checking",
  });

  const checkAIAvailability = async () => {
    try {
      // Route through background service worker
      const response = await chrome.runtime.sendMessage({
        action: "checkAIAvailability"
      });

      if (response?.success && response.availability) {
        setAiAvailability(response.availability);
      } else {
        setAiAvailability({
          status: "unavailable",
          error: response?.error || "Failed to check availability",
        });
      }
    } catch (error) {
      console.error("Failed to check AI availability:", error);
      setAiAvailability({
        status: "unavailable",
        error: "Failed to check availability",
      });
    }
  };

  const isAIAvailable = aiAvailability.status === "available" || aiAvailability.status === "downloadable";

  useEffect(() => {
    checkAIAvailability();
  }, []);

  return {
    aiAvailability,
    isAIAvailable,
    checkAIAvailability,
  };
};
