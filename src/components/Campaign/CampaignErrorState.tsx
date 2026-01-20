import React from 'react';
import { Button } from '@/components/ui/button';

interface CampaignErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
}

const CampaignErrorState: React.FC<CampaignErrorStateProps> = ({ 
  error, 
  onRetry = () => window.location.reload() 
}) => {
  return (
    <div className="flex-1 bg-purple-50/30 p-6 transition-all">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Campaign</h2>
            <p className="text-gray-600 mb-4">Failed to load campaign data. Please try again.</p>
            {error && (
              <p className="text-sm text-red-600 mb-4">
                {error.message || 'An unexpected error occurred'}
              </p>
            )}
            <Button onClick={onRetry}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignErrorState;
