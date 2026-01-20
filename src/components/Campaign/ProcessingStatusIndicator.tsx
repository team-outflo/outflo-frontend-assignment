import React from 'react';

interface ProcessingStatusIndicatorProps {
    message?: string;
}

export const ProcessingStatusIndicator: React.FC<ProcessingStatusIndicatorProps> = ({
    message = 'Processing. This may take a few moments...'
}) => {
    return (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-800">{message}</span>
            </div>
        </div>
    );
};

