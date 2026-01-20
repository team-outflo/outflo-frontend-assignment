import React, { useRef } from 'react';
import LinkedInSenders from '@/components/Campaign/LinkedInSenders';
import ListOfLeads from '@/components/Campaign/ListOfLeads';
import CampaignAnalytics from '@/pages/CampaignAnalytics';
import Sequence from '@/components/Campaign/Sequence';
import ReviewLaunch from '@/components/Campaign/ReviewLaunch';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import Flow from '@/pages/Flow/Flow';
import SequenceTypeSwitcher from '@/components/Campaign/SequenceTypeSwitcher';

const CampaignStepRenderer: React.FC = () => {
  // Get everything from the centralized store
  const { currentStep, mode, campaign } = useCampaignStore();
  const sequenceRef = useRef<{ openSettings: () => void } | null>(null);
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <LinkedInSenders />
        );

      case 2:
        return mode === 'view' ? (
          <CampaignAnalytics />
        ) : (
          <ListOfLeads  />
        );

      case 3: 
          return (
            <div className="flex flex-col h-full -mx-6 -mt-6">
              <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-200 bg-gray-50">
                <SequenceTypeSwitcher 
                  onOpenSettings={() => sequenceRef.current?.openSettings()}
                />
              </div>
              <div className="flex-1 px-6 mt-4">
                {campaign.sequenceType === "TREE" ? <Flow  viewMode={mode === 'view'}/> : <Sequence ref={sequenceRef as React.RefObject<{ openSettings: () => void }>} />}
              </div>
            </div>
          );

      case 4:
        return (
          <ReviewLaunch
          />
        );

      default:
        return <>
        no step found</>;
    }
  };

  return (
    <div className={`mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100`}>
      {renderStep()}
    </div>
  );
};

export default CampaignStepRenderer;
