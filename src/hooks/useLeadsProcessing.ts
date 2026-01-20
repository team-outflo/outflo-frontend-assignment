import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { transformToLead, getRandomProfileImage, isValidLinkedInUrl } from '@/utils/leadsUtils';
import { UploadedFile, LeadsData, VerificationResults } from '@/types/leads';
import { nanoid } from 'nanoid';
import { isValidLinkedInProfileUrl, isValidCompanyLinkedInProfileUrl } from 'lib-linkedin-url';

interface UseLeadsProcessingProps {
    uploadedFile: UploadedFile | null;
    parsedCsvData: any[];
    setLeads: (leads: any[]) => void;
    setShowLeadsGrid: (show: boolean) => void;
    setShowColumnMapping: (show: boolean) => void;
    setIsProcessing: (processing: boolean) => void;
    setUploadInitiated: (initiated: boolean) => void;
    setVerificationResults: (results: VerificationResults | null) => void;
    setOriginalCsvCount: (count: number) => void;
    updateLeads?: (leads: any) => void;
    selectedLinkedInColumn?: string;
}

export const useLeadsProcessing = ({
    uploadedFile,
    parsedCsvData,
    setLeads,
    setShowLeadsGrid,
    setShowColumnMapping,
    setIsProcessing,
    setUploadInitiated,
    setVerificationResults,
    setOriginalCsvCount,
    updateLeads,
    selectedLinkedInColumn
}: UseLeadsProcessingProps) => {
    const { toast } = useToast();
    const { setLeadsData } = useCampaignStore();

    // LinkedIn URL verification function - uses only actual CSV column names
    const verifyLinkedInUrls = useCallback(async (csvData: any[]): Promise<VerificationResults> => {
        const urlVerificationResults = {
            valid: 0,
            invalid: 0,
            invalidUrls: [] as { row: number, url: string }[]
        };

        if (csvData.length === 0) {
            return {
                urlsVerified: urlVerificationResults,
                customVariables: { present: 0, missing: 0, empty: 0 },
                columnCompleteness: {},
                deduplication: { originalCount: 0, duplicatesRemoved: 0, finalCount: 0 },
                completed: true
            };
        }

        // Get actual column names from the CSV data
        const actualColumns = Object.keys(csvData[0]);
        console.log('Actual CSV columns for verification:', actualColumns);

        // Find columns that might contain LinkedIn URLs by checking their content
        const potentialLinkedInColumns: string[] = [];
        
        actualColumns.forEach(columnName => {
            // Check first few rows to see if this column contains LinkedIn URLs
            const sampleValues = csvData.slice(0, Math.min(5, csvData.length))
                .map(row => row[columnName])
                .filter(value => value && typeof value === 'string');
            
            // Check if any sample values look like LinkedIn URLs
            // Use the centralized validation function for consistent validation
            const hasLinkedInUrls = sampleValues.some(value => 
                isValidLinkedInUrl(value)
            );
            
            if (hasLinkedInUrls) {
                potentialLinkedInColumns.push(columnName);
            }
        });

        console.log('Potential LinkedIn URL columns found:', potentialLinkedInColumns);

        // If no LinkedIn columns detected, check all columns for any URL-like content
        if (potentialLinkedInColumns.length === 0) {
            actualColumns.forEach(columnName => {
                const sampleValues = csvData.slice(0, Math.min(3, csvData.length))
                    .map(row => row[columnName])
                    .filter(value => value && typeof value === 'string');
                
                const hasUrls = sampleValues.some(value => 
                    value.includes('http') || value.includes('www.') || value.includes('.com')
                );
                
                if (hasUrls) {
                    potentialLinkedInColumns.push(columnName);
                }
            });
        }

        csvData.forEach((row, rowIndex) => {
            let rowValid = false;

            potentialLinkedInColumns.forEach(columnName => {
                const url = row[columnName];

                if (!url || url.trim() === '') {
                    return;
                }

                let normalizedUrl = url.trim();
                if (!/^https?:\/\//i.test(normalizedUrl)) {
                    normalizedUrl = 'https://' + normalizedUrl;
                }

                const isValid = isValidLinkedInProfileUrl(normalizedUrl) ||
                    isValidCompanyLinkedInProfileUrl(normalizedUrl);

                if (isValid) {
                    urlVerificationResults.valid++;
                    rowValid = true;
                } else {
                    urlVerificationResults.invalid++;
                    urlVerificationResults.invalidUrls.push({
                        row: rowIndex + 1,
                        url: url
                    });
                }
            });
        });

        return {
            urlsVerified: urlVerificationResults,
            customVariables: { present: csvData.length, missing: 0, empty: 0 },
            columnCompleteness: {},
            deduplication: { originalCount: csvData.length, duplicatesRemoved: 0, finalCount: csvData.length },
            completed: true
        };
    }, []);

    // Deduplicate leads based on mainIdentifier (LinkedIn URL)
    const deduplicateLeads = useCallback((data: any[], mainIdentifierColumn?: string) => {
        if (!mainIdentifierColumn || data.length === 0) {
            return data;
        }

        // Transform the mainIdentifier column name to match the processed data format
        const transformedMainIdentifierColumn = mainIdentifierColumn.toLowerCase().replace(/\s+/g, '_');
        
        const seen = new Set<string>();
        const deduplicatedData: any[] = [];
        let duplicatesRemoved = 0;

        data.forEach((row, index) => {
            const identifier = row[transformedMainIdentifierColumn];
            
            if (!identifier || identifier.trim() === '') {
                // Keep rows without identifiers (they'll be filtered out later anyway)
                deduplicatedData.push(row);
                return;
            }

            // Normalize the identifier for comparison
            let normalizedIdentifier = identifier.trim();
            if (!/^https?:\/\//i.test(normalizedIdentifier)) {
                normalizedIdentifier = 'https://' + normalizedIdentifier;
            }

            if (!seen.has(normalizedIdentifier)) {
                seen.add(normalizedIdentifier);
                deduplicatedData.push(row);
            } else {
                duplicatesRemoved++;
                console.log(`Duplicate found at row ${index + 1}: ${identifier}`);
            }
        });

        console.log(`Deduplication complete: ${duplicatesRemoved} duplicates removed from ${data.length} total rows`);
        return deduplicatedData;
    }, []);

    // Process CSV data directly on frontend
    const handleUploadAll = useCallback(async () => {
        // Basic validation
        if (!uploadedFile?.fileObject || !parsedCsvData.length) {
            toast({
                variant: "destructive",
                title: "No data to process",
                description: "Please upload a valid CSV file first.",
            });
            return;
        }

        try {
            setUploadInitiated(true);
            setIsProcessing(true);

            // Set the original CSV count
            setOriginalCsvCount(parsedCsvData.length);

            // First, perform LinkedIn URL verification
            const verificationResults = await verifyLinkedInUrls(parsedCsvData);
            setVerificationResults(verificationResults);

            // Process the CSV data directly on the frontend using actual column names
            const processedData = parsedCsvData.map((row, index) => {
                // Get actual column names from the CSV
                const actualColumns = Object.keys(row);
                
                // Create a processed row with all the data using actual column names
                // Only add system fields that are not part of the CSV data
                const processedRow: Record<string, any> = {
                    id: `imported-${nanoid()}`,
                };

                // Preserve all original CSV columns as unique variables with DB-friendly transformation
                actualColumns.forEach(columnName => {
                    // Apply basic transformation: toLowerCase and replace spaces with underscores
                    const transformedColumnName = columnName.toLowerCase().replace(/\s+/g, '_');
                    processedRow[transformedColumnName] = row[columnName] || '';
                });

                return processedRow;
            });

            // Deduplicate based on mainIdentifier (LinkedIn URL)
            const deduplicatedData = deduplicateLeads(processedData, selectedLinkedInColumn);
            const duplicatesRemoved = processedData.length - deduplicatedData.length;
            console.log('Deduplication results:', {
                original: processedData.length,
                deduplicated: deduplicatedData.length,
                duplicatesRemoved: duplicatesRemoved
            });

            // Update verification results with deduplication statistics
            const updatedVerificationResults = {
                ...verificationResults,
                deduplication: {
                    originalCount: processedData.length,
                    duplicatesRemoved: duplicatesRemoved,
                    finalCount: deduplicatedData.length
                }
            };
            setVerificationResults(updatedVerificationResults);

            // Convert deduplicated data to Lead format and filter only valid LinkedIn leads during processing
            console.log('Processing leads, total rows after deduplication:', deduplicatedData.length);
            console.log('Sample processed row:', deduplicatedData[0]);
            console.log('Selected LinkedIn column:', selectedLinkedInColumn);
            
            // Transform the selectedLinkedInColumn to match the processed data format
            const transformedLinkedInColumn = selectedLinkedInColumn ? 
                selectedLinkedInColumn.toLowerCase().replace(/\s+/g, '_') : 
                undefined;
            
            console.log('Transformed LinkedIn column:', transformedLinkedInColumn);
            
            const transformedLeads = deduplicatedData.map((item: any) => {
                const lead = transformToLead(item, transformedLinkedInColumn);
                console.log('Transformed lead:', lead);
                return lead;
            });
            
            console.log('All transformed leads:', transformedLeads);
            
            const validLinkedInLeads = transformedLeads.filter(lead => {
                console.log('Checking lead:', lead.firstName, lead.lastName, 'LinkedIn URL:', lead.linkedinUrl);
                
                if (!lead.linkedinUrl) {
                    console.log('No LinkedIn URL found for lead:', lead.firstName, lead.lastName);
                    return false;
                }
                    
                    // Normalize URL
                    let normalizedUrl = lead.linkedinUrl.trim();
                    if (!/^https?:\/\//i.test(normalizedUrl)) {
                        normalizedUrl = 'https://' + normalizedUrl;
                    }
                
                const isValidProfile = isValidLinkedInProfileUrl(normalizedUrl);
                const isValidCompany = isValidCompanyLinkedInProfileUrl(normalizedUrl);
                const isValid = isValidProfile || isValidCompany;
                
                console.log('URL validation:', {
                    original: lead.linkedinUrl,
                    normalized: normalizedUrl,
                    isValidProfile,
                    isValidCompany,
                    isValid
                });
                
                return isValid;
            });
            
            console.log('Valid LinkedIn leads count:', validLinkedInLeads.length);

            // Update the local leads state with only valid LinkedIn leads
            setLeads(validLinkedInLeads);

            // Create leads data object for store - only store valid LinkedIn leads
            const leadsData: LeadsData = {
                file: uploadedFile.fileObject,
                fileName: uploadedFile.name,
                data: validLinkedInLeads,
                rowCount: validLinkedInLeads.length,
                s3Url: null, // Will be preserved by setLeadsData function
                uploadedAt: new Date().toISOString()
            };

            // Update parent and store
            if (updateLeads) {
                updateLeads(leadsData);
            }
            setLeadsData(leadsData);

            const deduplicationMessage = duplicatesRemoved > 0 
                ? ` (${duplicatesRemoved} duplicates removed)`
                : '';
            
            toast({
                title: "Leads Successfully Imported",
                description: `${validLinkedInLeads.length} valid LinkedIn leads are ready for your campaign${deduplicationMessage}.`,
            });

            setShowLeadsGrid(true);
            setShowColumnMapping(false);

        } catch (error) {
            console.error('Error processing CSV data:', error);
            toast({
                variant: "destructive",
                title: "Error processing data",
                description: error instanceof Error ? error.message : "An unknown error occurred",
            });
        } finally {
            setIsProcessing(false);
        }
    }, [uploadedFile, parsedCsvData, toast, setIsProcessing, setUploadInitiated, setLeads, setLeadsData, updateLeads, setShowLeadsGrid, setShowColumnMapping, setVerificationResults, setOriginalCsvCount, verifyLinkedInUrls, deduplicateLeads, selectedLinkedInColumn]);

    return {
        handleUploadAll
    };
};
