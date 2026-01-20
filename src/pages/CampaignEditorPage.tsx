import React, { useCallback, useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CampaignBreadcrumb from '@/components/Campaign/CampaignBreadcrumb';
import CampaignHeader from '@/components/Campaign/CampaignHeader';
import CampaignAnalyticsCards from '@/components/Campaign/CampaignAnalyticsCards';
import CampaignStepRenderer from '@/components/Campaign/CampaignStepRenderer';
import CampaignLoadingState from '@/components/Campaign/CampaignLoadingState';
import CampaignErrorState from '@/components/Campaign/CampaignErrorState';
import { useCampaignOrchestrator } from '@/hooks/useCampaignOrchestrator';
import { useCampaignStore } from '@/api/store/campaignStore';
import { campaignStore } from '@/api/store/campaignStore/campaign';
import { OutFloSecondaryButton } from '@/outfloNativeComponents/OutFloSecondaryButton';
import { ChevronRight } from 'lucide-react';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';
import { useToast } from '@/hooks/use-toast';
import { useNavigationBlocker } from '@/hooks/useNavigationBlocker';
import { UnsavedChangesDialog } from '@/components/Campaign/UnsavedChangesDialog';
import { setPendingFilter } from '@/utils/analyticsCardFilterHandler';
import { useParams } from 'react-router-dom';

const CampaignEditorPage: React.FC = () => {
  // Centralized campaign operations through orchestrator
  const {
    mode,
    currentStep,
    campaignInsights,
    isLoading,
    hasError,
    campaignError,
    insightsLoading,
    insightsFetching,
    actions
  } = useCampaignOrchestrator();

  const { campaign, isEdited, reset } = useCampaignStore();
  const { toast } = useToast();
  const { id: campaignId } = useParams();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Navigation blocker
  const navigationBlocker = useNavigationBlocker({
    onBlocked: () => {
      setShowUnsavedDialog(true);
    },
    enabled: mode === 'edit',
  });

  // Steps configuration
  const steps = [
    { id: 1, title: 'LinkedIn Senders' },
    { id: 2, title: 'List of Leads' },
    { id: 3, title: 'Sequence' },
    { id: 4, title: 'Review & Launch' },
  ];

  // Save draft before changing step (no dialog for step transitions)
  const handleStepChange = useCallback(async (newStep: number) => {
    // Only save in edit mode
    if (mode === 'edit' && campaign?.id) {
      setSaveStatus('saving');
      try {
        await saveDraftCampaign();
        // saveDraftCampaign automatically sets isEdited = false
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Error auto-saving draft:', error);
        setSaveStatus('idle');
        toast({
          title: 'Error',
          description: 'Failed to save draft. Please try again.',
          variant: 'destructive',
        });
      }
    }
    actions.goToStep(newStep);
  }, [mode, campaign, actions, toast]);

  // Handle back navigation with unsaved changes check
  const handleBack = useCallback(() => {
    if (mode === 'edit' && isEdited) {
      setPendingNavigation(() => () => {
        reset(); // Clear campaign store when leaving
        actions.goToAllCampaigns();
      });
      setShowUnsavedDialog(true);
    } else {
      reset(); // Clear campaign store when leaving
      actions.goToAllCampaigns();
    }
  }, [mode, isEdited, actions, reset]);

  // Handle dialog actions
  const handleSaveAndContinue = useCallback(() => {
    // Proceed with blocked navigation (useBlocker will handle the actual navigation)
    navigationBlocker.proceed();
    // Also execute any pending navigation callback if set
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [navigationBlocker, pendingNavigation]);

  const handleDiscard = useCallback(() => {
    // Proceed with blocked navigation (useBlocker will handle the actual navigation)
    navigationBlocker.proceed();
    // Also execute any pending navigation callback if set
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [navigationBlocker, pendingNavigation]);

  const handleCancel = useCallback(() => {
    navigationBlocker.reset();
    setPendingNavigation(null);
  }, [navigationBlocker]);

  // Cleanup: reset store on unmount (when leaving the page)
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout activePage="campaigns">
        <CampaignLoadingState />
      </DashboardLayout>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <DashboardLayout activePage="campaigns">
        <CampaignErrorState error={campaignError as Error} />
      </DashboardLayout>
    );
  }

  // Show Next button only for steps 1, 2, 3
  const showNextButton = currentStep >= 1 && currentStep <= 3;

  return (
    <DashboardLayout activePage="campaigns">
      <div className="flex-1 bg-purple-50/30 p-6 transition-all">
        <div className="max-w-7xl mx-auto">
          <CampaignHeader 
            name={campaign?.name} 
            mode={mode} 
            onBack={handleBack}
            saveStatus={saveStatus}
            onSaveStatusChange={setSaveStatus}
          />

          {mode === 'view' && (
            <CampaignAnalyticsCards
              insights={campaignInsights}
              isLoading={insightsLoading}
              isFetching={insightsFetching}
              onRefresh={actions.refreshInsights}
              onCardClick={(filterType) => {
                // Set pending filter before navigating
                setPendingFilter(filterType);
                
                // Navigate to List of Leads step (step 2)
                actions.goToStep(2);
              }}
            />
          )}

          <CampaignBreadcrumb
            steps={steps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
          />

          <CampaignStepRenderer />
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSaveAndContinue={handleSaveAndContinue}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
        campaignId={campaignId}
      />
    </DashboardLayout>
  );
};

export default CampaignEditorPage;
