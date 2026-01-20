import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUploadSection } from '@/components/Leads/FileUploadSection';
import { LinkedInVerificationModal } from '@/components/Leads/LinkedInVerificationModal';
import { ProcessingStatusIndicator } from './ProcessingStatusIndicator';
import { UploadedFile } from '@/types/leads';

interface CSVImportModalProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    isProcessing: boolean;
    isProcessingStatus: boolean;
    isLoading: boolean;
    uploadedFile: UploadedFile | null;
    showColumnMapping: boolean;
    parsedCsvData: any[];
    validRowsCount: number;
    validationComplete: boolean;
    uploadInitiated: boolean;
    detectedLinkedInColumns: string[];
    suggestedLinkedInColumn: string | null;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onLinkedInColumnConfirmed: (columnName: string, csvData: any[]) => void;
    onLinkedInColumnsDetected: (detectedColumns: string[], suggestedColumn: string | null, csvData: any[]) => void;
    onLinkedInColumnSelected: (columnName: string) => void;
    onUploadAll: () => void;
    onReuploadRequest: () => void;
    onModalClose: () => void;
    onValidRowsCountUpdate?: (count: number) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
    isOpen,
    onClose,
    isProcessing,
    isProcessingStatus,
    isLoading,
    uploadedFile,
    showColumnMapping,
    parsedCsvData,
    validRowsCount,
    validationComplete,
    uploadInitiated,
    detectedLinkedInColumns,
    suggestedLinkedInColumn,
    onFileUpload,
    onLinkedInColumnConfirmed,
    onLinkedInColumnsDetected,
    onLinkedInColumnSelected,
    onUploadAll,
    onReuploadRequest,
    onModalClose,
    onValidRowsCountUpdate
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Leads from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {isProcessingStatus && (
                        <ProcessingStatusIndicator message="Processing your CSV file. This may take a few moments..." />
                    )}
                    <FileUploadSection 
                        onFileUpload={onFileUpload} 
                        onLinkedInColumnConfirmed={onLinkedInColumnConfirmed}
                        onLinkedInColumnsDetected={onLinkedInColumnsDetected}
                        isUploading={isLoading}
                    />

                    <LinkedInVerificationModal
                        isOpen={showColumnMapping && !!uploadedFile}
                        onClose={onModalClose}
                        uploadedFile={uploadedFile}
                        parsedCsvData={parsedCsvData}
                        validRowsCount={validRowsCount}
                        isLoading={isLoading}
                        isProcessing={isProcessing || isProcessingStatus}
                        isVerifying={false}
                        validationComplete={validationComplete}
                        verificationFailed={null}
                        verificationResults={null}
                        uploadInitiated={uploadInitiated}
                        detectedLinkedInColumns={detectedLinkedInColumns}
                        suggestedLinkedInColumn={suggestedLinkedInColumn}
                        onUploadAll={onUploadAll}
                        onLinkedInColumnSelected={onLinkedInColumnSelected}
                        onReuploadRequest={onReuploadRequest}
                        onValidRowsCountUpdate={onValidRowsCountUpdate}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

