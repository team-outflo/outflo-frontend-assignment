import { nanoid } from 'nanoid';
import { Lead } from '@/types/leads';
import { getLeadsByListId } from '@/api/leads/leadsApi';
import { GenericApiResponse } from '@/common/api/types';

export const getRandomProfileImage = (): string => {
    const totalImages = 13;
    const randomIndex = Math.floor(Math.random() * totalImages) + 1;
    return `/profileImages/user${randomIndex}.png`;
};

export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


export const transformToLead = (item: any, selectedLinkedInColumn?: string): Lead => {
    // Helper function to find a field by pattern matching
    const findFieldByPattern = (patterns: string[]): string => {
        for (const pattern of patterns) {
            for (const [key, value] of Object.entries(item)) {
                // Check both the original pattern and transformed pattern
                const transformedPattern = pattern.toLowerCase().replace(/\s+/g, '_');
                if ((key.toLowerCase().includes(pattern.toLowerCase()) || 
                     key.toLowerCase().includes(transformedPattern)) && value) {
                    return value as string;
                }
            }
        }
        return '';
    };

    // Helper function to split full name into first and last name
    const splitFullName = (fullName: string) => {
        if (!fullName) return { firstName: 'Unknown', lastName: '' };
        
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length === 1) {
            // For single names, use the name as firstName and leave lastName empty
            return { firstName: nameParts[0], lastName: '' };
        }
        
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' '); // Handle multiple last names
        
        return { firstName, lastName };
    };

    // Extract only the required fields: firstName, lastName, company, location, linkedinUrl
    const fullName = findFieldByPattern(['name', 'full_name', 'fullname']);
    const { firstName, lastName } = fullName ? 
        splitFullName(fullName) : 
        { 
            firstName: item.firstName || findFieldByPattern(['first']) || 'Unknown',
            lastName: item.lastName || findFieldByPattern(['last']) || ''
        };
    
    const company = item.company || findFieldByPattern(['company']);
    const location = item.location || findFieldByPattern(['location', 'city', 'country']);
    
    // Use selected LinkedIn column if provided, otherwise fall back to pattern matching
    console.log('TransformToLead - Item keys:', Object.keys(item));
    console.log('TransformToLead - Selected LinkedIn column:', selectedLinkedInColumn);
    
    const linkedinUrl = selectedLinkedInColumn ? 
        (item[selectedLinkedInColumn] || '') : 
        (item.linkedinUrl || findFieldByPattern(['linkedin', 'profile', 'url']));
    
    console.log('TransformToLead - Found LinkedIn URL:', linkedinUrl);

    // Include all unmapped CSV columns as custom fields
    const customFields: Record<string, any> = {};
    const standardFields = ['id', 'firstName', 'lastName', 'company', 'location', 'linkedinUrl', 'avatar', 'selected'];
    
    Object.entries(item).forEach(([key, value]) => {
        // If the field is not a standard field, include it as a custom field
        if (!standardFields.includes(key) && value !== undefined && value !== '') {
            customFields[key] = value;
        }
    });

    return {
        id: item.id || `imported-${nanoid()}`,
        firstName,
        lastName,
        company,
        location,
        avatar: getRandomProfileImage(),
        selected: false,
        linkedinUrl,
        ...customFields, // Spread all custom fields
    };
};

export const getSampleData = () => [
    { firstName: 'Joseph', lastName: 'Hoban', linkedinUrl: 'https://www.linkedin.com/in/joseph-hoban-6522a4', email: 'joseph@redseal.com', company: 'RedSeal, Inc.', position: 'Advisor to Chief Executive Officer', location: 'Philadelphia, Pennsylvania, United States', industry: 'cybersecurity', keyStrength: 'cybersecurity sales leadership', experience: '15+ years' },
    { firstName: 'Martin', lastName: 'Denard', linkedinUrl: 'https://www.linkedin.com/in/ACoAAA4I7-0BpD0uL_CiYVrSd2iX0fEDzP7Pvi0', email: 'martin@tenica.com', company: 'TENICA Global Solutions', position: 'Assistant Project Manager', location: 'Washington DC-Baltimore Area', industry: 'IT infrastructure', keyStrength: 'incident response expertise', experience: '2+ years' },
    { firstName: 'David', lastName: 'Denick', linkedinUrl: 'https://www.linkedin.com/in/david-denick-5aa633b2', email: 'david@accessnewswire.com', company: 'ACCESS Newswire', position: 'Client Success Manager', location: 'Winter Garden, Florida, United States', industry: 'communications', keyStrength: 'relationship-driven results', experience: '10+ years' },
    { firstName: 'Al', lastName: 'Coronado', linkedinUrl: 'https://www.linkedin.com/in/al-coronado-3708b94', email: 'al@athena.com', company: 'ATHENA Consulting', position: 'Channel Partner', location: 'Irvine, California, United States', industry: 'consulting services', keyStrength: 'consultative selling approach', experience: '12+ years' },
    { firstName: 'Matt', lastName: 'Hudson', linkedinUrl: 'https://www.linkedin.com/in/matthudson1076', email: 'matt@layr.com', company: 'Layr', position: 'Senior Director of Sales', location: 'Austin, Texas Metropolitan Area', industry: 'team development', keyStrength: 'team culture building', experience: '8+ years' }
];

export const getLinkedInUrlPattern = (): RegExp => /linkedin\.com\/in\//i;

// Helper: Check if a value is a valid LinkedIn profile URL (URL only, no extra text)
export const isValidLinkedInUrl = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    
    // Regex to match a complete LinkedIn profile URL (entire string must be the URL)
    // Matches: http://www.linkedin.com/in/username or https://linkedin.com/in/username etc.
    // Allows optional protocol, optional www., and optional trailing slash
    // Rejects any text before or after the URL
    const linkedInUrlPattern = /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+(?:\/)?$/i;
    
    // Check if the entire trimmed value is just a LinkedIn URL
    // This rejects values like "I have a look at http://www.linkedin.com/in/karuna-rao-b239055"
    return linkedInUrlPattern.test(trimmed);
};

// LinkedIn URL detection and validation utilities
// Returns columns with their scores (count of valid LinkedIn URLs)
export const detectLinkedInColumns = (csvData: any[]): string[] => {
    if (!csvData || csvData.length === 0) return [];
    
    const columns = Object.keys(csvData[0]);
    const columnScores: { [key: string]: number } = {};
    
    // Initialize all columns with score 0
    columns.forEach(col => columnScores[col] = 0);
    
    // Scan rows from index 1 to min(20, csv.length)
    // Note: index 1 means the second row (0-indexed), but since header is already parsed,
    // we scan from index 0 to min(20, length) to check first 20 data rows
    const rowsToScan = csvData.length;
    
    for (let i = 0; i < rowsToScan; i++) {
        const row = csvData[i];
        if (!row) continue;
        
        columns.forEach(columnName => {
            const value = row[columnName];
            if (isValidLinkedInUrl(value)) {
                columnScores[columnName] = (columnScores[columnName] || 0) + 1;
            }
        });
    }
    
    // Return columns with count > 0 (potential LinkedIn columns)
    return Object.entries(columnScores)
        .filter(([_, score]) => score > 0)
        .map(([columnName]) => columnName);
};


export const validateLinkedInColumn = (csvData: any[], columnName: string): {
    isValid: boolean;
    validCount: number;
    invalidCount: number;
    invalidUrls: { row: number; url: string }[];
} => {
    const results = {
        isValid: false,
        validCount: 0,
        invalidCount: 0,
        invalidUrls: [] as { row: number; url: string }[]
    };
    
    if (!csvData || csvData.length === 0 || !columnName) {
        return results;
    }
    
    csvData.forEach((row, index) => {
        const url = row[columnName];
        // Better handling of empty/null values - skip them entirely (don't count as invalid)
        if (!url || typeof url !== 'string' || url.trim() === '') {
            return; // Skip empty/null values - they don't count toward validation
        }
        
        const trimmedUrl = url.trim();
        
        // Use the centralized validation function to check if it's a valid LinkedIn URL
        // This ensures consistent validation across the entire codebase
        const isValidLinkedIn = isValidLinkedInUrl(trimmedUrl);
            
        if (isValidLinkedIn) {
            results.validCount++;
        } else {
            results.invalidCount++;
            results.invalidUrls.push({
                row: index + 1,
                url: trimmedUrl
            });
        }
    });
    
    // Consider valid if at least 1 valid LinkedIn URL is found
    results.isValid = results.validCount > 0;
    
    return results;
};

// Get column scores for all columns (used for preselection)
export const getLinkedInColumnScores = (csvData: any[]): { [key: string]: number } => {
    if (!csvData || csvData.length === 0) return {};
    
    const columns = Object.keys(csvData[0]);
    const columnScores: { [key: string]: number } = {};
    
    // Initialize all columns with score 0
    columns.forEach(col => columnScores[col] = 0);
    
    // Scan rows from index 0 to min(20, csv.length)
    const rowsToScan = Math.min(20, csvData.length);
    
    for (let i = 0; i < rowsToScan; i++) {
        const row = csvData[i];
        if (!row) continue;
        
        columns.forEach(columnName => {
            const value = row[columnName];
            if (isValidLinkedInUrl(value)) {
                columnScores[columnName] = (columnScores[columnName] || 0) + 1;
            }
        });
    }
    
    return columnScores;
};

// Find the best LinkedIn column (highest score)
export const findBestLinkedInColumn = (csvData: any[]): string | null => {
    if (!csvData || csvData.length === 0) return null;
    
    const columnScores = getLinkedInColumnScores(csvData);
    
    // Find column with highest score
    let bestColumn: string | null = null;
    let maxScore = 0;
    
    Object.entries(columnScores).forEach(([columnName, score]) => {
        if (score > maxScore) {
            maxScore = score;
            bestColumn = columnName;
        }
    });
    
    // Only return if we found at least 1 match
    return maxScore > 0 ? bestColumn : null;
};

/**
 * Fetches all leads from a lead list with pagination support
 * Automatically fetches all pages in parallel to get complete lead data
 * 
 * @param leadListId - The ID of the lead list to fetch leads from
 * @param pageSize - Number of items per page (default: 100)
 * @returns Promise with all leads, pagination info, and lead list data
 */
export interface FetchLeadsOptions {
    page?: number;
    pageSize?: number;
    fetchAll?: boolean;
}

export const fetchAllLeadsByListId = async (
    leadListId: string,
    options: FetchLeadsOptions = {}
): Promise<{
    leads: any[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    leadList: any;
}> => {
    const {
        fetchAll = false,
        page: providedPage,
        pageSize = 25,
    } = options;

    const shouldFetchAllPages = fetchAll;
    const requestedPage = shouldFetchAllPages ? 1 : providedPage ?? 1;

    // Fetch initial page to get pagination info
    const firstPageResponse = await getLeadsByListId(leadListId, requestedPage, pageSize);
    const firstPageData = firstPageResponse.data as any;
    const pagination = firstPageData?.pagination || { 
        page: requestedPage, 
        pageSize, 
        total: 0, 
        totalPages: 0 
    };
    const leadList = firstPageData?.leadList || null;

    // Collect leads from the requested page
    let collectedLeads = firstPageData?.leads || [];

    if (!shouldFetchAllPages || pagination.totalPages <= 1) {
        return {
            leads: collectedLeads,
            pagination,
            leadList,
        };
    }

    // When fetching all pages, start from the first page regardless of requested page
    const remainingPages = [];
    for (let page = 1; page <= pagination.totalPages; page++) {
        if (page === pagination.page) {
            continue;
        }
        remainingPages.push(getLeadsByListId(leadListId, page, pagination.pageSize));
    }

    if (remainingPages.length > 0) {
        const remainingResponses = await Promise.all(remainingPages);
        remainingResponses.forEach((response) => {
            const pageData = (response.data as any)?.leads || [];
            collectedLeads = [...collectedLeads, ...pageData];
        });
    }

    return {
        leads: collectedLeads,
        pagination,
        leadList,
    };
};