import { useState, useCallback } from 'react';
import { Lead, UploadedFile, VerificationResults } from '@/types/leads';


export const useLeadsState = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [showLeadsGrid, setShowLeadsGrid] = useState(false);
    const [selectedList, setSelectedList] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [showColumnMapping, setShowColumnMapping] = useState(false);
    const [validationComplete, setValidationComplete] = useState(false);
    const [validRowsCount, setValidRowsCount] = useState(0);
    const [parsedCsvData, setParsedCsvData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadInitiated, setUploadInitiated] = useState(false);
    const [verificationResults, setVerificationResults] = useState<VerificationResults | null>(null);
    const [originalCsvCount, setOriginalCsvCount] = useState(0);

    const resetState = useCallback(() => {
        setShowColumnMapping(false);
        setUploadedFile(null);
        setValidationComplete(false);
        setParsedCsvData([]);
        setValidRowsCount(0);
        setUploadInitiated(false);
        setVerificationResults(null);
        setOriginalCsvCount(0);
    }, []);

    const totalCount = originalCsvCount;

    return {
        // State
        leads,
        showLeadsGrid,
        selectedList,
        searchQuery,
        uploadedFile,
        showColumnMapping,
        validationComplete,
        validRowsCount,
        parsedCsvData,
        isLoading,
        isProcessing,
        uploadInitiated,
        verificationResults,
        
        // Computed values
        totalCount,
        
        // Setters
        setLeads,
        setShowLeadsGrid,
        setSelectedList,
        setSearchQuery,
        setUploadedFile,
        setShowColumnMapping,
        setValidationComplete,
        setValidRowsCount,
        setParsedCsvData,
        setIsLoading,
        setIsProcessing,
        setUploadInitiated,
        setVerificationResults,
        setOriginalCsvCount,
        
        // Actions
        resetState,
    };
};
