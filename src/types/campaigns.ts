import { Account } from "./accounts";

export enum CampaignStepType {
  CONNECTION_REQUEST,
  FOLLOW_UP,
}

export enum CampaignState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
  NOT_STARTED = 'NOT_STARTED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export type TCampaignConnectionRequest = {
  message?: string;
  delay?: string;
  premiumMessage?: string;
  standardMessage?: string;
};

export type TCampaignFollowUp = {
  message: string;
  delay: string;
  premiumMessage?: string;
  standardMessage?: string;
  attachments?: string[];
};

export type CampaignStep = {
  type: CampaignStepType;
  data: TCampaignConnectionRequest | TCampaignFollowUp;
};

export type CampaignSequence = {
  excludeConnected?: boolean;
  steps?: CampaignStep[];
};

export interface SequenceSettings {
  excludeConnected: boolean;
}

export interface CampaignInsights {
  totalLeads: number;
  connectionRequestsSent: number;
  connectionRequestsAccepted: number;
  messagesSent: number;
  responses: number;
  campaignStatus: string;
  dynamicStatus: {
    status: string;
    details: {
      totalLeads: number;
      processedLeads: number;
      failedLeads: number;
      pendingLeads: number;
      failureRate: number;
      hasActiveActions: boolean;
    };
    lastCalculated: string;
  };
}

export type DayOperationalTime = {
  startTime: number;
  endTime: number;
  enabled: boolean;
}

export type OperationalTimes = Record<string, DayOperationalTime>;

export interface Lead {
  firstName: string;
  status: string;
  lastActivity: number; // epochms
  accountId: string;
  url: string;
  customVars?: Record<string, any>; // Custom variables from CSV
  details?: {
    linkedinUrl?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    jobTitle?: string;
    location?: string;
    email?: string;
    headline?: string;
    [key: string]: any; // Allow additional fields from CSV
  };
  id?: string;
  listId?: string;
  profileId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ColumnMapping {
  csvColumnName: string;
  normalisedColumnName: string;
}

export interface CampaignConfig {
  id: string; // uuid instead of number
  parentId: string | null;
  action: "SEND_CONNECTION_REQUEST" | "SEND_MESSAGE";
  data: {
    delay?: number;          // in ms
    text?: string;
    excludeConnected?: boolean;
    premiumText?: string;
    standardText?: string;
    [key: string]: any;      // allow flexible fields since backend stores jsonb
  };
}

export type CsvColumnFix = {
  columnName: string;
  fixChain: {
    fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | 'fetchFromLinkedIn' | 'allLeadsPresent';
    sourceField?: string; // LinkedIn field for fetchFromLinkedIn
    defaultValue?: string; // Required for insertDefaultValue
    fallback?: {
      fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | 'fetchFromLinkedIn';
      defaultValue?: string; // Required for insertDefaultValue fallback
      sourceField?: string; // LinkedIn field for fetchFromLinkedIn fallback
      fallback?: {
        fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads';
        defaultValue?: string; // Required for insertDefaultValue nested fallback
      };
    };
  };
  appliedAt: number; // timestamp
};

export type CsvConfig = {
  columnFixes: CsvColumnFix[];
  detectedColumns: string[];
  mainIdentifier?: string;
  lastUpdated: number;
};

export type Campaign = {
  leadListId: any;
  id?: string;
  name?: string;
  description?: string; // Backend has it, so adding it here
  createdAt?: number;
  updatedAt?: number;
  state?: CampaignState; // `status` from backend
  orgID?: string;
  leads?: {
    s3Url?: string;
    fileName?: string;
    file?: File;
    fileKey?: string; // S3 file key for reference
    data?: Lead[]; // backend data
    leadListId?: string; // Add leadListId to leads object
    mappings?: any[]; // Store backend mappings
    columnMapping?: ColumnMapping[]; // Column mapping from backend
    source?: {
      type?: string; // LINKEDIN, CSV, SAVED_LIST
      metadata?: {
        accountType?: string; // classic, sales_navigator, recruiter
        [key: string]: any;
      };
      [key: string]: any;
    }; // Source information from leadList
    leadListMetadata?: {
      id: string;
      name: string;
      status: string;
      totalLeads: number;
      columnMapping?: ColumnMapping[];
      source?: {
        type?: string;
        metadata?: {
          [key: string]: any;
        };
        [key: string]: any;
      };
      [key: string]: any;
    }; // Raw leadList metadata from /api/leads/:listid
    isFetchingLeads?: boolean; // Track when fetching leads after ACTIVE status
  };
  csvConfig?: CsvConfig; // Configuration for CSV column fixes
  status?: string;
  senderAccounts?: Account[]; // Not in backend, so optional
  accountIDs?: string[]; // Convert from bson.ObjectID[]
  //configs?: Config[]; // Present in backend
  operationalTimes?: OperationalTimes; // Present in backend
  sequence?: CampaignSequence; // Renamed from workflow
  sequenceSettings?: SequenceSettings; // Sequence-level settings
  sequenceType?: "TREE" | "FLAT"; // Flag to indicate sequence structure type
  sequenceDraft?: {
    flat?: any[]; // Array of steps/configs for FLAT sequence
    nodes: any[]; // React Flow nodes
    edges: any[]; // React Flow edges
    [key: string]: any; // Allow additional fields
  } | null;
  timeZone: string; // Not in backend, so optional
  accountStatuses?: any;
};
