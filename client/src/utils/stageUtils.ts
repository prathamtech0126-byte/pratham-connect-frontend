/**
 * Helper to determine the latest stage from payments
 * Stages progression: INITIAL -> BEFORE_VISA -> AFTER_VISA -> SUBMITTED_VISA
 *
 * Options for SUBMITTED_VISA:
 * 1. From payment stage: If any payment has stage = "SUBMITTED_VISA"
 * 2. From client status: If client has a separate visaSubmitted field/status
 * 3. From client stage: If client.stage = "SUBMITTED_VISA" or "Visa Submitted"
 */
export const getLatestStageFromPayments = (
  payments: any[] | undefined,
  clientStage?: string,
  visaSubmitted?: boolean | null
): string | null => {
  // Option 3: Check if visa is submitted via separate field (highest priority)
  if (visaSubmitted === true) {
    return 'Submitted Visa';
  }

  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    // If no payments, check client stage for SUBMITTED_VISA
    if (clientStage) {
      const normalizedClientStage = normalizeStageName(clientStage);
      if (normalizedClientStage === 'Submitted Visa') {
        return 'Submitted Visa';
      }
      return normalizedClientStage;
    }
    // No payments and no client stage = return null to indicate N/A
    return null;
  }

  // Normalize stage values and find the highest stage
  const stagePriority: Record<string, number> = {
    'INITIAL': 1,
    'BEFORE_VISA': 2,
    'AFTER_VISA': 3,
    'SUBMITTED_VISA': 4,
  };

  let highestPriority = 0;
  let latestStage: string | null = null;

  // Check all payments for stages
  payments.forEach((payment: any) => {
    const stage = payment.stage;
    if (stage) {
      const priority = stagePriority[stage] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        latestStage = stage;
      }
    }
  });

  // Also check client stage if it's higher priority
  if (clientStage) {
    const clientPriority = stagePriority[clientStage] || 0;
    if (clientPriority > highestPriority) {
      highestPriority = clientPriority;
      latestStage = clientStage;
    }
  }

  // If no stage found in payments or client stage, return null (N/A)
  if (!latestStage) {
    return null;
  }

  // Normalize the stage name for display
  return normalizeStageName(latestStage);
};

/**
 * Normalize stage name for consistent display
 */
export const normalizeStageName = (stage: string): string => {
  if (!stage) return "Initial";

  const upperStage = stage.toUpperCase();

  if (upperStage === 'INITIAL') {
    return 'Initial';
  } else if (upperStage === 'BEFORE_VISA' || stage === 'Before Visa') {
    return 'Before Visa';
  } else if (upperStage === 'AFTER_VISA' || stage === 'After Visa' || stage === 'After Visa Payment') {
    return 'After Visa';
  } else if (upperStage === 'SUBMITTED_VISA' || stage === 'Submitted Visa' || stage === 'Visa Submitted') {
    return 'Submitted Visa';
  }

  return stage;
};
