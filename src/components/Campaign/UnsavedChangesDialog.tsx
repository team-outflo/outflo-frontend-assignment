import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, Trash2, X, Check } from 'lucide-react';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';
import { campaignStore, useCampaignStore } from '@/api/store/campaignStore/campaign';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndContinue: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  campaignId?: string;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onOpenChange,
  onSaveAndContinue,
  onDiscard,
  onCancel,
  campaignId,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();


  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      await saveDraftCampaign();
      
      // Reset store after successful save
      console.log('Resetting campaign store after save...');
      campaignStore.getState().reset();
      
      // Verify reset worked
      
      
      // Close dialog
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Changes saved successfully',
      });
      
    
      onSaveAndContinue();
   
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
      });
      // Keep dialog open on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    // Clear isEdited flag since we're discarding changes
    campaignStore.getState().setIsEdited(false);
    
    // Close dialog and proceed with navigation
    // The store will be reset by the pendingNavigation callback in CampaignEditorPage
    onOpenChange(false);
    onDiscard();
    
    toast({
      title: 'Changes discarded',
      description: 'All unsaved changes have been discarded',
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange} >
      <AlertDialogContent className="sm:max-w-[425px]" >
        <AlertDialogHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                Unsaved Changes
              </AlertDialogTitle>
            </div>
            <button 
              onClick={handleCancel}
              className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              <X className="w-4 h-4 text-gray-500" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <AlertDialogDescription className="text-gray-700">
            You have unsaved changes in your campaign draft.
            <br />
            Would you like to save your progress before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:gap-2 sm:flex-row pt-2">
          <AlertDialogAction
            onClick={handleDiscard}
            disabled={isSaving}
            className="bg-white hover:bg-gray-50 text-gray-700 m-0 w-full border border-gray-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Discard
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleSaveAndContinue}
            disabled={isSaving}
            className="bg-[#5a41cd] hover:bg-[#5a41cd]/90 text-white border-[#5a41cd] m-0 w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Draft
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

