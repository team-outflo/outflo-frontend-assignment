import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinkedInSearchForm } from '@/components/Leads/LinkedInSearchForm';
import { SavedLeadListsSection } from '@/components/Leads/SavedLeadListsSection';
import { ProcessingStatusIndicator } from './ProcessingStatusIndicator';

interface LeadImportTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    campaignId?: string;
    isProcessingStatus: boolean;
    onLinkedInSearchStarted: (leadListId: string) => void;
    onSavedListLeadsLoaded: (leadListId: string, leadsData: any[]) => void;
}

export const LeadImportTabs: React.FC<LeadImportTabsProps> = ({
    activeTab,
    onTabChange,
    campaignId,
    isProcessingStatus,
    onLinkedInSearchStarted,
    onSavedListLeadsLoaded
}) => {
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="linkedin">LinkedIn Search</TabsTrigger>
                <TabsTrigger value="saved">Saved Lists</TabsTrigger>
            </TabsList>

            {/* LinkedIn Search Tab */}
            <TabsContent value="linkedin" className="mt-6">
                {isProcessingStatus && (
                    <ProcessingStatusIndicator message="Processing LinkedIn search. This may take a few moments..." />
                )}
                {campaignId && (
                    <LinkedInSearchForm
                        campaignId={campaignId}
                        accountType="classic"
                        onProcessingStarted={onLinkedInSearchStarted}
                    />
                )}
            </TabsContent>

            {/* Saved Lists Tab */}
            <TabsContent value="saved" className="mt-6">
                <SavedLeadListsSection
                    onLeadsLoaded={onSavedListLeadsLoaded}
                />
            </TabsContent>
        </Tabs>
    );
};

