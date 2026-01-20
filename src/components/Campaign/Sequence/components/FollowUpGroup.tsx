import React from 'react';
import { SequenceStep, ValidatedVariable } from '../types';
import { DelayStep } from './DelayStep';
import { FollowUpStep } from './FollowUpStep';

interface FollowUpGroupProps {
  delayStep: SequenceStep;
  followUpStep: SequenceStep;
  index: number;
  followUpNumber: number;
  viewMode: boolean;
  variables: ValidatedVariable[];
  variablesLoading: boolean;
  onUpdateDelay: (stepId: string, field: 'days' | 'hours' | 'minutes', value: number) => void;
  onUpdateContent: (stepId: string, content: string) => void;
  onUpdateAttachments: (stepId: string, attachments: string[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onPreview: (stepId: string) => void;
  csvData?: any[];
  csvConfigForViewMode?: any;
  excludeConnected?: boolean;
  onVariablesRefresh?: () => void;
}

export const FollowUpGroup: React.FC<FollowUpGroupProps> = ({
  delayStep,
  followUpStep,
  index,
  followUpNumber,
  viewMode,
  variables,
  variablesLoading,
  onUpdateDelay,
  onUpdateContent,
  onUpdateAttachments,
  onDeleteGroup,
  onPreview,
  csvData,
  csvConfigForViewMode,
  excludeConnected = false,
  onVariablesRefresh
}) => {
  const containerClass = 'bg-gray-50/30  border-gray-100 space-y-2 '
  

  return (
    <div className={containerClass}>
      <DelayStep
        step={delayStep}
        followUpNumber={followUpNumber}
        viewMode={viewMode}
        onUpdateDelay={onUpdateDelay}
        excludeConnected={excludeConnected}
      />
      <div className="flex justify-center">
        <div className="w-px h-4 "></div>
      </div>
      <FollowUpStep
        step={followUpStep}
        followUpNumber={followUpNumber}
        viewMode={viewMode}
        variables={variables}
        variablesLoading={variablesLoading}
        onUpdateContent={onUpdateContent}
        onUpdateAttachments={onUpdateAttachments}
        onDeleteGroup={onDeleteGroup}
        onPreview={onPreview}
        csvData={csvData}
        csvConfigForViewMode={csvConfigForViewMode}
        onVariablesRefresh={onVariablesRefresh}
      />
    </div>
  );
};
