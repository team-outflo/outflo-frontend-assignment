import { SequenceStep, StepGroup, FollowUpGroup } from './types';
import { CampaignStepType } from '@/types/campaigns';
import { Variable } from '@/api/variables/variables';
import { TIME_CONVERSION } from './constants';

/**
 * Converts milliseconds to days and hours (minutes removed)
 */
export const convertMillisecondsToTime = (totalMilliseconds: number) => {
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const days = Math.floor(totalSeconds / TIME_CONVERSION.SECONDS_PER_DAY);
  const hours = Math.floor((totalSeconds % TIME_CONVERSION.SECONDS_PER_DAY) / TIME_CONVERSION.SECONDS_PER_HOUR);
  
  return { days, hours, minutes: 0 }; // Always return 0 minutes
};

/**
 * Converts days and hours to milliseconds (minutes removed)
 */
export const convertTimeToMilliseconds = (days: number, hours: number, minutes: number = 0): number => {
  const totalSeconds = days * TIME_CONVERSION.SECONDS_PER_DAY + 
                       hours * TIME_CONVERSION.SECONDS_PER_HOUR + 
                       minutes * TIME_CONVERSION.SECONDS_PER_MINUTE;
  return totalSeconds * 1000;
};

/**
 * Formats time display text (minutes removed)
 */
export const formatTimeDisplay = (days: number, hours: number, minutes: number = 0): string => {
  if (days === 0 && hours === 0) {
    return '0 days';
  }

  let timeText = '';
  if (days > 0) {
    timeText += `${days} ${days === 1 ? 'day' : 'days'} `;
  }
  if (hours > 0) {
    timeText += `${timeText.length > 0 ? 'and ' : ''}${hours} ${hours === 1 ? 'hour' : 'hours'} `;
  }
  
  return timeText.trim();
};

/**
 * Gets the follow-up number text
 */
export const getFollowUpNumberText = (followUpNumber: number): string => {
  if (followUpNumber === 1) {
    return 'after connection is accepted';
  }
  
  const ordinal = followUpNumber === 2 ? 'first' : 
                  followUpNumber === 3 ? 'second' : 
                  followUpNumber === 4 ? 'third' : 
                  `${followUpNumber - 1}th`;
  
  return `after ${ordinal} follow-up`;
};

/**
 * Converts API workflow format to component steps format
 */
export const convertApiWorkflowToSteps = (workflowData: any): SequenceStep[] => {

  console.log('workflowData', workflowData);
  if (!workflowData?.steps?.length) {
    return getDefaultSteps();
  }

  const convertedSteps: SequenceStep[] = [];

  workflowData.steps.forEach((step: any, index: number) => {
    if (step.type === CampaignStepType.CONNECTION_REQUEST) {
      convertedSteps.push({
        id: `api-connection-${index}`,
        type: 'connection',
        status: 'accepted',
        connectionMessage: step.data.message || '',
        premiumConnectionMessage: step.data.premiumMessage || '', // Don't fallback to message for premium
        standardConnectionMessage: step.data.standardMessage || '' // Don't fallback to message for standard
      });
    } else if (step.type === CampaignStepType.FOLLOW_UP) {
      const newGroupId = `api-group-${index}`;
      const { days, hours } = convertMillisecondsToTime(step.data.delay ?? 0);

      // Add delay step
      convertedSteps.push({
        id: `api-delay-${index}`,
        type: 'delay',
        delay: { days, hours, minutes: 0 },
        groupId: newGroupId
      });

      // Add follow-up step
      convertedSteps.push({
        id: `api-followup-${index}`,
        type: 'followup',
        content: step.data.message || '',
        attachments: step.data.attachments || [],
        groupId: newGroupId
      });
    }
  });

  return convertedSteps.length > 0 ? convertedSteps : getDefaultSteps();
};

/**
 * Gets default steps for new sequences
 */
export const getDefaultSteps = (): SequenceStep[] => [
  {
    id: '1',
    type: 'connection',
    status: 'accepted',
    connectionMessage: ''
  },
  {
    id: '2',
    type: 'delay',
    delay: { days: 1, hours: 0, minutes: 0 },
    groupId: 'group-1'
  },
  {
    id: '3',
    type: 'followup',
    content: 'Hi ,\nThanks for connecting!',
    groupId: 'group-1'
  }
];

/**
 * Groups steps for rendering
 */
export const groupStepsForRendering = (steps: SequenceStep[]): StepGroup[] => {
  const groupedSteps: StepGroup[] = [];
  let i = 0;

  while (i < steps.length) {
    const step = steps[i];
    if (step.type === 'connection') {
      groupedSteps.push({ type: 'connection', step, index: i });
      i++;
    } else if (step.type === 'delay' && 
               i + 1 < steps.length && 
               steps[i + 1].type === 'followup' && 
               step.groupId === steps[i + 1].groupId) {
      groupedSteps.push({ 
        type: 'followup-group', 
        delayStep: step, 
        followUpStep: steps[i + 1], 
        index: i + 1 
      });
      i += 2;
    } else {
      i++;
    }
  }

  return groupedSteps;
};

/**
 * Collects follow-up groups from steps
 */
export const collectFollowUpGroups = (steps: SequenceStep[]): Map<string, FollowUpGroup> => {
  const followUpGroups = new Map<string, FollowUpGroup>();

  steps.forEach(step => {
    if (step.groupId && (step.type === 'delay' || step.type === 'followup')) {
      if (!followUpGroups.has(step.groupId)) {
        followUpGroups.set(step.groupId, { 
          delay: null as unknown as SequenceStep, 
          followUp: null as unknown as SequenceStep 
        });
      }

      const group = followUpGroups.get(step.groupId)!;
      if (step.type === 'delay') {
        group.delay = step;
      } else {
        group.followUp = step;
      }
    }
  });

  return followUpGroups;
};


/**
 * Gets character limit color based on current length
 */
export const getCharacterLimitColor = (currentLength: number, limit: number): string => {
  const percentage = (currentLength / limit) * 100;
  if (percentage >= 90) return "text-red-500";
  if (percentage >= 70) return "text-amber-500";
  return "text-gray-500";
};

/**
 * Validates CSV data for missing values in columns
 * @param csvData - The CSV data to validate
 * @param columns - Array of column names to validate
 * @param csvConfig - Optional CSV configuration with applied fixes
 */
export const validateCsvData = (
  csvData: any[], 
  columns: string[], 
  csvConfig?: { columnFixes: Array<{ columnName: string; fixChain: { fixType: string } }> }
): Map<string, { missingRows: number[], totalRows: number, validationStatus: 'valid' | 'invalid' | 'pending' }> => {
  const validationMap = new Map();
  
  columns.forEach(column => {
    // Check if this column has a fix applied in csv_config
    // Check both raw column name and variable ID format (csv_columnName)
    const variableId = `csv_${column}`;
    const hasFixApplied = csvConfig?.columnFixes.some(fix => fix.columnName === variableId);

    if (hasFixApplied) {
      // Skip validation for columns with fixes applied - mark as valid
      validationMap.set(column, {
        missingRows: [],
        totalRows: csvData.length,
        validationStatus: 'valid'
      });
      return;
    }
    
    const missingRows: number[] = [];
    console.log('csvData', csvData);
    csvData.forEach((row, index) => {
      const value = row[column];
      // Check if value is missing, null, undefined, or empty string
      if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
        missingRows.push(index);
      }
    });
    
    const validationStatus = missingRows.length === 0 ? 'valid' : 'invalid';
    
    validationMap.set(column, {
      missingRows,
      totalRows: csvData.length,
      validationStatus
    });
  });
  
  return validationMap;
};

/**
 * Gets validation status styling for variables
 */
export const getValidationStatusStyles = (validationStatus: 'valid' | 'invalid' | 'pending') => {
  switch (validationStatus) {
    case 'valid':
      return {
        icon: '✓',
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700'
      };
    case 'invalid':
      return {
        icon: '⚠',
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700'
      };
    case 'pending':
    default:
      return {
        icon: '⏳',
        iconColor: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-600'
      };
  }
};

/**
 * Generates a unique group ID
 */
export const generateGroupId = (): string => `group-${Date.now()}`;

/**
 * Generates a unique step ID
 */
export const generateStepId = (type: string): string => `${type}-${Date.now()}`;

/**
 * Converts UI format steps to API format for store
 */
export const convertStepsToApiFormat = (steps: SequenceStep[]): any[] => {
  const apiSteps: any[] = [];

  // Find connection request step
  const connectionStep = steps.find(step => step.type === 'connection');
  if (connectionStep) {
    apiSteps.push({
      type: CampaignStepType.CONNECTION_REQUEST,
      data: {
        message: connectionStep.connectionMessage || '',
        premiumMessage: connectionStep.premiumConnectionMessage || '',
        standardMessage: connectionStep.standardConnectionMessage || ''
      }
    });
  }

  // Process follow-up groups
  const followUpGroups = collectFollowUpGroups(steps);
  followUpGroups.forEach((group) => {
    if (group.delay && group.followUp) {
      const delayInMilliseconds = convertTimeToMilliseconds(
        group.delay.delay?.days || 0,
        group.delay.delay?.hours || 0,
        group.delay.delay?.minutes || 0
      );

      apiSteps.push({
        type: CampaignStepType.FOLLOW_UP,
        data: {
          message: group.followUp.content || '',
          delay: delayInMilliseconds,
          attachments: group.followUp.attachments || []
        }
      });
    }
  });

  return apiSteps;
};

/**
 * Converts steps to campaign configs format
 * Uses backend-expected action names: INITIATED, SEND_CONNECTION_REQUEST, SEND_MESSAGE, COMPLETED
 */
export const convertStepsToConfigs = (steps: SequenceStep[], excludeConnected: boolean): any[] => {

  console.log('steps to configs', steps);
  const configs: any[] = [];

  // Add INITIATED action (id: 0)
  configs.push({
    id: 0,
    data: null,
    action: "INITIATED",
    parentID: null
  });

  // Find connection request step
  const connectionStep = steps.find(step => step.type === 'connection');
  if (connectionStep) {
    configs.push({
      id: 1,
      parentID: 0,
      action: "SEND_CONNECTION_REQUEST",
      data: {
        delay: 0,
        text: connectionStep.connectionMessage || "",
        premiumText: connectionStep.premiumConnectionMessage || "",
        standardText: connectionStep.standardConnectionMessage || "",
        premiumMessage: connectionStep.premiumConnectionMessage || "",
        standardMessage: connectionStep.standardConnectionMessage || ""
      }
    });
  }

  // Process follow-up groups
  const followUpGroups = collectFollowUpGroups(steps);
  let followUpIndex = 2;
  let lastParentID = 1; // Start with connection request (id: 1) as parent
  
  followUpGroups.forEach((group) => {
    if (group.delay && group.followUp) {
      const delayInMilliseconds = convertTimeToMilliseconds(
        group.delay.delay?.days || 0,
        group.delay.delay?.hours || 0,
        group.delay.delay?.minutes || 0
      );

      configs.push({
        id: followUpIndex,
        data: {
          text: group.followUp.content || "",
          delay: delayInMilliseconds,
          attachments: group.followUp.attachments || [],
          excludeConnected: excludeConnected
        },
        action: "SEND_MESSAGE",
        parentID: lastParentID
      });

      lastParentID = followUpIndex;
      followUpIndex++;
    }
  });

  // Add COMPLETED action at the end
  configs.push({
    id: followUpIndex,
    data: null,
    action: "COMPLETED",
    parentID: lastParentID
  });

  return configs;
};

/**
 * Converts flat configs format (with INITIATED, SEND_CONNECTION_REQUEST, SEND_MESSAGE, COMPLETED)
 * back to SequenceStep[] format for UI rendering
 */
export const convertFlatConfigsToSteps = (flatConfigs: any[]): SequenceStep[] => {
  if (!Array.isArray(flatConfigs) || flatConfigs.length === 0) {
    return getDefaultSteps();
  }

  const steps: SequenceStep[] = [];
  let currentGroupId = 'group-1';
  let groupIndex = 1;

  // Filter out INITIATED and COMPLETED actions as they're not UI steps
  const actionableConfigs = flatConfigs.filter(
    config => config.action !== 'INITIATED' && config.action !== 'COMPLETED'
  );

  actionableConfigs.forEach((config, index) => {
    if (config.action === 'SEND_CONNECTION_REQUEST') {
      steps.push({
        id: `connection-${index}`,
        type: 'connection',
        status: 'accepted',
        connectionMessage: config.data?.text || config.data?.premiumText || config.data?.standardText || '',
        premiumConnectionMessage: config.data?.premiumText || config.data?.premiumMessage || config.data?.text || '',
        standardConnectionMessage: config.data?.standardText || config.data?.standardMessage || config.data?.text || ''
      });
    } else if (config.action === 'SEND_MESSAGE') {
      const { days, hours } = convertMillisecondsToTime(config.data?.delay ?? 0);
      currentGroupId = `group-${groupIndex}`;
      
      // Add delay step
      steps.push({
        id: `delay-${index}`,
        type: 'delay',
        delay: { days, hours, minutes: 0 },
        groupId: currentGroupId
      });

      // Add follow-up step
      steps.push({
        id: `followup-${index}`,
        type: 'followup',
        content: config.data?.text || '',
        attachments: config.data?.attachments || [],
        groupId: currentGroupId
      });

      groupIndex++;
    }
  });

  return steps.length > 0 ? steps : getDefaultSteps();
};