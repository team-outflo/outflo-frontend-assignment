import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { OutFloPrimaryButton } from '@/outfloNativeComponents/OutFloPrimaryButton';

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCampaign: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  open,
  onOpenChange,
  onCreateCampaign,
  isLoading = false,
}) => {
  const [campaignName, setCampaignName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = campaignName.trim();
    if (!trimmedName) {
      setError('Campaign name is required');
      return;
    }

    try {
      await onCreateCampaign(trimmedName);
      setCampaignName('');
      setError(null);
      onOpenChange(false);
    } catch (err) {
      // Error handling is done in the parent component
      console.error('Error creating campaign:', err);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      if (!newOpen) {
        // Reset form when closing
        setCampaignName('');
        setError(null);
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} >
      <DialogContent className="sm:max-w-[425px] min-h-[200px] py-8" hideCloseButton>
        <DialogHeader>
          <DialogTitle className='text-center'>Create New Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 pb-4 pt-2">
            <div className="grid gap-2 space-y-1">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => {
                  setCampaignName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Q1 2024 Outreach"
                disabled={isLoading}
                className={`focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#5a41cd] focus-visible:border-1 ${error ? 'border-destructive' : ''}`}
              />
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2 w-full">
            
            <OutFloPrimaryButton type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </OutFloPrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

