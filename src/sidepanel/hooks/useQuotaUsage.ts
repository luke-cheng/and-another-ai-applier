import { useState } from 'react';

export const useQuotaUsage = () => {
  const [quotaUsage, setQuotaUsage] = useState<{
    inputUsage: number;
    inputQuota: number;
  } | null>(null);

  const updateQuotaUsage = async () => {
    try {
      // Route through background service worker
      const response = await chrome.runtime.sendMessage({
        action: "getQuotaUsage"
      });

      if (response?.success) {
        setQuotaUsage(response.quotaUsage);
      } else {
        setQuotaUsage(null);
      }
    } catch (error) {
      console.error("Failed to get quota usage:", error);
      setQuotaUsage(null);
    }
  };

  // Calculate quota percentage
  const getQuotaPercentage = (): number => {
    if (!quotaUsage || quotaUsage.inputQuota === 0) return 0;
    return (quotaUsage.inputUsage / quotaUsage.inputQuota) * 100;
  };

  // Check if quota is near limit (80%)
  const isNearLimit = (): boolean => {
    return getQuotaPercentage() >= 80;
  };

  return {
    quotaUsage,
    updateQuotaUsage,
    quotaPercentage: getQuotaPercentage(),
    isNearLimit: isNearLimit(),
  };
};
