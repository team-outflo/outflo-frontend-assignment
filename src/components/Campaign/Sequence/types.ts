import { CampaignStepType } from '@/types/campaigns';
import { Variable } from '@/api/variables/variables';

export interface ValidatedVariable extends Variable {
  allLeadsPresentInfo?: string;
  inputBoxHoverInfo?: string;
  isValidated: boolean;
  missingRows: number[];
  totalRows: number;
  validationStatus: 'valid' | 'invalid' | 'pending';
}

export interface SequenceStep {
  id: string;
  type: 'connection' | 'delay' | 'followup';
  content?: string;
  delay?: {
    days: number;
    hours: number;
    minutes: number;
  };
  status?: 'accepted' | 'pending';
  groupId?: string;
  connectionMessage?: string;
  premiumConnectionMessage?: string;
  standardConnectionMessage?: string;
  attachments?: string[];
}

export interface SequenceProps {
  workflowData?: any;
  updateWorkflow: (workflow: any) => void;
  operationalTimes?: any;
  updateOperationalTimes?: (times: any) => void;
  viewMode?: boolean;
  csvConfigForViewMode?: any;
  viewModeCampaignData?: any;
}

export interface ConnectionMessageState {
  premiumMessage: string;
  standardMessage: string;
  focusedMessageType: 'premium' | 'standard';
}

export interface PreviewState {
  isOpen: boolean;
  message: string;
  stepId: string | null;
  type?: 'premium' | 'standard';
  fromConnectionSheet?: boolean;
  accountType?: 'premium' | 'non-premium';
}

export interface LeadListInfo {
  name: string;
  totalLeads: number;
}

export interface AccountInfo {
  selectedAccount: any;
  isPremium: boolean;
  characterLimit: number;
}

export interface GroupedAccounts {
  premium: any[];
  standard: any[];
}

export interface FollowUpGroup {
  delay: SequenceStep;
  followUp: SequenceStep;
}

export interface StepGroup {
  type: 'connection' | 'followup-group';
  step?: SequenceStep;
  delayStep?: SequenceStep;
  followUpStep?: SequenceStep;
  index: number;
}

export interface SequenceState {
  steps: SequenceStep[];
  excludeConnected: boolean;
  variables: ValidatedVariable[];
  leadListInfo: LeadListInfo;
  selectedAccountId: string | null;
  connectionMessageState: ConnectionMessageState;
  previewState: PreviewState;
  isConnectionMessageOpen: boolean;
  currentConnectionStep: SequenceStep | null;
}

export interface SequenceActions {
  updateConnectionMessage: (stepId: string, premiumMessage: string, standardMessage: string) => void;
  addFollowUp: () => void;
  deleteFollowUpGroup: (groupId: string) => void;
  updateStepContent: (stepId: string, content: string) => void;
  updateDelay: (stepId: string, field: 'days' | 'hours' | 'minutes', value: number) => void;
  insertVariable: (stepId: string, variableId: string) => void;
  insertConnectionVariable: (variableId: string) => void;
  handleAddMessage: (step: SequenceStep) => void;
  handleSaveMessage: () => void;
  handleDismissMessage: () => void;
  handlePreview: (stepId: string) => void;
  handleViewContent: (content: string) => void;
}
