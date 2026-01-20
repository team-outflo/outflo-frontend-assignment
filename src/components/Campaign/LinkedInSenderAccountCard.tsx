import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TooltipInfo } from '../utils/TooltipInfo';

// Add this utility function for random profile images
const getRandomProfileImage = () => {
  const totalImages = 13;
  const randomIndex = Math.floor(Math.random() * totalImages) + 1;
  return `/profileImages/user${randomIndex}.png`;
};

interface LinkedInSenderAccountCardProps {
  account: any;
  accountStatus?: any; // Optional accountStatus from campaign.accountStatuses
  variant?: 'card' | 'table'; // Display variant
  showConfigLimits?: boolean; // Whether to show connection limits
  className?: string; // Additional className
}

export const LinkedInSenderAccountCard: React.FC<LinkedInSenderAccountCardProps> = ({
  account,
  accountStatus,
  variant = 'card',
  showConfigLimits = true,
  className = '',
}) => {
  // Extract data - prefer accountStatus, fallback to account
  const displayName = accountStatus?.fullName || 
    `${accountStatus?.firstName || account.firstName || ''} ${accountStatus?.lastName || account.lastName || ''}`.trim() ||
    '[No Name]';
  
  const profileImage = accountStatus?.profileImage || 
    account.profileImageUrl || 
    account.profileImage || 
    account.profilePicture ||
    getRandomProfileImage();
  
  const firstName = accountStatus?.firstName || account.firstName || '';
  const lastName = accountStatus?.lastName || account.lastName || '';
  const configLimits = accountStatus?.configLimits || account.configLimits;
  const connectionStatus = accountStatus?.connectionStatus || account.connectionStatus;
  const syncStatus = accountStatus?.syncStatus || account.syncStatus;
  const isDeleted = accountStatus?.deleted || 
    accountStatus?.status === 'deleted' || 
    account.isDeleted || 
    false;
  
  // Determine status flags
  const isDisconnected = connectionStatus === 'DISCONNECTED';
  const isSyncInactive = syncStatus === 'INACTIVE';
  
  // Determine badge color based on connectionStatus
  const getBadgeColor = (status: string | null | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const statusUpper = String(status).toUpperCase();
    if (statusUpper === 'CONNECTED') return "bg-green-100 text-green-800";
    if (statusUpper === 'DISCONNECTED') return "bg-red-100 text-red-800";
    return "bg-amber-100 text-amber-800";
  };
  
  // Get connection limit
  const connectionLimit = configLimits?.maxConnectionRequestsPerDay || 
    account.accountActions?.dailyConnectionLimit || 
    account.account?.configLimits?.maxConnectionRequestsPerDay ||
    account.account?.accountActions?.dailyConnectionLimit;

  // Profile image component with status indicators
  const ProfileImageWithStatus = () => (
    <div className="relative">
      {variant === 'card' ? (
        <Avatar className="w-8 h-8">
          <AvatarImage src={profileImage} />
          <AvatarFallback>{(firstName?.[0] || '') + (lastName?.[0] || '')}</AvatarFallback>
        </Avatar>
      ) : (
        <img
          src={profileImage}
          alt={displayName}
          className="w-8 h-8 rounded-full bg-gray-200 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getRandomProfileImage();
          }}
        />
      )}
      
      {/* Status indicators */}
      {isSyncInactive && !isDisconnected && !isDeleted && (
        <AlertTriangle className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 bg-white rounded-full" />
      )}
      {(isDisconnected || isDeleted) && (
        <XCircle className={`w-4 h-4 absolute -top-1 -right-1 bg-white rounded-full ${
          isDeleted ? 'text-red-600' : 'text-red-500'
        }`} />
      )}
    </div>
  );

  // Name styling based on status
  const getNameClassName = () => {
    if (isDeleted || isDisconnected) return 'text-red-600';
    if (isSyncInactive) return 'text-yellow-700';
    return 'text-gray-900';
  };

  // Status badges
  const StatusBadges = () => (
    <>
      {isSyncInactive && !isDisconnected && !isDeleted && (
        <Badge 
          variant="outline" 
          className="text-xs border-yellow-500 text-yellow-700 bg-yellow-50"
        >
          Sync Inactive
        </Badge>
      )}
      {isDisconnected && !isDeleted && (
        <Badge 
          variant="destructive" 
          className="text-xs"
        >
          Disconnected
        </Badge>
      )}
      {isDeleted && (
        <Badge 
          variant="destructive" 
          className="text-xs bg-red-600 hover:bg-red-700"
        >
          Deleted
        </Badge>
      )}
    </>
  );

  if (variant === 'table') {
    return (
      <div className="flex items-center space-x-3">
        <ProfileImageWithStatus />
        <div className="flex-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${getNameClassName()}`}>
                {displayName}
              </span>
              <StatusBadges />
            </div>
            {showConfigLimits && connectionLimit && (
              <TooltipInfo
                trigger={
                  <div className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">
                      up to {connectionLimit} (rolling 24h)
                    </span>
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                }
                content="Limits are enforced using a rolling 24-hour window for safety."
                side="top"
                align="start"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant (for ReviewLaunch)
  return (
    <div className={`flex items-center space-x-3 rounded-lg p-3 ${className} ${
      isDeleted ? 'opacity-60' : ''
    }`}>
      <ProfileImageWithStatus />
      <div className="flex-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${getNameClassName()}`}>
              {displayName}
            </p>
            <StatusBadges />
          </div>
          {showConfigLimits && connectionLimit && (
              <TooltipInfo
                trigger={
                  <div className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">
                      up to {connectionLimit} (rolling 24h)
                    </span>
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                }
                content="Limits are enforced using a rolling 24-hour window for safety."
                side="top"
                align="start"
              />
            )}
        </div>
      </div>
    </div>
  );
};

export default LinkedInSenderAccountCard;

