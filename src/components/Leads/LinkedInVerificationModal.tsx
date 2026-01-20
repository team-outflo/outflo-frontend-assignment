import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Linkedin, X, Upload, ArrowLeft, ChevronDown, FileText, RotateCcw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UploadedFile, VerificationResults } from '@/types/leads';
import { validateLinkedInColumn } from '@/utils/leadsUtils';
import { normalizeToCamelCase } from '@/utils/columnNormalization';

interface LinkedInVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    uploadedFile: UploadedFile | null;
    parsedCsvData: any[];
    validRowsCount: number;
    isLoading: boolean;
    isProcessing: boolean;
    isVerifying: boolean;
    validationComplete: boolean;
    verificationFailed: string | null;
    verificationResults: VerificationResults | null;
    uploadInitiated: boolean;
    detectedLinkedInColumns: string[];
    suggestedLinkedInColumn: string | null;
    onUploadAll: () => void;
    onLinkedInColumnSelected: (columnName: string) => void;
    onReuploadRequest: () => void;
    onValidRowsCountUpdate?: (count: number) => void;
}

export const LinkedInVerificationModal: React.FC<LinkedInVerificationModalProps> = ({
    isOpen,
    onClose,
    uploadedFile,
    parsedCsvData,
    validRowsCount,
    isLoading,
    isProcessing,
    isVerifying,
    validationComplete,
    verificationFailed,
    verificationResults,
    uploadInitiated,
    detectedLinkedInColumns,
    suggestedLinkedInColumn,
    onUploadAll,
    onLinkedInColumnSelected,
    onReuploadRequest,
    onValidRowsCountUpdate,
}) => {
    const [selectedColumn, setSelectedColumn] = useState<string>(suggestedLinkedInColumn || '');
    const [showColumnMapping, setShowColumnMapping] = useState(false);
    const [validationResults, setValidationResults] = useState<Record<string, any>>({});
    const [validationError, setValidationError] = useState<string | null>(null);

    // Update selected column when suggestion changes
    useEffect(() => {
        if (suggestedLinkedInColumn) {
            setSelectedColumn(suggestedLinkedInColumn);
        }
    }, [suggestedLinkedInColumn]);

    // Determine if we need to show column mapping
    useEffect(() => {
        if (isOpen && parsedCsvData.length > 0) {
            const needsMapping = detectedLinkedInColumns.length !== 1;
            setShowColumnMapping(needsMapping);
            
            // Validate ALL columns (not just detected ones) when mapping is needed
            if (needsMapping && parsedCsvData.length > 0) {
                const results: Record<string, any> = {};
                const availableColumns = Object.keys(parsedCsvData[0]);
                
                // Validate all columns to help user choose the best one
                availableColumns.forEach(column => {
                    // Column is already normalized in parsedCsvData
                    results[column] = validateLinkedInColumn(parsedCsvData, column);
                });
                setValidationResults(results);
            } else if (detectedLinkedInColumns.length > 0 && parsedCsvData.length > 0) {
                // If only one detected, validate just that one
                const results: Record<string, any> = {};
                const availableColumns = Object.keys(parsedCsvData[0]);
                
                detectedLinkedInColumns.forEach(column => {
                    // Normalize column name to ensure it matches parsedCsvData format
                    const normalizedColumn = normalizeToCamelCase(column);
                    
                    // Only validate if column exists in parsedCsvData
                    if (availableColumns.includes(normalizedColumn)) {
                        results[column] = validateLinkedInColumn(parsedCsvData, normalizedColumn);
                    } else if (availableColumns.includes(column)) {
                        // Also try without normalization in case it's already normalized
                        results[column] = validateLinkedInColumn(parsedCsvData, column);
                    }
                });
                setValidationResults(results);
            }
        }
    }, [isOpen, parsedCsvData, detectedLinkedInColumns]);
    // Auto-upload when LinkedIn URLs are detected and validation is complete (only if no mapping needed)
    useEffect(() => {
        if (isOpen && validationComplete  && !verificationFailed && !isProcessing && !isVerifying && !uploadInitiated && !showColumnMapping) {
            const timer = setTimeout(() => {
                onUploadAll();
            }, 1500);
            
            return () => clearTimeout(timer);
        }
    }, [isOpen, validationComplete, validRowsCount, verificationFailed, isProcessing, isVerifying, uploadInitiated, showColumnMapping, onUploadAll, detectedLinkedInColumns, suggestedLinkedInColumn]);

    // Auto-close modal after successful processing
    useEffect(() => {
        if (isOpen && !isProcessing && !isVerifying && uploadInitiated && validationComplete) {
            const timer = setTimeout(() => {
                onClose();
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [isOpen, isProcessing, isVerifying, uploadInitiated, validationComplete, onClose]);

    // Handle column selection confirmation
    const handleColumnConfirm = () => {
        if (selectedColumn) {
            // Clear any previous validation error immediately
            setValidationError(null);
            
            // Normalize the selected column to camelCase to match parsedCsvData format
            const normalizedColumn = normalizeToCamelCase(selectedColumn);
            
            // Check if column exists in parsedCsvData
            if (parsedCsvData.length > 0) {
                const availableColumns = Object.keys(parsedCsvData[0]);
                const columnToUse = availableColumns.includes(normalizedColumn) 
                    ? normalizedColumn 
                    : (availableColumns.includes(selectedColumn) ? selectedColumn : normalizedColumn);
                
                // Validate the selected column has valid LinkedIn URLs using normalized name
                const validationResult = validateLinkedInColumn(parsedCsvData, columnToUse);
                
                if (!validationResult.isValid || validationResult.validCount === 0) {
                    setValidationError(`The selected column "${selectedColumn}" does not contain any valid LinkedIn URLs. Please select a different column.`);
                    return;
                }
                
                // Update validRowsCount to the number of valid LinkedIn URLs in selected column
                if (onValidRowsCountUpdate) {
                    onValidRowsCountUpdate(validationResult.validCount);
                }
                
                // Pass the normalized column name to ensure consistency
                onLinkedInColumnSelected(columnToUse);
                setShowColumnMapping(false);
            }
        }
    };



    // Get all available columns for manual mapping
    const getAllColumns = () => {
        if (parsedCsvData.length === 0) return [];
        return Object.keys(parsedCsvData[0]).filter(col => col && col.trim() !== '');
    };

    if (!uploadedFile) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onReuploadRequest}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-3">
                        <Linkedin className="w-6 h-6 text-blue-600" />
                        <span>LinkedIn Column Mapping</span>
                    </DialogTitle>
                    <DialogDescription>
                        Select which column in your CSV file contains LinkedIn profile URLs.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* File Information Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{uploadedFile.name}</h3>
                                    <p className="text-sm text-gray-500">{parsedCsvData.length} rows</p>
                                </div>
                            </div>
                            {/* {!isProcessing && !isVerifying && !(validationComplete && !verificationFailed) && ( */}
                             {showColumnMapping && !isLoading && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={onReuploadRequest}
                                    className="flex items-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Change file
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Validation Messages */}
                    {showColumnMapping && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <span className="text-sm text-blue-700">
                                {detectedLinkedInColumns.length === 0 
                                    ? "Please select which column contains LinkedIn profile URLs from your CSV file."
                                    : detectedLinkedInColumns.length > 1
                                    ? "Multiple LinkedIn columns detected. Please select which column to use as the main identifier."
                                    : "Please confirm the LinkedIn column selection."}
                            </span>
                        </div>
                    )}

                    {/* Column Mapping Interface */}
                    {showColumnMapping && (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">
                                    Select the column containing LinkedIn profile URLs:
                                </Label>
                                <div className="w-full">
                                    <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select LinkedIn column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAllColumns().map((column) => {
                                                const validationResult = validationResults[column];
                                                const isValid = validationResult?.validCount > 0;
                                                const validCount = validationResult?.validCount || 0;
                                                const isBest = suggestedLinkedInColumn === column;
                                                
                                                return (
                                                    <SelectItem key={column} value={column}>
                                                        <span className={isBest ? "font-semibold" : ""}>
                                                            {column}
                                                            {isBest && " ⭐"}
                                                            {isValid && ` (${validCount} valid)`}
                                                            {!isValid && validationResult && " (No valid URLs)"}
                                                        </span>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {suggestedLinkedInColumn && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        💡 Recommended: <span className="font-semibold">{suggestedLinkedInColumn}</span> (highest match score)
                                    </p>
                                )}
                            </div>
                            
                            {/* Show validation info for selected column */}
                            {selectedColumn && validationResults[selectedColumn] && (
                                <div className={`p-3 border rounded-lg ${
                                    validationResults[selectedColumn].validCount > 0 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-amber-50 border-amber-200'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${
                                            validationResults[selectedColumn].validCount > 0 
                                                ? 'text-green-700' 
                                                : 'text-amber-700'
                                        }`}>
                                            Column "{selectedColumn}": {validationResults[selectedColumn].validCount} valid LinkedIn URL{validationResults[selectedColumn].validCount !== 1 ? 's' : ''} found
                                        </span>
                                    </div>
                                    {validationResults[selectedColumn].invalidCount > 0 && (
                                        <p className={`text-xs mt-1 ${
                                            validationResults[selectedColumn].validCount > 0 
                                                ? 'text-green-600' 
                                                : 'text-amber-600'
                                        }`}>
                                            {validationResults[selectedColumn].invalidCount} invalid URL{validationResults[selectedColumn].invalidCount !== 1 ? 's' : ''} will be filtered out
                                        </p>
                                    )}
                                    {validationResults[selectedColumn].validCount === 0 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Please select a column that contains valid LinkedIn profile URLs.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Show validation error */}
                            {validationError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        <span className="text-sm text-red-700">{validationError}</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={onReuploadRequest}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleColumnConfirm}
                                    disabled={!selectedColumn || (selectedColumn && validationResults[selectedColumn] && validationResults[selectedColumn].validCount === 0)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {selectedColumn && validationResults[selectedColumn]?.validCount > 0
                                        ? `Continue with "${selectedColumn}"`
                                        : 'Continue'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Processing Status */}
                    {!showColumnMapping && isLoading && (
                        <div className="flex items-center space-x-3 text-blue-600 p-4 bg-blue-50 rounded-lg">
                            <div className="animate-spin">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <span className="text-sm font-medium">Processing CSV data...</span>
                        </div>
                    )}

                    {/* LinkedIn Detection Status */}
                    {!showColumnMapping && validationComplete && !verificationFailed && (
                        <div className="flex items-center space-x-3 text-green-600 p-4 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">
                                Detected {validRowsCount} leads with LinkedIn URLs
                                {!isProcessing && !isVerifying && ' - Uploading...'}
                            </span>
                        </div>
                    )}

                    {/* Processing Status */}
                    {!showColumnMapping && isProcessing && (
                        <div className="flex items-center space-x-3 text-blue-600 p-4 bg-blue-50 rounded-lg">
                            <div className="animate-spin">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <div>
                                <div className="font-medium text-sm">Processing {validRowsCount} leads...</div>
                                <div className="text-xs">This may take a moment</div>
                            </div>
                        </div>
                    )}

                    {/* Verification Results */}
                    {!showColumnMapping && verificationResults && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800 flex items-center mb-2">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Processing Complete
                            </h3>
                            <div className="text-sm text-blue-700 space-y-1">
                                <p>✓ {verificationResults.urlsVerified.valid} valid LinkedIn URLs processed</p>
                                {verificationResults.urlsVerified.invalid > 0 && (
                                    <p>⚠ {verificationResults.urlsVerified.invalid} invalid URLs filtered out</p>
                                )}
                                {verificationResults.deduplication && verificationResults.deduplication.duplicatesRemoved > 0 && (
                                    <p>🔄 {verificationResults.deduplication.duplicatesRemoved} duplicate leads removed</p>
                                )}
                                <p>📊 {verificationResults.deduplication?.finalCount || parsedCsvData.length} final leads ready</p>
                            </div>
                        </div>
                    )}

                    {/* Verification Failure */}
                    {!showColumnMapping && verificationFailed && (
                        <div className="flex items-start space-x-3 text-red-600 bg-red-50 p-4 rounded-lg">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">LinkedIn Verification Failed</p>
                                <p className="text-xs mt-1">{verificationFailed}</p>
                                <p className="text-xs mt-2">
                                    Please ensure your CSV contains valid LinkedIn profile URLs.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {!showColumnMapping && uploadInitiated && !isProcessing && validationComplete && (
                        <div className="flex items-center space-x-3 text-green-600 p-4 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                                <div className="font-medium text-sm">Leads Successfully Imported!</div>
                                <div className="text-xs">Redirecting to leads view...</div>
                            </div>
                        </div>
                    )}

                    {/* Manual Action Button (only shown if auto-upload fails or is disabled) */}
                    {!showColumnMapping && verificationFailed && (
                        <div className="flex justify-end pt-4 border-t">
                            <Button variant="outline" onClick={onReuploadRequest}>
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
