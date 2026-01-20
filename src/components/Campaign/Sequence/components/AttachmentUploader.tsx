import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { X, Loader2, File, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSignedUrl, uploadFileToS3 } from '@/api/leads/leads';
import { api } from '@/common/api';
import { authStore } from '@/api/store/authStore';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_ATTACHMENTS = 10;

export interface AttachmentUploaderRef {
  triggerFileInput: () => void;
}

interface AttachmentUploaderProps {
  attachments: string[];
  onAttachmentsChange: (attachments: string[]) => void;
  disabled?: boolean;
}

export const AttachmentUploader = React.forwardRef<AttachmentUploaderRef, AttachmentUploaderProps>(({
  attachments,
  onAttachmentsChange,
  disabled = false
}, ref) => {
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<string[]>(attachments);
  const { toast } = useToast();

  // Expose method to trigger file input
  useImperativeHandle(ref, () => ({
    triggerFileInput: () => {
      if (fileInputRef.current && !disabled && attachments.length < MAX_ATTACHMENTS) {
        fileInputRef.current.click();
      }
    }
  }));

  // Keep ref in sync with props
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large. Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}. Please choose a smaller file.`;
    }
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Use ref to get latest attachments count
    const currentAttachments = attachmentsRef.current || [];
    
    // Check total count
    if (currentAttachments.length + fileArray.length > MAX_ATTACHMENTS) {
      const remainingSlots = MAX_ATTACHMENTS - currentAttachments.length;
      toast({
        title: "Too many attachments",
        description: `You can only add ${MAX_ATTACHMENTS} attachments per message. You currently have ${currentAttachments.length} and tried to add ${fileArray.length} more. Please remove some attachments or select fewer files.`,
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate all files first
    const validationErrors: string[] = [];
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      }
    });

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.length === 1 
        ? validationErrors[0]
        : `${validationErrors.length} file(s) are too large. Each file must be ${formatFileSize(MAX_FILE_SIZE)} or smaller.`;
      
      toast({
        title: "File size limit exceeded",
        description: errorMessage,
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Upload files sequentially
    const newAttachmentUrls: string[] = [];
    const filesToUpload = fileArray.filter(file => {
      const error = validateFile(file);
      return !error;
    });

    for (const file of filesToUpload) {
      try {
        setUploadingFiles(prev => new Set(prev).add(file.name));
        
        // Get signed URL
        const signedUrlResponse = await getSignedUrl(file.name, file.type);
        const responseData = signedUrlResponse as any;
        
        if (!responseData.data) {
          throw new Error('Invalid response from signed URL endpoint');
        }
        
        const { signedUrl, publicUrl } = responseData.data;
        
        if (!signedUrl || !publicUrl) {
          throw new Error('Missing required fields in signed URL response');
        }
        
        // Upload to S3
        await uploadFileToS3(file, signedUrl);
        
        newAttachmentUrls.push(publicUrl);
      } catch (error: any) {
        console.error(`Error uploading file ${file.name}:`, error);
        
        // Create user-friendly error message
        let errorMessage = `Unable to upload "${file.name}".`;
        const errorMsg = error?.message || '';
        
        if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch')) {
          errorMessage += ' Please check your internet connection and try again.';
        } else if (errorMsg.includes('403') || errorMsg.includes('Access denied')) {
          errorMessage += ' You don\'t have permission to upload files. Please contact support.';
        } else if (errorMsg.includes('401') || errorMsg.includes('Authentication')) {
          errorMessage += ' Your session may have expired. Please refresh the page and try again.';
        } else if (errorMsg.includes('500') || errorMsg.includes('Server error')) {
          errorMessage += ' Our servers are experiencing issues. Please try again in a moment.';
        } else if (errorMsg.includes('Invalid response') || errorMsg.includes('Missing required fields')) {
          errorMessage += ' There was an issue processing your file. Please try again.';
        } else {
          errorMessage += ' Please try again. If the problem persists, contact support.';
        }
        
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(file.name);
          return next;
        });
      }
    }

    // Update attachments if any were successfully uploaded
    if (newAttachmentUrls.length > 0) {
      // Use ref to get the latest attachments to avoid stale closure
      const currentAttachments = attachmentsRef.current || [];
      const updatedAttachments = [...currentAttachments, ...newAttachmentUrls];
      onAttachmentsChange(updatedAttachments);
      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${newAttachmentUrls.length} file(s)`,
        variant: "success",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  const getSignedDownloadUrl = async (fileUrl: string): Promise<string> => {
    try {
      const response = await api.post('/campaigns/download/signed-url', {
        fileUrl
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authStore.getState().accessToken}`,
        },
      });
      
      const responseData = response.data as any;
      if (!responseData?.data?.signedUrl) {
        throw new Error('Invalid response from download endpoint');
      }
      
      return responseData.data.signedUrl;
    } catch (error: any) {
      console.error("Error getting signed download URL:", error);
      throw error;
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(url));
      
      // Get signed download URL
      const signedUrl = await getSignedDownloadUrl(url);
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${fileName}...`,
        variant: "success",
      });
    } catch (error: any) {
      console.error(`Error downloading file ${fileName}:`, error);
      
      let errorMessage = `Unable to download "${fileName}".`;
      const errorMsg = error?.message || '';
      
      if (errorMsg.includes('401') || errorMsg.includes('Authentication')) {
        errorMessage += ' Your session may have expired. Please refresh the page and try again.';
      } else if (errorMsg.includes('403') || errorMsg.includes('Access denied')) {
        errorMessage += ' You don\'t have permission to download this file.';
      } else if (errorMsg.includes('404')) {
        errorMessage += ' File not found. It may have been deleted.';
      } else if (errorMsg.includes('500') || errorMsg.includes('Server error')) {
        errorMessage += ' Our servers are experiencing issues. Please try again in a moment.';
      } else {
        errorMessage += ' Please try again. If the problem persists, contact support.';
      }
      
      toast({
        title: "Download failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fullFileName = pathParts[pathParts.length - 1] || 'Attachment';
      
      // Remove timestamp prefix if present (format: timestamp_filename.ext)
      // Timestamp is typically a number at the start followed by underscore
      const timestampPattern = /^\d+_/;
      if (timestampPattern.test(fullFileName)) {
        // Remove the timestamp prefix (number + underscore)
        return fullFileName.replace(timestampPattern, '');
      }
      
      return fullFileName;
    } catch {
      return 'Attachment';
    }
  };

  const isUploading = uploadingFiles.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || isUploading || attachments.length >= MAX_ATTACHMENTS}
          className="hidden"
          accept="*/*"
        />
        {isUploading && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        )}
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {attachments.length} of {MAX_ATTACHMENTS} attachments
          </p>
          <div className="space-y-1">
            {attachments.map((url, index) => {
              const fileName = getFileNameFromUrl(url);
              const isDownloading = downloadingFiles.has(url);
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(url, fileName)}
                      disabled={isDownloading}
                      className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      title="Download file"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                    </Button>
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(index)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {attachments.length >= MAX_ATTACHMENTS && (
        <p className="text-xs text-amber-600">
          Maximum number of attachments reached
        </p>
      )}
    </div>
  );
});

