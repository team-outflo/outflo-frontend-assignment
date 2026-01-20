import React from 'react';

const CampaignLoadingState: React.FC = () => {
  return (
    <div className="flex-1 bg-purple-50/30 p-6 transition-all">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 mb-4 mx-auto">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading campaign data...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignLoadingState;
