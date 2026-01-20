import { useCallback } from 'react';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for campaign step navigation with auto-save functionality
 * Eliminates prop drilling by providing step navigation directly to components
 */
export const useCampaignStepNavigation = () => {
  const store = useCampaignStore();
  const { campaign, mode, currentStep } = store;
  const { toast } = useToast();

  const goToStep = useCallback(async (newStep: number) => {
    // Only save in edit mode
    if (mode === 'edit' && campaign?.id) {
      try {
        await saveDraftCampaign();
      } catch (error) {
        console.error('Error auto-saving draft:', error);
        toast({
          title: 'Error',
          description: 'Failed to save draft. Please try again.',
          variant: 'destructive',
        });
      }
    }
    // Change step regardless of save result
    store.setState({ currentStep: newStep });
  }, [mode, campaign, store, toast]);

  const goToNextStep = useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const goToPreviousStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  return {
    currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
  };
};

