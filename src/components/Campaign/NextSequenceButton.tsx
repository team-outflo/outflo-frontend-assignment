import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useCampaignStepNavigation } from '@/hooks/useCampaignStepNavigation';
import OutFloPrimaryButton from '@/outfloNativeComponents/OutFloPrimaryButton';





const NextSequenceButton: React.FC = () => {
  const { goToNextStep } = useCampaignStepNavigation();

  const handleClick = () => {
    goToNextStep();
  };

  return (
    <OutFloPrimaryButton
      onClick={handleClick}
    >
      <span>Next</span>
      <ChevronRight className="w-4 h-4" />
    </OutFloPrimaryButton>
  );
};

export default NextSequenceButton;

