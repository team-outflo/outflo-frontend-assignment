import React from 'react';
import { Button } from '@/components/ui/button';
import { OutFloSecondaryButton } from '@/outfloNativeComponents/OutFloSecondaryButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StepNavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export const StepNavigationButtons: React.FC<StepNavigationButtonsProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  className = '',
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className={`flex items-center justify-between mt-6 ${className}`}>
      <Button
        onClick={onPrevious}
        disabled={isFirstStep}
        variant="outline"
        className="flex items-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>
      <OutFloSecondaryButton
        onClick={onNext}
        disabled={isLastStep}
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </OutFloSecondaryButton>
    </div>
  );
};

export default StepNavigationButtons;

