import React, { useState } from 'react';
import { List, GitBranch, Settings, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';
import { useToast } from '@/hooks/use-toast';
import NextSequenceButton from '@/components/Campaign/NextSequenceButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { get, checkUnauthorized } from '@/common/api';

interface SequenceTypeSwitcherProps {
  onSwitch?: (type: 'FLAT' | 'TREE') => void;
  onOpenSettings?: () => void;
}

interface ValidationResponse {
  status: number;
  data: {
    valid: boolean;
    sequenceType: 'FLAT' | 'TREE';
    message: string;
    errors?: string[];
  };
  error: string | null;
}

const SequenceTypeSwitcher: React.FC<SequenceTypeSwitcherProps> = ({ onSwitch, onOpenSettings }) => {
  const { campaign, updateCampaign: updateCampaignStore , mode } = useCampaignStore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const currentType = campaign.sequenceType || 'TREE';

  const handleSwitch = async (newType: 'FLAT' | 'TREE') => {
    if (newType === currentType || isUpdating || !campaign.id) {
      return;
    }

    setIsUpdating(true);
    try {
      // Update local store first
      updateCampaignStore({ sequenceType: newType });

      // Save to draft endpoint
      await saveDraftCampaign();

      // Call optional callback
      onSwitch?.(newType);

      toast({
        title: 'Success',
        description: `Sequence type switched to ${newType === 'FLAT' ? 'Flat' : 'Tree'}`,
      });
    } catch (error) {
      console.error('Failed to update sequence type:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update sequence type. Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleValidate = async () => {
    if (!campaign.id || isValidating) {
      return;
    }

    setIsValidating(true);
    try {
      await saveDraftCampaign();

      const response = await get<ValidationResponse>(`/campaigns/${campaign.id}/validate-sequence`).then(checkUnauthorized);
      
      // Extract nested data if present
      const validationData = (response as any)?.data || response;
      
      if (validationData.valid) {
        toast({
          title: 'Validation Successful',
          description: validationData.message || 'Sequence is valid',
        });
      } else {
        const errorMessage = validationData.errors && validationData.errors.length > 0
          ? `${validationData.message}\n${validationData.errors.join('\n')}`
          : validationData.message || 'Sequence validation failed';
        
        toast({
          variant: 'destructive',
          title: 'Validation Failed',
          description: errorMessage,
        });
      }
    } catch (error: any) {
      const errorMessage = error?.errorInfo?.data?.error || error?.message || 'Failed to validate sequence';
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: errorMessage,
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-1">
      {currentType === 'FLAT' && onOpenSettings && (
          <Button
            variant="link"
            size="sm"
            onClick={onOpenSettings}
            className="flex items-center ml-2"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Button>
        )}
        <button
          onClick={() => handleSwitch('FLAT')}
          disabled={isUpdating || mode === 'view'}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            currentType === 'FLAT'
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <List className="w-4 h-4" />
          <span>Flat</span>
        </button>
        <button

          onClick={() => handleSwitch('TREE')}
          disabled={isUpdating || mode === 'view'}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            currentType === 'TREE'
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <GitBranch className="w-4 h-4" />
          <span>Tree</span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
            Beta
          </Badge>
        </button>
        {currentType === 'TREE' && (
          <button
      
          onClick={handleValidate}
          disabled={isValidating || !campaign.id || mode === 'view' || isUpdating}
          className={cn(
            'flex items-center px-4 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isValidating ? (
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-gray-600" />
          )}
        </button>
        )}
      </div>
      <NextSequenceButton />
    </div>
  );
};

export default SequenceTypeSwitcher;

