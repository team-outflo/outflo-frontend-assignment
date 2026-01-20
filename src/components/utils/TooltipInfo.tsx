import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TooltipInfoProps {
  trigger: React.ReactElement;
  content: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
}

export const TooltipInfo: React.FC<TooltipInfoProps> = React.memo(({
  trigger,
  content,
  side = 'top',
  align = 'center',
  contentClassName,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {trigger}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={cn("bg-black text-white border-0 max-w-xs", contentClassName)}
      >
        <div className="text-sm leading-relaxed whitespace-normal break-words">
          {content}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
