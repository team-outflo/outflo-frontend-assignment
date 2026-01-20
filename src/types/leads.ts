export interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
    location?: string;
    avatar: string;
    selected: boolean;
    linkedinUrl?: string;
}

export interface UploadedFile {
    name: string;
    size: string;
    processed: boolean;
    fileObject?: File;
}

export interface ColumnMapping {
    columnName: string;
    type: string;
    samples: string[];
}

export interface VerificationResults {
    urlsVerified: {
        valid: number;
        invalid: number;
        invalidUrls: { row: number; url: string }[];
    };
    customVariables: {
        present: number;
        missing: number;
        empty: number;
    };
    columnCompleteness: Record<string, {
        missing: number;
        missingRows: number[];
    }>;
    deduplication: {
        originalCount: number;
        duplicatesRemoved: number;
        finalCount: number;
    };
    completed: boolean;
    error?: string;
}

export interface VerifySettings {
    checkDuplicates: {
        campaigns: boolean;
        lists: boolean;
        workspace: boolean;
    };
    verifyLeads: boolean;
}

export interface LeadsData {
    file: File | null;
    fileName?: string;
    data: any[];
    rowCount: number;
    s3Url?: string | null;
    uploadedAt: string;
    leadListId?: string;
}

export interface ListOfLeadsProps {
    leadData?: any;
    updateLeads: (leads: any) => void;
    viewMode?: boolean;
    onMappingStateChange?: (isMapping: boolean) => void;
}

export interface TypeOption {
    value: string;
    label: string;
    icon: string;
}