import React, { useMemo } from 'react';
import { Clock, Info } from 'lucide-react';
import { SequenceStep } from '../types';
import { STYLE_CLASSES } from '../constants';
import { formatTimeDisplay, getFollowUpNumberText } from '../utils';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

interface DelayStepProps {
  step: SequenceStep;
  followUpNumber: number;
  viewMode: boolean;
  onUpdateDelay: (stepId: string, field: 'days' | 'hours' | 'minutes', value: number) => void;
  excludeConnected?: boolean;
}

export const DelayStep: React.FC<DelayStepProps> = ({
  step,
  followUpNumber,
  viewMode,
  onUpdateDelay,
  excludeConnected = false
}) => {
  const containerClass = `bg-slate-50 border ${viewMode ? 'border-slate-100' : 'border-slate-200'} rounded-lg px-4 py-3`;

  const days = step.delay?.days || 0;
  const hours = step.delay?.hours || 0;

  const timeDisplay = formatTimeDisplay(days, hours, 0); // Remove minutes
  const followUpText = getFollowUpNumberText(followUpNumber);

  // Memoize the tooltip trigger to prevent infinite re-renders
  const tooltipTrigger = useMemo(
    () => <Info className="w-3 h-3 text-blue-400 hover:text-blue-600 cursor-pointer" />,
    []
  );

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-slate-600 font-medium">Wait</span>

            {viewMode ? (
              // View mode - properly handle zero days and include minutes
              <span className="text-slate-600 flex items-center whitespace-nowrap">
                {(() => {
                  const days = typeof step.delay?.days === 'number' ? step.delay.days : 0;
                  const hours = step.delay?.hours || 0;

                  if (days === 0 && hours === 0) {
                    return '0 days';
                  }

                  let timeText = '';
                  if (days > 0) {
                    timeText += `${days} ${days === 1 ? 'day' : 'days'} `;
                  }
                  if (hours > 0) {
                    timeText += `${timeText.length > 0 ? 'and ' : ''}${hours} ${hours === 1 ? 'hour' : 'hours'} `;
                  }
                  return timeText.trim();
                })()}
                {followUpNumber === 1
                ? ' after connection request accepted, and no reply from lead'
                : ` after ${followUpNumber === 2 ? 'first' : followUpNumber === 3 ? 'second' : followUpNumber === 4 ? 'third' : (followUpNumber - 1) + 'th'} follow-up`}
              </span>
            ) : (
              // Edit mode - remove minutes input
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={step.delay?.days || 0}
                    onChange={(e) => onUpdateDelay(step.id, 'days', parseInt(e.target.value) || 0)}
                    className="w-14 px-2 py-1.5 ring-[0.5px] ring-slate-300 rounded-md text-center text-sm font-medium "
                    min="0"
                    disabled={viewMode}
                  />
                  <span className="text-slate-600 text-xs">days</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={step.delay?.hours || 0}
                    onChange={(e) => onUpdateDelay(step.id, 'hours', parseInt(e.target.value) || 0)}
                    className={`w-14 px-2 py-1.5 ring-[0.5px] ring-slate-300 rounded-md text-center text-sm font-medium ${followUpNumber === 1 && ((step.delay?.days || 0) * 24 + (step.delay?.hours || 0)) < 3
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-300'
                        }`}
                    min="0"
                    max="23"
                    disabled={viewMode}
                  />
                  <span className="text-slate-600 text-xs">hours</span>
                  <span className="text-slate-500 text-xs whitespace-nowrap">
                    {followUpNumber === 1
                      ? 'after connection request accepted, and no reply from lead'
                      : `after ${followUpNumber === 2 ? 'first' : followUpNumber === 3 ? 'second' : followUpNumber === 4 ? 'third' : (followUpNumber - 1) + 'th'} follow-up and no reply from lead`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        <TooltipInfo
          trigger={tooltipTrigger}
          content="Sequence will automatically stop if the lead replies at any step."
          side="top"
          align="center"
        />
      </div>
      <div className="flex flex-col mt-1">
        {followUpNumber === 1 && ((step.delay?.days || 0) * 24 + (step.delay?.hours || 0)) < 3 && (
          <span className="text-red-500 text-xs mt-1 flex items-center">
            <svg className="w-3 h-3 " fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            The first follow-up must have at least 3 hours delay.
          </span>
        )}
      </div>
    </div>
  );
};
