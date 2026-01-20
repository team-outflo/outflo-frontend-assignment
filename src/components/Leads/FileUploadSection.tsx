import React from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize, getSampleData, detectLinkedInColumns, findBestLinkedInColumn } from '@/utils/leadsUtils';
import Papa from 'papaparse';

interface FileUploadSectionProps {
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onLinkedInColumnConfirmed?: (columnName: string, csvData: any[]) => void;
    onLinkedInColumnsDetected?: (detectedColumns: string[], suggestedColumn: string | null, csvData: any[]) => void;
    isUploading?: boolean;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({ 
    onFileUpload, 
    onLinkedInColumnConfirmed,
    onLinkedInColumnsDetected,
    isUploading = false
}) => {

    const handleDownloadSample = () => {
        const sampleData = getSampleData();
        const csv = Papa.unparse(sampleData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'leads_template.csv';
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Parse CSV to detect LinkedIn columns in background
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const csvData = results.data as any[];
                
                if (csvData.length === 0) {
                    // If no data, proceed with normal upload
                    onFileUpload(event);
                    return;
                }

                // Detect LinkedIn columns automatically
                const linkedInColumns = detectLinkedInColumns(csvData);
                const bestColumn = findBestLinkedInColumn(csvData);

                // Pass detected columns information to parent
                if (onLinkedInColumnsDetected) {
                    onLinkedInColumnsDetected(linkedInColumns, bestColumn, csvData);
                }

                // If we found exactly one LinkedIn column, use it automatically
                if (linkedInColumns.length === 1 && bestColumn && onLinkedInColumnConfirmed) {
                    console.log(`Automatically detected LinkedIn column: "${bestColumn}"`);
                    onLinkedInColumnConfirmed(bestColumn, csvData);
                }

                // Always proceed with the upload regardless of LinkedIn detection
                onFileUpload(event);
            },
            error: (error) => {
                console.error('Error parsing CSV for LinkedIn detection:', error);
                // If parsing fails, proceed with normal upload
                onFileUpload(event);
            }
        });
    };


    return (
        <div className="flex justify-center">
            <div className="bg-white  p-6 w-full max-w-3xl">
                {/* <h2 className="text-lg font-semibold text-gray-900 mb-6">Upload Leads CSV</h2> */}

                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isUploading 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                }`}>
                    {isUploading ? (
                        <>
                            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                            <p className="text-blue-700 mb-4 font-medium">
                                Uploading CSV file...
                            </p>
                            <p className="text-sm text-blue-600">
                                Please wait while we upload your file
                            </p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">
                                Upload your CSV file containing leads
                            </p>
                            <div className="relative">
                                <Button variant="outline" className="mx-auto" disabled={isUploading}>
                                    Browse files
                                </Button>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-4 text-sm text-gray-500 text-center">
                    <p>Max size: 5MB | Required column : LinkedIn URL</p>
                    <button
                        onClick={handleDownloadSample}
                        className="text-primary hover:underline inline-flex items-center mt-2 mx-auto"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Download Sample CSV
                    </button>
                </div>
            </div>
        </div>
    );
};
