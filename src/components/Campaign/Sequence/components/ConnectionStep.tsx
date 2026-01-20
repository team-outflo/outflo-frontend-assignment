import React from 'react';
import { UserPlus, MoreHorizontal, Eye, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SequenceStep } from '../types';
import { STYLE_CLASSES } from '../constants';

interface ConnectionStepProps {
  step: SequenceStep;
  viewMode: boolean;
  onAddMessage: (step: SequenceStep) => void;
  onViewContent: (content: string) => void;
  hasAccounts?: boolean; // Add optional prop for account status
}

export const ConnectionStep: React.FC<ConnectionStepProps> = ({
  step,
  viewMode,
  onAddMessage,
  onViewContent,
  hasAccounts = true // Default to true for backward compatibility
}) => {
  const canEdit = !viewMode && hasAccounts;

  // Consider premium/standard/generic connection note
  const anyMessage = Boolean(
    (step.premiumConnectionMessage && step.premiumConnectionMessage.trim()) ||
    (step.standardConnectionMessage && step.standardConnectionMessage.trim()) ||
    (step.connectionMessage && step.connectionMessage.trim())
  );

  const handleViewMessage = () => {
    const toView = step.premiumConnectionMessage || step.standardConnectionMessage || step.connectionMessage;
    if (toView) onViewContent(toView);
  };

  return (
    <div
    className={`
      rounded-lg p-4 border shadow-sm transition-all duration-200
      ${viewMode
        ? 'from-indigo-50/70 to-purple-50/70 border-indigo-100 cursor-pointer'
        : hasAccounts
          ? 'from-indigo-50 to-purple-50 border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 hover:shadow-md'
          : 'from-indigo-50 to-purple-50 border-indigo-200 cursor-not-allowed opacity-90'
      }
    `}
    onClick={() => onAddMessage(step)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 `}>
            <UserPlus className={`w-6 h-6 $ text-white`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={`text-lg font-semibold ${hasAccounts ? 'text-gray-900' : 'text-gray-500'}`}>
                View Profile and Send Connection Request
              </h3>
            </div>
            {anyMessage ? null: (
              <div className="mt-1 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasAccounts ? 'bg-gray-300' : 'bg-gray-400'}`}></div>
                <p className={`text-sm italic ${hasAccounts ? 'text-gray-500' : 'text-gray-400'}`}>
                  {viewMode ? 'No message added' : (!hasAccounts ? 'Select accounts to add message' : 'No message added')}
                </p>
              </div>
            )}
          </div>
        </div>

        {viewMode && anyMessage && (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewMessage}
              className="h-8 w-8 p-0 hover:bg-white/60"
            >
              <Eye className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
