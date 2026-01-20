import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LinkedInSearchForm, LinkedInAccountType } from '@/components/Leads/LinkedInSearchForm';
import { ProcessingStatusIndicator } from './ProcessingStatusIndicator';
import { Info } from 'lucide-react';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

interface LinkedInImportModalProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    campaignId: string;
    accountType: LinkedInAccountType;
    isProcessingStatus: boolean;
    onProcessingStarted: (leadListId: string) => void;
}

const ACCOUNT_TYPE_TITLES: Record<LinkedInAccountType, string> = {
    classic: 'Basic LinkedIn Search',
    sales_navigator: 'Sales navigator (Leads)',
    recruiter: 'LinkedIn Recruiter'
};

const ACCOUNT_TYPE_DESCRIPTIONS: Record<LinkedInAccountType, string> = {
    classic: 'Enter a LinkedIn search URL to scrape leads from search results.',
    sales_navigator: 'Paste your sales navigator search URL to scrape leads.',
    recruiter: 'Paste your LinkedIn Recruiter search URL to scrape leads.'
};

export const LinkedInImportModal: React.FC<LinkedInImportModalProps> = ({
    isOpen,
    onClose,
    campaignId,
    accountType,
    isProcessingStatus,
    onProcessingStarted
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                         {ACCOUNT_TYPE_TITLES[accountType]}
                        <TooltipInfo
                            trigger={
                                <Info className="w-4 h-4 text-gray-500" />
                            }
                            content={ACCOUNT_TYPE_DESCRIPTIONS[accountType]}
                            side="right"
                            align="start"
                        />
                    </DialogTitle>
                </DialogHeader>
                <hr className="border-gray-200 pt-1" />
                <div className="space-y-4">
                    {isProcessingStatus && (
                        <ProcessingStatusIndicator message={`Processing ${ACCOUNT_TYPE_TITLES[accountType]}. This may take a few moments...`} />
                    )}
                    <LinkedInSearchForm
                        campaignId={campaignId}
                        accountType={accountType}
                        onProcessingStarted={onProcessingStarted}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

