import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';

interface OutFloPrimaryButtonProps extends ButtonProps {
  children: React.ReactNode;
  className?: string;
}

export const OutFloPrimaryButton: React.FC<OutFloPrimaryButtonProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <Button
      className={cn(
        'bg-[#5a41cd] hover:bg-[#5a41cd]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 px-6 py-3 text-base font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};

export default OutFloPrimaryButton;

