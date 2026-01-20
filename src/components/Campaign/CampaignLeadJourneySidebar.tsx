import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { getCampaignLeadById } from '@/api/leads/leadsApi';
import { formatWithAbbrev } from '@/utils/timeUtils';
import { useCampaignStore } from '@/api/store/campaignStore';
import { displayToLuxonFormat } from '@/utils/timezoneUtils';

interface CampaignLeadJourneySidebarProps {
  campaignLeadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone?: string; // Optional timezone, will use campaign timezone or local if not provided
}

interface CampaignLeadAction {
  id: string;
  actionType: string;
  actionStatus: string;
  errorMessage?: string | null;
  metadata?: any;
  createdAt: string;
  account?: {
    id: string;
    profile?: {
      firstName: string;
      lastName: string;
      profileUrl: string;
    };
  };
}

interface CampaignLeadData {
  campaignLead: {
    id: string;
    campaignId: string;
    leadId: string;
    accountId: string;
    connectionStatus: string;
    engagementStatus: string;
    currentAction: string;
    currentActionOutcome: string | null;
    lastActionTimestamp: string;
    nextSequenceId: string | null;
    currentSequenceId: string | null;
    isOpenProfile: boolean | null;
    leadDetails?: {
      firstName?: string;
      lastName?: string;
      linkedinUrl: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  actions: CampaignLeadAction[];
}

const CampaignLeadJourneySidebar: React.FC<CampaignLeadJourneySidebarProps> = ({
  campaignLeadId,
  open,
  onOpenChange,
  timeZone,
}) => {
  const { campaign } = useCampaignStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CampaignLeadData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get timezone: use prop, then campaign timezone, then convert display format to IANA, then local
  const effectiveTimeZone = useMemo(() => {
    if (timeZone) return displayToLuxonFormat(timeZone) || timeZone;
    if (campaign?.timeZone) {
      const ianaZone = displayToLuxonFormat(campaign.timeZone);
      return ianaZone || campaign.timeZone;
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [timeZone, campaign?.timeZone]);

  useEffect(() => {
    if (open && campaignLeadId) {
      fetchCampaignLeadData();
    } else {
      // Reset state when closed
      setData(null);
      setError(null);
    }
  }, [open, campaignLeadId]);

  const fetchCampaignLeadData = async () => {
    if (!campaignLeadId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getCampaignLeadById(campaignLeadId);
      
      if (response.status === 200 && response.data) {
        setData(response.data as CampaignLeadData);
      } else {
        setError('Failed to fetch campaign lead data');
      }
    } catch (err: any) {
      console.error('Error fetching campaign lead:', err);
      setError(err?.message || 'Failed to fetch campaign lead data');
    } finally {
      setLoading(false);
    }
  };

  const getActionStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    const variants: Record<string, string> = {
      SUCCESS: 'bg-green-100 text-green-800 border-green-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };

    return (
      <Badge
        variant="outline"
        className={variants[statusUpper] || 'bg-gray-100 text-gray-800 border-gray-200'}
      >
        {status}
      </Badge>
    );
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Extract LinkedIn username from URL
  const extractLinkedInUsername = (url: string | undefined): string => {
    if (!url) return '';
    const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
    return match ? match[1] : '';
  };

  // Get initials from name
  const getInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return `${first}${last}` || '?';
  };

  // Get profile image from actions
  const getProfileImage = (): string | null => {
    if (!data) return null;
    const fetchProfileAction = data.actions.find(
      (action) => action.actionType === 'FETCH_PROFILE' && action.actionStatus === 'SUCCESS'
    );
    return fetchProfileAction?.metadata?.data?.profileImage || null;
  };

  // Get sender account info from the most recent action with account data
  const getSenderInfo = () => {
    if (!data || !data.actions.length) return null;
    
    // Find the most recent action with account info
    const actionWithAccount = data.actions.find((action) => action.account?.profile);
    
    if (actionWithAccount?.account?.profile) {
      return {
        firstName: actionWithAccount.account.profile.firstName,
        lastName: actionWithAccount.account.profile.lastName,
        profileUrl: actionWithAccount.account.profile.profileUrl,
      };
    }
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Campaign Lead Journey</SheetTitle>
          {/* <SheetDescription>
            View the complete journey and action history for this lead
          </SheetDescription> */}
        </SheetHeader>

        {/* User Details Card */}
        {!loading && !error && data && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <img
                src={
                  getProfileImage() ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${data.campaignLead.leadDetails?.firstName || ''} ${data.campaignLead.leadDetails?.lastName || ''}`.trim() || data.campaignLead.leadDetails?.linkedinUrl.split('/in/').pop().replace('/', '').toUpperCase() || 'User'
                  )}&background=6366f1&color=fff&size=128&bold=true`
                }
                alt={`${data.campaignLead.leadDetails?.firstName || ''} ${data.campaignLead.leadDetails?.lastName || ''}`}
                className="w-12 h-12 rounded-full border border-gray-300 object-cover"
                onError={(e) => {
                  // Fallback to a simple placeholder if both profile image and avatar service fail
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=User&background=9ca3af&color=fff&size=128`;
                }}
              />
              
              {/* Lead Name and LinkedIn Link */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {`${data.campaignLead.leadDetails?.firstName || ''} ${data.campaignLead.leadDetails?.lastName || ''}`.trim() || data.campaignLead.leadDetails?.linkedinUrl.split('/in/').pop().replace('/', '') || 'Unnamed Lead'}
                  </h3>
                  {data.campaignLead.leadDetails?.linkedinUrl && (
                    <a
                      href={data.campaignLead.leadDetails.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sender section */}
            {getSenderInfo() && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sent from:</span>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 px-3 py-1.5 flex items-center gap-2">
                  {getSenderInfo()?.firstName && getSenderInfo()?.lastName ? (
                    <span>{`${getSenderInfo()?.firstName} ${getSenderInfo()?.lastName}`}</span>
                  ) : getSenderInfo()?.profileUrl ? (
                    <span>
                      {extractLinkedInUsername(getSenderInfo()?.profileUrl) || 'Unknown'}
                    </span>
                  ) : (
                    <span>Unknown</span>
                  )}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading journey data...</span>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && data && (
            <>
              {/* Campaign Lead Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lead Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Campaign</p>
                      <p className="font-medium">{data.campaign.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Campaign Status</p>
                      <Badge variant="outline">{data.campaign.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Connection Status</p>
                      <Badge variant="outline">{data.campaignLead.connectionStatus}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Engagement Status</p>
                      <Badge variant="outline">{data.campaignLead.engagementStatus}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Action</p>
                      <p className="font-medium">{data.campaignLead.currentAction}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Activity</p>
                      <p className="text-sm">
                        {formatWithAbbrev(data.campaignLead.lastActionTimestamp, effectiveTimeZone)}
                      </p>
                    </div>
                  </div>
                 
                </CardContent>
              </Card>

              {/* Actions History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Action History</CardTitle>
                  <p className="text-sm text-gray-500">
                    {data.actions.length} action{data.actions.length !== 1 ? 's' : ''} recorded
                  </p>
                </CardHeader>
                <CardContent>
                  {data.actions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No actions recorded yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {data.actions.map((action, index) => (
                        <div
                          key={action.id}
                          className="border-l-2 border-gray-200 pl-4 pb-4 relative"
                        >
                          {index < data.actions.length - 1 && (
                            <div className="absolute left-[-2px] top-6 bottom-0 w-0.5 bg-gray-200" />
                          )}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {getActionStatusIcon(action.actionStatus)}
                                <h4 className="font-medium">
                                  {formatActionType(action.actionType)}
                                </h4>
                                {getActionStatusBadge(action.actionStatus)}
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatWithAbbrev(action.createdAt, effectiveTimeZone)}
                              </p>
                              {action.account?.profile && (
                                <p className="text-xs text-gray-500">
                                  Account: {action.account.profile.firstName}{' '}
                                  {action.account.profile.lastName}
                                </p>
                              )}
                              {action.errorMessage && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                  <strong>Error:</strong> {action.errorMessage}
                                </div>
                              )}
                              {action.metadata && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                    View Metadata
                                  </summary>
                                  <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(action.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CampaignLeadJourneySidebar;

