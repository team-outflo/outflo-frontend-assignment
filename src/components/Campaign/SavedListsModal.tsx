import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SavedLeadListsSection } from '@/components/Leads/SavedLeadListsSection';
import { ProcessingStatusIndicator } from './ProcessingStatusIndicator';

interface SavedListsModalProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    isProcessingStatus: boolean;
    onSavedListLeadsLoaded: (leadListId: string, leadsData: any[]) => void;
}

export const SavedListsModal: React.FC<SavedListsModalProps> = ({
    isOpen,
    onClose,
    isProcessingStatus,
    onSavedListLeadsLoaded
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import from Saved Lists</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {isProcessingStatus && (
                        <ProcessingStatusIndicator message="Processing saved list. This may take a few moments..." />
                    )}
                    <SavedLeadListsSection
                        onLeadsLoaded={onSavedListLeadsLoaded}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

