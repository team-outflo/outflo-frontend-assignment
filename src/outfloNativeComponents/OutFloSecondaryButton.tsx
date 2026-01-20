import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';

interface OutFloSecondaryButtonProps extends ButtonProps {
  children: React.ReactNode;
  className?: string;
}

export const OutFloSecondaryButton: React.FC<OutFloSecondaryButtonProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <Button
      className={cn(
        'bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 px-6 py-3 text-base font-semibold rounded',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};

export default OutFloSecondaryButton;

