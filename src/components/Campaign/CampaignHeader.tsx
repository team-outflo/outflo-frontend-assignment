import React, { useState } from 'react';
import { ChevronLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';
import { OutFloSecondaryButton } from '@/outfloNativeComponents/OutFloSecondaryButton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';

interface CampaignHeaderProps {
  name: string;
  mode: 'edit' | 'view';
  onBack: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved') => void;
}

const CampaignHeader: React.FC<CampaignHeaderProps> = ({ 
  name, 
  mode, 
  onBack, 
  saveStatus: externalSaveStatus,
  onSaveStatusChange 
}) => {
  const { updateCampaign, campaign } = useCampaignStore();
  const [isSaving, setIsSaving] = useState(false);
  const [internalSaveStatus, setInternalSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { toast } = useToast();
  
  // Use external save status if provided, otherwise use internal
  const saveStatus = externalSaveStatus !== undefined ? externalSaveStatus : internalSaveStatus;
  const setSaveStatus = onSaveStatusChange || setInternalSaveStatus;

  // Campaign store is single source of truth - update store directly
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    // Update store directly - no local state
    updateCampaign({ name: newName });
  };

  const handleSaveDraft = async () => {
    if (!campaign?.id) {
      toast({
        title: 'Error',
        description: 'Campaign ID is missing',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Save draft campaign - it will get campaign directly from store
      await saveDraftCampaign();
      
      setSaveStatus('saved');
      // Hide the saved message after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveStatus('idle');
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-8 w-full">
      <div className="flex items-center space-x-4">
        <ChevronLeft 
          className="!w-6 !h-6 !text-primary mt-1 cursor-pointer" 
          onClick={onBack} 
        />
        {mode === 'view' ? (
          <h1 className="text-2xl font-semibold text-gray-900">
            {name}
          </h1>
        ) : (
          <input
            type="text"
            value={campaign.name || ''}
            onChange={handleNameChange}
            className="text-2xl font-semibold text-gray-900 border-b-2 border-primary focus:outline-none focus:border-primary-600 bg-transparent px-1 min-w-[200px]"
          />
        )}
      </div>
      {mode === 'edit' && (
        <div className="flex items-center gap-3">
          {saveStatus !== 'idle' && (
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
                  <span className="text-sm font-medium text-gray-600">
                    Saving...
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    Saved
                  </span>
                </>
              )}
            </div>
          )}
          <Button
            onClick={handleSaveDraft}
            disabled={isSaving}
            variant='outline'
            className='border-[#5a41cd]/20 text-[#5a41cd] hover:bg-[#5a41cd]/10'

          >
            {isSaving ? 'Saving...' : 'Save draft'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CampaignHeader;
