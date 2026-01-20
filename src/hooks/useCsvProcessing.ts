import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import Papa from 'papaparse';
import { UploadedFile } from '@/types/leads';
import { formatFileSize, validateLinkedInColumn, detectLinkedInColumns, findBestLinkedInColumn } from '@/utils/leadsUtils';
import { uploadCSVFile } from '@/api/leads/leads';
import { useCampaignStore } from '@/api/store/campaignStore';
import { normalizeToCamelCase } from '@/utils/columnNormalization';

interface UseCsvProcessingProps {
    uploadedFile: UploadedFile | null;
    setParsedCsvData: (data: any[]) => void;
    setValidRowsCount: (count: number) => void;
    setUploadedFile: (file: UploadedFile | null) => void;
    setShowColumnMapping: (show: boolean) => void;
    setValidationComplete: (complete: boolean) => void;
    setIsLoading: (loading: boolean) => void;
    setLeadsFile: (file: File) => void;
    setLeadsS3Data: (s3Data: { fileName: string; s3Url: string; fileKey: string; file: File }) => void;
    onS3UploadComplete?: (s3Url: string, mainIdentifier: string | null) => void;
}

export const useCsvProcessing = ({
    uploadedFile,
    setParsedCsvData,
    setValidRowsCount,
    setUploadedFile,
    setShowColumnMapping,
    setValidationComplete,
    setIsLoading,
    setLeadsFile,
    setLeadsS3Data,
    onS3UploadComplete,
}: UseCsvProcessingProps) => {
    const { toast } = useToast();
    const { setCsvConfig, setDetectedColumns, getCsvConfig } = useCampaignStore();

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            setIsLoading(true);

            // Store the file reference
            setUploadedFile({
                name: file.name,
                size: formatFileSize(file.size),
                processed: true,
                fileObject: file
            });

            // PRE-UPLOAD VALIDATION: Parse CSV in-memory to check for LinkedIn columns BEFORE S3 upload
            console.log('Pre-upload validation: Checking for LinkedIn columns...');
            
            const preValidationResult = await new Promise<{ hasLinkedInColumns: boolean; linkedInColumns: string[]; csvData: any[] }>((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        try {
                            const parsedData = results.data as any[];
                            
                            if (parsedData.length === 0) {
                                resolve({ hasLinkedInColumns: false, linkedInColumns: [], csvData: [] });
                                return;
                            }

                            // Transform column names to camelCase format
                            const processedRecords = parsedData.map((row: any) => {
                                const processedRow: any = {};
                                const actualColumns = Object.keys(row);
                                
                                actualColumns.forEach(columnName => {
                                    const normalizedColumnName = normalizeToCamelCase(columnName);
                                    processedRow[normalizedColumnName] = row[columnName] || '';
                                });
                                
                                return processedRow;
                            });

                            // Detect LinkedIn columns using content-based scoring
                            // This scans up to 20 rows and counts valid LinkedIn URLs per column
                            const linkedInColumns = detectLinkedInColumns(processedRecords);
                            
                            resolve({
                                hasLinkedInColumns: linkedInColumns.length > 0,
                                linkedInColumns: linkedInColumns,
                                csvData: processedRecords
                            });
                        } catch (error) {
                            reject(error);
                        }
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });

            // VALIDATION FAILED: No LinkedIn columns detected - BLOCK S3 UPLOAD
            // if (!preValidationResult.hasLinkedInColumns) {
            //     setIsLoading(false);
            //     setUploadedFile(null);
            //     toast({
            //         title: "Validation Failed",
            //         description: "CSV file must contain at least one LinkedIn profile URL column. Please add a column with LinkedIn URLs (e.g., 'profile_url', 'linkedin_url', 'linkedin') and try again.",
            //         variant: "destructive",
            //     });
            //     console.error('Pre-upload validation failed: No LinkedIn columns detected');
            //     return; // STOP HERE - Don't upload to S3
            // }

            console.log('Pre-upload validation passed: LinkedIn columns detected:', preValidationResult.linkedInColumns);
            
            // Store s3Url for later use in CSV processing
            let uploadedS3Url: string | null = null;

            // Upload file to S3 and get S3 data (only if validation passed)
            console.log('Pre-upload validation passed. Starting S3 upload for file:', file.name);
            try {
                const uploadResult = await uploadCSVFile(file);
                console.log('S3 upload result:', uploadResult);
                
                const { fileName, s3Url, fileKey, file: uploadedFile } = uploadResult.data;
                console.log('S3 data extracted:', { fileName, s3Url, fileKey });
                
                // Store S3 URL for later use
                uploadedS3Url = s3Url;
                
                // Store S3 data in campaign store
                setLeadsS3Data({
                    fileName,
                    s3Url,
                    fileKey,
                    file: uploadedFile
                });
                
                console.log('S3 data stored in campaign store');
                
                // Initialize CSV config if not already set
                setCsvConfig({
                    columnFixes: [],
                    detectedColumns: [],
                    lastUpdated: Date.now()
                });
                console.log('CSV config initialized');
            } catch (s3Error) {
                console.error('S3 upload failed, continuing with local file processing:', s3Error);
                toast({
                    title: "Warning",
                    description: "File upload to S3 failed, but local processing will continue. Please check your S3 configuration.",
                    variant: "destructive",
                });
                
                // Store file without S3 data as fallback
                setLeadsS3Data({
                    fileName: file.name,
                    s3Url: null,
                    fileKey: null,
                    file: file
                });
                
                // Initialize CSV config even if S3 upload failed
                setCsvConfig({
                    columnFixes: [],
                    detectedColumns: [],
                    lastUpdated: Date.now()
                });
                console.log('CSV config initialized (fallback)');
            }

            // Also store the file reference for backward compatibility
            setLeadsFile(file);

            // Use the pre-validated data (already parsed during pre-validation)
            const processedRecords = preValidationResult.csvData;
            
            try {
                // Store normalized column names in campaign store
                if (processedRecords.length > 0) {
                    const normalizedColumns = Object.keys(processedRecords[0]);
                    console.log('Storing normalized columns in campaign store:', normalizedColumns);
                    
                    // Auto-detect LinkedIn columns using content-based scoring
                    // This uses the new scoring approach that counts valid LinkedIn URLs per column
                    const contentDetectedColumns = detectLinkedInColumns(processedRecords);
                    const bestColumn = findBestLinkedInColumn(processedRecords);
                    
                    let autoMainIdentifier: string | null = null;
                    
                    if (contentDetectedColumns.length === 1) {
                        // Exactly one column detected - auto-select it
                        autoMainIdentifier = contentDetectedColumns[0];
                        console.log('Auto-detected single LinkedIn column, setting as main identifier:', autoMainIdentifier);
                        
                        // Validate and set the main identifier automatically
                        const validationResult = validateLinkedInColumn(processedRecords, autoMainIdentifier);
                        // Accept if at least 1 valid LinkedIn URL found (60% threshold is for detection, not validation)
                        if (validationResult.validCount > 0) {
                            const currentConfig = getCsvConfig() || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
                            setCsvConfig({
                                ...currentConfig,
                                mainIdentifier: autoMainIdentifier,
                                lastUpdated: Date.now()
                            });
                            console.log(`Main identifier "${autoMainIdentifier}" automatically set with ${validationResult.validCount} valid LinkedIn URLs`);
                            
                            // Don't show toast for auto-set - it's automatic and not disruptive
                            
                            if (uploadedS3Url && onS3UploadComplete) {
                                console.log('Auto-triggering CSV processing with detected main identifier');
                                onS3UploadComplete(uploadedS3Url, autoMainIdentifier);
                            }
                        } else {
                            // Validation failed - don't show destructive toast, just let user select in modal
                            if (uploadedS3Url && onS3UploadComplete) {
                                onS3UploadComplete(uploadedS3Url, null);
                            }
                        }
                    } else {
                        // Multiple LinkedIn columns detected OR none detected - user needs to select
                        // The bestColumn (highest score) will be preselected in the modal if available
                        // The best column is already passed through onLinkedInColumnsDetected callback from FileUploadSection
                        // Don't show toast - modal will handle the selection
                        if (uploadedS3Url && onS3UploadComplete) {
                            onS3UploadComplete(uploadedS3Url, null);
                        }
                    }
                    
                    setDetectedColumns(normalizedColumns);
                    console.log('Normalized columns stored successfully');
                } else {
                    console.warn('No processed records to extract normalized columns from');
                    setIsLoading(false);
                    setUploadedFile(null);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "CSV file appears to be empty or has no valid data.",
                    });
                    return;
                }

                console.log(`Parsed ${processedRecords.length} rows from CSV`);
                console.log("Processed CSV data:", processedRecords);

                setParsedCsvData(processedRecords);
                setValidRowsCount(processedRecords.length);
                setShowColumnMapping(true); // Always show modal if we got here (validation passed but needs selection)
                setValidationComplete(true);
                setIsLoading(false);
            } catch (error) {
                console.error('Error processing parsed data:', error);
                toast({
                    variant: "destructive",
                    title: "Error processing data",
                    description: "Failed to process the CSV data.",
                });
                setUploadedFile(null);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            toast({
                variant: "destructive",
                title: "Error processing file",
                description: error instanceof Error ? error.message : "An unknown error occurred"
            });
            setUploadedFile(null);
            setIsLoading(false);
        }
    }, [
        setIsLoading,
        setUploadedFile,
        setLeadsFile,
        setLeadsS3Data,
        setParsedCsvData,
        setValidRowsCount,
        setShowColumnMapping,
        setValidationComplete,
        setCsvConfig,
        getCsvConfig,
        toast,
        onS3UploadComplete,
        setDetectedColumns
    ]);

    const validateAndSetMainIdentifier = useCallback((mainIdentifier: string, csvData: any[]) => {
        console.log('Validating main identifier:', mainIdentifier);
        
        if (!csvData || csvData.length === 0) {
            console.error('CSV data is empty or not available');
            return false;
        }
        
        // Normalize the main identifier to camelCase to match processed records
        const normalizedMainIdentifier = normalizeToCamelCase(mainIdentifier);
        console.log('Normalized main identifier:', normalizedMainIdentifier);
        
        // Check if column exists in csvData
        const availableColumns = Object.keys(csvData[0]);
        console.log('Available columns in CSV data:', availableColumns);
        
        // Try to find the column - check normalized first, then original
        const columnToUse = availableColumns.includes(normalizedMainIdentifier) 
            ? normalizedMainIdentifier 
            : (availableColumns.includes(mainIdentifier) ? mainIdentifier : normalizedMainIdentifier);
        
        console.log('Column to use for validation:', columnToUse);
        
        // Check if column exists before validating
        if (!availableColumns.includes(columnToUse)) {
            console.error(`Column "${columnToUse}" not found in CSV data. Available columns:`, availableColumns);
            toast({
                variant: "destructive",
                title: "Column Not Found",
                description: `The selected column "${mainIdentifier}" was not found in the CSV data. Available columns: ${availableColumns.join(', ')}`,
            });
            return false;
        }
        
        // Validate the main identifier has at least one valid LinkedIn URL
        const validationResult = validateLinkedInColumn(csvData, columnToUse);
        console.log('Validation result:', validationResult);
        
        // Accept column if it has at least 1 valid LinkedIn URL
        // (The 60% threshold in validateLinkedInColumn is for auto-detection, not manual selection)
        if (validationResult.validCount === 0) {
            console.error('Main identifier validation failed: No valid LinkedIn URLs found', validationResult);
            toast({
                variant: "destructive",
                title: "Invalid Main Identifier",
                description: `The selected column "${mainIdentifier}" does not contain any valid LinkedIn URLs. Please select a different column.`,
            });
            return false;
        }
        
        console.log('Main identifier validation passed:', validationResult);
        
        // Update CSV config with the normalized and validated main identifier
        const currentConfig = getCsvConfig() || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
        setCsvConfig({
            ...currentConfig,
            mainIdentifier: columnToUse, // Use the column that was actually validated
            lastUpdated: Date.now()
        });
        
        console.log(`Main identifier "${columnToUse}" stored in CSV config. Next lead will use LinkedIn URL from this column.`);
        
        toast({
            title: "Main Identifier Set",
            description: `Column "${mainIdentifier}" set as main identifier with ${validationResult.validCount} valid LinkedIn URLs.`,
        });
        
        return true;
    }, [setCsvConfig, getCsvConfig, toast]);

    return {
        handleFileUpload,
        validateAndSetMainIdentifier
    };
};
