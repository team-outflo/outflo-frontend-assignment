const MS_IN_DAY = 24 * 60 * 60 * 1000;

export interface TrialState {
  hasTrial: boolean;
  hasTrialExpired: boolean;
  trialDaysRemaining: number;
}

export const calculateTrialState = (
  status?: string,
  trialEndDate?: string | number | Date
): TrialState => {
  const hasTrial = status === "trialing";

  if (!hasTrial || !trialEndDate) {
    return {
      hasTrial,
      hasTrialExpired: !hasTrial,
      trialDaysRemaining: 0
    };
  }

  const trialEndTimestamp = new Date(trialEndDate).getTime();

  if (Number.isNaN(trialEndTimestamp)) {
    return {
      hasTrial,
      hasTrialExpired: true,
      trialDaysRemaining: 0
    };
  }

  const msRemaining = trialEndTimestamp - Date.now();
  const hasTrialExpired = msRemaining <= 0;
  const trialDaysRemaining = hasTrialExpired
    ? 0
    : Math.max(0, Math.ceil(msRemaining / MS_IN_DAY));

  return {
    hasTrial,
    hasTrialExpired,
    trialDaysRemaining
  };
};

