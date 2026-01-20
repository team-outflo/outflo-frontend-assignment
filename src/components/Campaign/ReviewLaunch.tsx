import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Mail, Calendar, Settings, Eye, Plus, X, ChevronDown, ChevronUp, Loader2, Lock, BarChart2, AlertCircle, CheckCircle, MessageCircle, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { isApiVariable } from '@/utils/variableUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LinkedInSenderAccountCard } from './LinkedInSenderAccountCard';
import { displayToLuxonFormat, luxonToDisplayFormat, zoneMap } from '@/utils/timezoneUtils';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';
import { launchCampaign } from '@/api/campaign/campaigns';
import { useCampaignStepNavigation } from '@/hooks/useCampaignStepNavigation';


const ReviewLaunch: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get campaign data directly from store
  const campaignStore = useCampaignStore();
  const campaign = campaignStore.campaign;
  const viewMode = campaignStore.mode === 'view';
  const { setOperationalTimes, updateCampaign } = campaignStore;

  const nodes = campaign.sequenceDraft?.nodes || [];

  // Use step navigation hook
  const { goToStep } = useCampaignStepNavigation();

  // Helper functions to convert between minutes and HH:MM format
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeStringToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert operationalTimes (minutes) to UI format (HH:MM strings)
  const operationalTimesToUIFormat = (operationalTimes: Record<string, { startTime: number; endTime: number; enabled: boolean }>) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    
    return dayLabels.reduce((acc, label, index) => {
      const dayKey = dayNames[index];
      // Enable Monday-Friday (indices 1-5 when Sunday is index 0)
      const dayData = operationalTimes[dayKey] || { startTime: 540, endTime: 1020, enabled: index >= 1 && index <= 5 };

      
      // Convert 1440 (midnight) to 1439 (23:59) for display
      let endTime = dayData.endTime;
      if (endTime === 1440) {
        endTime = 1439; // 23:59
      }

      
      acc[label] = {
        enabled: dayData.enabled,
        from: minutesToTimeString(dayData.startTime),
        to: minutesToTimeString(endTime)
      };
      return acc;
    }, {} as Record<string, { enabled: boolean; from: string; to: string }>);
  };

  // Convert UI format back to operationalTimes (minutes)
  const uiFormatToOperationalTimes = (uiFormat: Record<string, { enabled: boolean; from: string; to: string }>) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    
    return dayLabels.reduce((acc, label, index) => {
      const dayKey = dayNames[index];
      // Enable Monday-Friday (indices 1-5 when Sunday is index 0)
      const dayData = uiFormat[label] || { enabled: index >= 1 && index <= 5, from: '09:00', to: '17:00' };

      
      // Convert 00:00 end time to 23:59 (1439 minutes)
      let endTime = timeStringToMinutes(dayData.to);
      if (endTime === 0) {
        endTime = 1439; // 23:59
      }

      acc[dayKey] = {
        enabled: dayData.enabled,
        startTime: timeStringToMinutes(dayData.from),
        endTime: endTime
      };
      return acc;
    }, {} as Record<string, { startTime: number; endTime: number; enabled: boolean }>);
  };

  // Get operational times from campaign or use defaults
  const operationalTimes = campaign?.operationalTimes || {
    monday: { startTime: 540, endTime: 1020, enabled: true },
    tuesday: { startTime: 540, endTime: 1020, enabled: true },
    wednesday: { startTime: 540, endTime: 1020, enabled: true },
    thursday: { startTime: 540, endTime: 1020, enabled: true },
    friday: { startTime: 540, endTime: 1020, enabled: true },
    saturday: { startTime: 540, endTime: 1020, enabled: false },
    sunday: { startTime: 540, endTime: 1020, enabled: false },
  };

  // Convert to UI format for local state
  const [uiFormat, setUIFormat] = useState(() => operationalTimesToUIFormat(operationalTimes));

  // Initialize timezone in display format (convert from Luxon format if needed)
  const [timezone, setTimezone] = useState(() =>
    campaign?.timeZone ? luxonToDisplayFormat(campaign.timeZone) : "IST"
  );
  const [confirmDetails, setConfirmDetails] = useState(false);

  // Collapsible states - always open in view mode
  const [isLeadListOpen, setIsLeadListOpen] = useState(viewMode);
  const [isSendersOpen, setIsSendersOpen] = useState(viewMode);
  const [isSequenceOpen, setIsSequenceOpen] = useState(viewMode);
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);

  // Update UI format when operationalTimes change
  useEffect(() => {
    if (campaign?.operationalTimes) {
      setUIFormat(operationalTimesToUIFormat(campaign.operationalTimes));
    }

    if (campaign?.timeZone) {
      // Convert from Luxon format to display format for UI
      setTimezone(luxonToDisplayFormat(campaign.timeZone));
    }

    // In view mode, ensure all sections are open
    if (viewMode) {
      setIsLeadListOpen(true);
      setIsSendersOpen(true);
      setIsSequenceOpen(true);
      setIsScheduleOpen(true);
    }
  }, [campaign?.operationalTimes, campaign?.timeZone, viewMode]);






  // Improved data extraction based on the actual store structure
  // For lead data - directly access from the store
  const leadCount = campaign?.leads?.leadListMetadata?.totalLeads ||  campaign?.leads?.data?.length|| 0;
  const hasLeadListId = !!campaign?.leads; // Check if leadlist exists (empty list is allowed)

  const leadListName = campaign?.leads?.fileName ||
    (campaign?.name ? `${campaign.name} List` : 'Lead List');

  // Get sender accounts directly from store
  const senderAccounts = campaign?.senderAccounts || [];

  // Parse workflow steps for display - prioritize store data
  const formatDelay = (delaySeconds: number) => {
    // Handle edge cases
    if (delaySeconds === undefined || delaySeconds === null || isNaN(delaySeconds)) {
      return "0 minutes";
    }

    // Ensure non-negative value
    const safeDelaySeconds = Math.max(0, delaySeconds);

    // Convert seconds to minutes for easier calculation
    const totalMinutes = Math.floor(safeDelaySeconds / 60);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

    return parts.length > 0 ? parts.join(" ") : "0 minutes";
  };

  const getWorkflowSteps = () => {
    const sequenceType = campaign?.sequenceType || 'TREE';
    
    // For FLAT sequences, read from sequenceDraft.flat
    if (sequenceType === 'FLAT' && campaign?.sequenceDraft?.flat && Array.isArray(campaign.sequenceDraft.flat) && campaign.sequenceDraft.flat.length > 0) {
      const flatConfigs = campaign.sequenceDraft.flat;
      const steps: any[] = [];
      let followUpCount = 0;

      // Filter out INITIATED and COMPLETED actions
      const actionableConfigs = flatConfigs.filter(
        (config: any) => config.action !== 'INITIATED' && config.action !== 'COMPLETED'
      );

      actionableConfigs.forEach((config: any) => {
        if (config.action === 'SEND_CONNECTION_REQUEST') {
          steps.push({
            type: "connection",
            title: "Connection Request",
            subtitle: "Initial outreach message",
            content: config.data?.text || config.data?.premiumText || config.data?.standardText || config.data?.premiumMessage || config.data?.standardMessage || ""
          });
        } else if (config.action === 'SEND_MESSAGE') {
          followUpCount++;
          const delayMs = config.data?.delay || 0;
          const delaySeconds = delayMs / 1000;
          steps.push({
            type: "followup",
            title: `Message ${followUpCount}`,
            subtitle: formatDelay(delaySeconds),
            content: config.data?.text || ""
          });
        }
      });

      return steps;
    }

    // For TREE sequences or legacy format, use sequence.steps
    const sequenceSteps = campaign?.sequence?.steps || [];

    if (sequenceSteps.length > 0) {
      let followUpCount = 0;
      return sequenceSteps.map((step: any, index: number) => {
        // Type 0 = Connection Request, Type 1 = Follow-up
        if (step.type === 0) {
          return {
            type: "connection",
            title: "Connection Request",
            subtitle: "Initial outreach message",
            content: step.data?.message || step.data?.premiumMessage || step.data?.standardMessage || ""
          };
        } else if (step.type === 1) {
          followUpCount++;
          const rawDelay = step.data?.delay;
          // Handle delay as number or string number (in milliseconds)
          const delaySeconds = typeof rawDelay === 'number' 
            ? rawDelay / 1000 
            : typeof rawDelay === 'string' && !isNaN(Number(rawDelay))
            ? Number(rawDelay) / 1000
            : 0;
          
          return {
            type: "followup",
            title: `Message ${followUpCount}`,
            subtitle: formatDelay(delaySeconds),
            content: step.data?.message || ""
          };
        }
        return null;
      }).filter(Boolean);
    }

    return [];
  };


  const workflowSteps = getWorkflowSteps();

  const flowSequence = campaign.sequenceDraft?.nodes || [];

  console.log("Workflow steps:", workflowSteps);

  // Get getCsvColumnFix from store
  const { getCsvColumnFix } = campaignStore;

  // Function to extract all variables from a message text
  const extractVariablesFromMessage = (message: string): string[] => {
    if (!message) return [];
    const variableRegex = /\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(message)) !== null) {
      const variableId = match[1];
      if (variableId && !variables.includes(variableId)) {
        variables.push(variableId);
      }
    }
    return variables;
  };

  // Check if all variables in campaign messages have configurations
  const checkVariableConfigurations = (): { isValid: boolean; missingVariables: Array<{ variableId: string; variableName: string }> } => {
    const missingVariables: Array<{ variableId: string; variableName: string }> = [];
    const allVariables = new Set<string>();

    // Extract variables from all messages
    workflowSteps.forEach((step: any) => {
      if (step.content) {
        const variables = extractVariablesFromMessage(step.content);
        variables.forEach(v => allVariables.add(v));
      }
    });

    // Also check connection messages from sequence steps
    const sequenceSteps = campaign?.sequence?.steps || [];
    sequenceSteps.forEach((step: any) => {
      if (step.data?.message) {
        const variables = extractVariablesFromMessage(step.data.message);
        variables.forEach(v => allVariables.add(v));
      }
      if (step.data?.premiumMessage) {
        const variables = extractVariablesFromMessage(step.data.premiumMessage);
        variables.forEach(v => allVariables.add(v));
      }
      if (step.data?.standardMessage) {
        const variables = extractVariablesFromMessage(step.data.standardMessage);
        variables.forEach(v => allVariables.add(v));
      }
    });

    // Check each variable for configuration (only CSV and API variables need configuration)
    allVariables.forEach(variableId => {
      // Only check CSV and API variables
      if (variableId.startsWith('csv_') || isApiVariable(variableId)) {
        const hasConfig = getCsvColumnFix ? getCsvColumnFix(variableId) : null;
        if (!hasConfig) {
          // Try to get variable name from variables list
          const variables = campaignStore.variables || [];
          const variable = variables.find((v: any) => v.id === variableId);
          missingVariables.push({
            variableId,
            variableName: variable?.name || variableId
          });
        }
      }
    });

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  };

  const variableConfigCheck = useMemo(() => checkVariableConfigurations(), [
    workflowSteps,
    campaign?.sequence?.steps,
    getCsvColumnFix,
    campaignStore.variables
  ]);

  // Update operational times - skip in view mode
  const toggleDay = (day: string) => {
    if (viewMode) return; // Skip in view mode

    const updatedUIFormat = {
      ...uiFormat,
      [day]: { ...uiFormat[day as keyof typeof uiFormat], enabled: !uiFormat[day as keyof typeof uiFormat].enabled }
    };

    setUIFormat(updatedUIFormat);
    const updatedOperationalTimes = uiFormatToOperationalTimes(updatedUIFormat);
    updateCampaign({ operationalTimes: updatedOperationalTimes });
    setOperationalTimes(updatedOperationalTimes);
  };

  const updateTimeSlot = (day: string, field: 'from' | 'to', value: string) => {
    if (viewMode) return; // Skip in view mode

    // Handle 00:00 end time conversion - convert to 23:59 instead of 24:00
    let processedValue = value;
    if (value === '00:00' && field === 'to') {
      // Convert 00:00 end time to 23:59 (not 24:00, as 24:00 is not a valid time)
      processedValue = '23:59';
    }
    // Keep 00:00 for start times (left side) as is

    const updatedUIFormat = {
      ...uiFormat,
      [day]: {
        ...uiFormat[day as keyof typeof uiFormat],
        [field]: processedValue
      }
    };

    // Update the local state and campaign data
    setUIFormat(updatedUIFormat);
    const updatedOperationalTimes = uiFormatToOperationalTimes(updatedUIFormat);
    updateCampaign({ operationalTimes: updatedOperationalTimes });
    setOperationalTimes(updatedOperationalTimes);
  };

  // Validation function to check if start time is before end time
  const validateTimeSlot = (day: string) => {
    const dayConfig = uiFormat[day as keyof typeof uiFormat];

    if (!dayConfig.from || !dayConfig.to) return true; // Allow empty times

    const [startHour, startMin] = dayConfig.from.split(':').map(Number);
    const [endHour, endMin] = dayConfig.to.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return startMinutes < endMinutes;
  };


  const applyToAllDays = (day: string) => {
    if (viewMode) return; // Skip in view mode

    const template = uiFormat[day as keyof typeof uiFormat];
    const newUIFormat = Object.fromEntries(
      Object.keys(uiFormat).map(dayKey => [
        dayKey,
        { ...template }
      ])
    ) as typeof uiFormat;

    setUIFormat(newUIFormat);
    const updatedOperationalTimes = uiFormatToOperationalTimes(newUIFormat);
    updateCampaign({ operationalTimes: updatedOperationalTimes });
    setOperationalTimes(updatedOperationalTimes);
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (viewMode) return; // Skip in view mode

    const newTimezoneDisplay = e.target.value;
    // Convert display format to Luxon format for storage
    const newTimezoneLuxon = displayToLuxonFormat(newTimezoneDisplay);

    setTimezone(newTimezoneDisplay);
    updateCampaign({ timeZone: newTimezoneLuxon });
  };


  // Check if there are any invalid time slots
  const hasInvalidTimeSlots = () => {
    return Object.entries(uiFormat).some(([day, config]) => {
      const dayConfig = config as { enabled: boolean; from: string; to: string };
      if (!dayConfig.enabled) return false;
      return !validateTimeSlot(day);
    });
  };

  // Update the handleLaunch function to validate requirements
  const handleLaunch = async () => {
    if (viewMode) return; // Skip in view mode

    // Check for required data
    if (!hasLeadListId) {
      // Show error toast for missing lead list
      toast({
        title: "Cannot Launch Campaign",
        description: "Please select a lead list for your campaign before launching.",
        variant: "destructive",
      });
      return;
    }

    if (!senderAccounts || senderAccounts.length === 0) {
      // Show error toast for missing sender accounts
      toast({
        title: "Cannot Launch Campaign",
        description: "Please add at least one LinkedIn sender account before launching.",
        variant: "destructive",
      });
      return;
    }

    // Check for invalid time slots
    if (hasInvalidTimeSlots()) {
      toast({
        title: "Invalid Operational Hours",
        description: "Please fix the operational hours where start time must be before end time.",
        variant: "destructive",
      });
      return;
    }

    // Only continue if we have leads and sender accounts and user confirmed
    if (!confirmDetails) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that all details are correct before launching.",
        variant: "destructive",
      });
      return;
    }

    if (!campaign?.id) {
      toast({
        title: "Error",
        description: "Campaign ID is missing. Cannot launch campaign.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, save the draft
      toast({
        title: "Saving Draft",
        description: "Saving campaign draft before launching...",
      });

      // Save draft campaign - it will get campaign directly from store
      await saveDraftCampaign();

      // Once draft is saved successfully, launch the campaign
      toast({
        title: "Launching Campaign",
        description: "Launching your campaign...",
      });

      const launchResponse = await launchCampaign(campaign.id);

      // Handle the GenericApiResponse structure: { user, message, data }
      console.log("Launch response:", launchResponse);
      if (launchResponse && launchResponse.data) {
        toast({
          title: "Success",
          description: launchResponse.message || "Campaign launched successfully.",
        });
        // Redirect to all campaigns page on success
        navigate('/allcampaigns');
      } else {
        throw new Error(launchResponse?.message || 'Failed to launch campaign. Please try again.');
      }
    } catch (error: any) {
      console.error('Error launching campaign:', error);

      // Handle error response - check multiple possible error locations
      const errorMessage = error?.response?.data?.error ||
        error?.response?.data?.data?.error ||
        error?.data?.error ||
        error?.message ||
        'Failed to launch campaign. Please try again.';

      toast({
        title: "Launch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Render the campaign status badge based on current campaign state
  const renderCampaignStatus = () => {
    const state = campaign?.state;
    let status = 'draft';

    // Handle either string or enum type safely
    if (typeof state === 'string') {
      status = state.toLowerCase();
    } else if (state !== undefined) {
      // If it's an enum, convert to string
      status = String(state).toLowerCase();
    }

    const statusMap = {
      processing: { label: "Processing", className: "bg-blue-100 text-blue-800 border-blue-200" },
      active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
      paused: { label: "Paused", className: "bg-amber-100 text-amber-800 border-amber-200" },
      completed: { label: "Completed", className: "bg-blue-100 text-blue-800 border-blue-200" },
      stopped: { label: "Stopped", className: "bg-gray-100 text-gray-800 border-gray-200" },
      draft: { label: "Draft", className: "bg-purple-100 text-purple-800 border-purple-200" },
      failed: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
      running: { label: "Running", className: "bg-green-100 text-green-800 border-green-200" }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;

    return (
      <Badge className={`${statusInfo.className} ml-2`}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Add function to safely handle different date formats
  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return 'N/A';

    try {
      const numericTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      // Handle both Unix timestamps (seconds) and JavaScript timestamps (milliseconds)
      const dateObj = new Date(numericTimestamp < 10000000000 ? numericTimestamp * 1000 : numericTimestamp);
      return format(dateObj, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get campaign performance metrics for view mode
  const getCampaignMetrics = () => {
    // From campaign stats if available
    const stats = (campaign as any)?.stats || {};

    return [
      {
        title: "Connection Requests",
        value: stats.connectionsSent || 0,
        icon: Users,
        bgColor: "bg-blue-50",
        textColor: "text-blue-600"
      },
      {
        title: "Accepted",
        value: stats.connectionsAccepted || 0,
        icon: CheckCircle,
        bgColor: "bg-green-50",
        textColor: "text-green-600"
      },
      {
        title: "Messages Sent",
        value: stats.messagesSent || 0,
        icon: MessageCircle,
        bgColor: "bg-indigo-50",
        textColor: "text-indigo-600"
      },
      {
        title: "Responses",
        value: stats.messagesReceived || 0,
        icon: ArrowLeft,
        bgColor: "bg-purple-50",
        textColor: "text-purple-600"
      }
    ];
  };

  return (
    <div className="space-y-8">

      {/* Schedule Campaign - Enhanced readability in view mode */}
      <Collapsible
        open={isScheduleOpen}
        onOpenChange={(isOpen) => !viewMode && setIsScheduleOpen(isOpen)}
        disabled={viewMode}
      >
        <Card className={`bg-white shadow-sm border border-gray-100 `}>
          <CollapsibleTrigger asChild>
            <CardHeader className={`pb-4 ${!viewMode ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${viewMode ? 'bg-gray-50/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${viewMode ? 'bg-blue-50' : 'bg-primary/10'}`}>
                    <Calendar className={`w-5 h-5 ${viewMode ? 'text-blue-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Campaign Schedule</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {viewMode
                        ? "Times when audience receives deliveries from this campaign"
                        : "Set the times your audience should receive deliveries from this campaign"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!viewMode && (
                    isScheduleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Timezone display - enhanced for view mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <div className="relative">
                  {viewMode ? (
                    <div className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-gray-700 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      {timezone}
                    </div>
                  ) : (
                    <>
                      <select
                        value={timezone}
                        onChange={handleTimezoneChange}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white appearance-none pr-10"
                        disabled={viewMode}
                      >
                        {/* <option value="Target's Timezone (Recommended)">Target's Timezone (Recommended)</option> */}

                        <optgroup label="UTC/GMT">
                          <option value="GMT">GMT - Greenwich Mean Time</option>
                          <option value="UTC">UTC - Coordinated Universal Time</option>
                        </optgroup>

                        <optgroup label="Americas">
                          <option value="EST">EST - Eastern Standard Time</option>
                          <option value="EDT">EDT - Eastern Daylight Time</option>
                          <option value="CST">CST - Central Standard Time</option>
                          <option value="CDT">CDT - Central Daylight Time</option>
                          <option value="MST">MST - Mountain Standard Time</option>
                          <option value="MDT">MDT - Mountain Daylight Time</option>
                          <option value="PST">PST - Pacific Standard Time</option>
                          <option value="PDT">PDT - Pacific Daylight Time</option>
                        </optgroup>

                        <optgroup label="Europe">
                          <option value="BST">BST - British Summer Time</option>
                          <option value="CET">CET - Central European Time</option>
                          <option value="CEST">CEST - Central European Summer Time</option>
                          <option value="EET">EET - Eastern European Time</option>
                          <option value="EEST">EEST - Eastern European Summer Time</option>
                          <option value="MSK">MSK - Moscow Standard Time</option>
                        </optgroup>

                        <optgroup label="Asia">
                          <option value="IST">IST - Indian Standard Time</option>
                          <option value="CST_CHINA">CST - China Standard Time</option>
                          <option value="JST">JST - Japan Standard Time</option>
                          <option value="AST">AST - Arabian Standard Time</option>
                        </optgroup>

                        <optgroup label="Australia/Pacific">
                          <option value="AWST">AWST - Australian Western Standard Time</option>
                          <option value="ACST">ACST - Australian Central Standard Time</option>
                          <option value="AEST">AEST - Australian Eastern Standard Time</option>
                          <option value="AEDT">AEDT - Australian Eastern Daylight Time</option>
                        </optgroup>

                        <optgroup label="Africa">
                          <option value="SAST">SAST - South Africa Standard Time</option>
                        </optgroup>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </>
                  )}
                </div>
              </div>

              {/* Operational Hours Grid - improved view mode display */}
              <div>
                {/* <div className="flex flex-col mb-4">
                  <h4 className="font-medium text-gray-900">Operational Hours</h4>
                  <p className="text-gray-500">These hours define when actions can run. Daily sending is paced automatically based on account safety limits.</p>
                </div> */}
                <div className="mb-4">
                <div className="font-medium text-gray-900">Operational Hours</div>
                <p className="text-sm text-gray-500 mt-1">These hours define when actions can run. Daily sending is paced automatically based on account safety limits.</p>

                </div>

                <div className={`space-y-3 ${viewMode ? 'border border-blue-100 rounded-lg p-3 bg-blue-50/20' : ''}`}>
                  {Object.entries(uiFormat).map(([day, config]) => {
                    const dayConfig = config as { enabled: boolean; from: string; to: string };
                    const isValid = validateTimeSlot(day);
                    return (
                      <div key={day} className={`flex items-center space-x-4 p-3 border ${viewMode ? 'border-blue-100 bg-white' : 'border-gray-200'} rounded-lg`}>
                        <div className="flex items-center space-x-3 w-24">
                          {viewMode ? (
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${dayConfig.enabled
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-gray-200 border-gray-300'}`}>
                              {dayConfig.enabled && <Check className="w-3 h-3" />}
                            </div>
                          ) : (
                            <Checkbox
                              checked={dayConfig.enabled}
                              onCheckedChange={(checked) => {
                                if (checked !== 'indeterminate' && !viewMode) {
                                  toggleDay(day);
                                }
                              }}
                              disabled={viewMode}
                            />
                          )}
                          <span className={`text-sm font-medium ${dayConfig.enabled ? 'text-gray-700' : 'text-gray-500'}`}>{day}</span>
                        </div>

                        <div className="flex-1 flex items-center space-x-2">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              {viewMode ? (
                                <span className={`px-2 py-1 border ${dayConfig.enabled
                                  ? 'border-blue-200 bg-blue-50/50 text-blue-700'
                                  : 'border-gray-200 bg-gray-50 text-gray-400'} rounded text-sm`}>
                                  {dayConfig.from}
                                </span>
                              ) : (
                                <input
                                  type="time"
                                  value={dayConfig.from}
                                  onChange={(e) => updateTimeSlot(day, 'from', e.target.value)}
                                  disabled={!dayConfig.enabled || viewMode}
                                  className={`px-2 py-1 border rounded text-sm disabled:bg-gray-100 ${!isValid && dayConfig.enabled
                                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                                    }`}
                                />
                              )}
                              <span className="text-gray-500">to</span>
                              {viewMode ? (
                                <span className={`px-2 py-1 border ${dayConfig.enabled
                                  ? 'border-blue-200 bg-blue-50/50 text-blue-700'
                                  : 'border-gray-200 bg-gray-50 text-gray-400'} rounded text-sm`}>
                                  {dayConfig.to}
                                </span>
                              ) : (
                                <input
                                  type="time"
                                  value={dayConfig.to}
                                  onChange={(e) => updateTimeSlot(day, 'to', e.target.value)}
                                  disabled={!dayConfig.enabled || viewMode}
                                  className={`px-2 py-1 border rounded text-sm disabled:bg-gray-100 ${!isValid && dayConfig.enabled
                                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                                    }`}
                                />
                              )}
                            </div>
                            {!isValid && dayConfig.enabled && !viewMode && (
                              <div className="text-xs text-red-500 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Start time must be before end time for the selected day
                              </div>
                            )}
                          </div>
                        </div>

                        {!viewMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applyToAllDays(day)}
                            disabled={!dayConfig.enabled || viewMode}
                            className="text-xs text-primary hover:text-primary/80"
                          >
                            Apply to all
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Lead List Summary */}
      <Collapsible
        open={isLeadListOpen}
        onOpenChange={(isOpen) => !viewMode && setIsLeadListOpen(isOpen)}
        disabled={viewMode}
      >
        <Card className={`bg-white shadow-sm border border-gray-100 `}>
          <CollapsibleTrigger asChild>
            <CardHeader className={`pb-4 ${!viewMode ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${viewMode ? 'bg-gray-50/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${viewMode ? 'bg-blue-50' : 'bg-primary/10'}`}>
                    <Users className={`w-5 h-5 ${viewMode ? 'text-blue-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Lead List</CardTitle>
                    {viewMode && (
                      <p className="text-sm text-gray-500 mt-1">
                        Target audience for this campaign
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={(e) => {
                      e.stopPropagation(); // Prevent accordion toggle
                      goToStep(2); // Navigate to List of Leads step
                    }}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                  {!viewMode && (
                    isLeadListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {hasLeadListId ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{leadListName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {viewMode
                        ? "Lead list used in this campaign"
                        : "Selected lead list for this campaign"}
                    </p>
                  </div>
                  <Badge variant={viewMode ? "outline" : "secondary"} className={viewMode
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-primary/10 text-primary border-primary/20"}>
                    {leadCount} {leadCount === 1 ? 'Lead' : 'Leads'}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No lead list selected. {!viewMode && "Please go back and select a lead list."}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Sender Accounts Summary - Enhanced styling in view mode */}
      <Collapsible
        open={isSendersOpen}
        onOpenChange={(isOpen) => !viewMode && setIsSendersOpen(isOpen)}
        disabled={viewMode}
      >
        <Card className={`bg-white shadow-sm border botder border-gray-100 `}>
          <CollapsibleTrigger asChild>
            <CardHeader className={`pb-4 ${!viewMode ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${viewMode ? 'bg-gray-50/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${viewMode ? 'bg-blue-50' : 'bg-primary/10'}`}>
                    <Mail className={`w-5 h-5 ${viewMode ? 'text-blue-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Sender Accounts</CardTitle>
                    {viewMode && (
                      <p className="text-sm text-gray-500 mt-1">
                        LinkedIn accounts used to send messages
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent accordion toggle
                      goToStep(1); // Navigate to LinkedIn Senders step
                    }}
                  >
                    {viewMode ? 'View Senders' : 'Edit Senders'}
                  </Button>
                  {!viewMode && (
                    isSendersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {senderAccounts && senderAccounts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  {senderAccounts.map((account: any, index: number) => {
                    // Get account status if available
                    const accountStatus = (campaign as any)?.accountStatuses?.[account.id];

                    return (
                      <LinkedInSenderAccountCard
                        key={account.id || `account-${index}`}
                        account={account}
                        accountStatus={accountStatus}
                        variant="card"
                        showConfigLimits={true}
                        className={viewMode ? 'bg-blue-50/30 border border-blue-100' : 'bg-gray-50'}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No sender accounts selected. {!viewMode && "Please go back and select LinkedIn accounts."}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Sequence Overview - Enhanced message display in view mode */}
      <Collapsible
        open={isSequenceOpen}
        onOpenChange={(isOpen) => !viewMode && setIsSequenceOpen(isOpen)}
        disabled={viewMode}
      >
        <Card className={`bg-white shadow-sm border border-gray-100 `}>
          <CollapsibleTrigger asChild>
            <CardHeader className={`pb-4 ${!viewMode ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${viewMode ? 'bg-gray-50/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${viewMode ? 'bg-blue-50' : 'bg-primary/10'}`}>
                    <Settings className={`w-5 h-5 ${viewMode ? 'text-blue-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Campaign Sequence</CardTitle>
                    {viewMode && (
                      <p className="text-sm text-gray-500 mt-1">
                        Message sequence and automation flow
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent accordion toggle
                      goToStep(3); // Navigate to Sequence step
                    }}
                  >
                    {viewMode ? 'View Sequence' : 'Edit Sequence'}
                  </Button>
                  {!viewMode && (
                    isSequenceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {workflowSteps && workflowSteps.length > 0 ? (
                <div className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={index} className={`flex flex-col p-4 rounded-lg ${viewMode
                      ? step.type === 'connection'
                        ? 'bg-indigo-50/40 border border-indigo-100'
                        : 'bg-blue-50/40 border border-blue-100'
                      : 'bg-gray-50'
                      }`}>
                      <div className="flex items-center space-x-4 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${viewMode
                          ? step.type === 'connection'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-blue-100 text-blue-700'
                          : 'bg-primary text-white'
                          }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{step.title}</h4>
                          <p className="text-sm text-gray-500">{step.subtitle}</p>
                        </div>
                        {step.type === 'connection' ?
                          <Mail className={`w-4 h-4 ${viewMode ? 'text-indigo-500' : 'text-gray-400'}`} /> :
                          <Clock className={`w-4 h-4 ${viewMode ? 'text-blue-500' : 'text-gray-400'}`} />
                        }
                      </div>

                      {/* Always show message content, but with different styling based on mode */}
                      {step.content && (
                        <div className={`mt-2 p-3 rounded text-sm whitespace-pre-wrap ${viewMode
                          ? step.type === 'connection'
                            ? 'bg-white border border-indigo-100 text-gray-700'
                            : 'bg-white border border-blue-100 text-gray-700'
                          : 'bg-white/80 border border-gray-200 text-gray-700'
                          }`}>
                          {step.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No campaign sequence configured. {!viewMode && "Please go back and set up your campaign sequence."}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>



      {/* Launch Button - Only show in edit mode */}
      {!viewMode && (
        <div className="bg-white border-t border-gray-200 p-6 rounded-lg shadow-sm">
          <div className="max-w-md mx-auto space-y-4">
            {/* Display validation warnings if required data is missing */}
            {(!hasLeadListId || !senderAccounts || senderAccounts.length === 0 || !variableConfigCheck.isValid) && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Missing required information</AlertTitle>
                <AlertDescription className="text-red-700">
                  <ul className="list-disc pl-5 space-y-1 mt-1 text-sm">
                    {!hasLeadListId && (
                      <li>No lead list selected. Please select a lead list for your campaign.</li>
                    )}
                    {(!senderAccounts || senderAccounts.length === 0) && (
                      <li>No sender accounts found. Please add at least one LinkedIn account.</li>
                    )}
                    {(workflowSteps.length === 0 && (!nodes || nodes.length <= 2)) && (
                      <li>No campaign sequence.</li>
                    )}
                    {!variableConfigCheck.isValid && (
                      <li>
                        <span className="font-medium">Missing variable configurations:</span>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                          {variableConfigCheck.missingVariables.map(({ variableId, variableName }) => (
                            <li key={variableId}>
                              {variableName} ({variableId}) - Please configure this variable in the Sequence step.
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={confirmDetails}
                onCheckedChange={(checked) => {
                  if (checked !== 'indeterminate') {
                    setConfirmDetails(!!checked);
                  }
                }}
                disabled={!hasLeadListId || !senderAccounts || senderAccounts.length === 0 || !variableConfigCheck.isValid || (workflowSteps.length === 0 && (!nodes || nodes.length <= 2))}
              />
              <label className={`text-sm ${!hasLeadListId || !senderAccounts || senderAccounts.length === 0 || !variableConfigCheck.isValid
                ? "text-gray-400"
                : "text-gray-600"}`}>
                I confirm all details are correct and ready to launch
              </label>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-lg font-semibold relative"
              disabled={!confirmDetails || !hasLeadListId || !senderAccounts || senderAccounts.length === 0 || hasInvalidTimeSlots() ||!variableConfigCheck.isValid || (workflowSteps.length === 0 && (!nodes || nodes.length <= 2))}
              onClick={handleLaunch}
            >
              {(workflowSteps.length === 0 && (!nodes || nodes.length <= 2)) || leadCount === 0 || !senderAccounts || senderAccounts.length === 0 ? (
                "Missing Required Data"
              ) : !variableConfigCheck.isValid ? (
                "Configure Variables"
              ) : hasInvalidTimeSlots() ? (
                "Fix Operational Hours"
              ) : (
                <>🚀 Launch Campaign</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Campaign Statistics - Improved display in view mode */}
      {/* {viewMode && (
        <Card className="bg-white shadow-sm border border-gray-100">
          <CardHeader className="border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <BarChart2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Campaign Performance</CardTitle>
                  <CardDescription>
                    Statistics and metrics for this campaign
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                Statistics
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6"> */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {campaignData?.stats ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center mb-2">
                      <Users className="w-4 h-4 text-blue-500 mr-2" />
                      <p className="text-sm font-medium text-blue-700">Connection Requests</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {campaignData?.stats?.connectionsSent || 0}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">Total sent</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <p className="text-sm font-medium text-green-700">Accepted</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {campaignData?.stats?.connectionsAccepted || 0}
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      {campaignData?.stats?.connectionsSent
                        ? Math.round((campaignData?.stats?.connectionsAccepted / campaignData?.stats?.connectionsSent) * 100) + '%'
                        : '0%'} acceptance rate
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <div className="flex items-center mb-2">
                      <MessageCircle className="w-4 h-4 text-purple-500 mr-2" />
                      <p className="text-sm font-medium text-purple-700">Messages Sent</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {campaignData?.stats?.messagesSent || 0}
                    </p>
                    <p className="text-xs text-purple-500 mt-1">Total messages</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <div className="flex items-center mb-2">
                      <ArrowLeft className="w-4 h-4 text-indigo-500 mr-2" />
                      <p className="text-sm font-medium text-indigo-700">Responses</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {campaignData?.stats?.messagesReceived || 0}
                    </p>
                    <p className="text-xs text-indigo-500 mt-1">
                      {campaignData?.stats?.messagesSent
                        ? Math.round((campaignData?.stats?.messagesReceived / campaignData?.stats?.messagesSent) * 100) + '%'
                        : '0%'} response rate
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-4 py-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BarChart2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No performance data available</h3>
                  <p className="text-gray-500 mt-2">This campaign doesn't have any performance statistics yet.</p>
                </div>
              )}
            </div> */}

      {/* Campaign timeline if available */}
      {/* {viewMode && campaignData?.timeline && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Timeline</h3>
                <div className="space-y-3">
                  {campaignData.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{event.action}</p>
                        <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent> */}
      {/* </Card> */}
      {/* )} */}
    </div>
  );
};

export default ReviewLaunch;