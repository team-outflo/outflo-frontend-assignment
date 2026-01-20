import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Users, Send, MessageCircle, CheckCircle, RefreshCw, AlertCircle, ChevronDown, Filter, Search, Check, CheckCircle2, Info, Download } from 'lucide-react';
// Add this import for the dropdown components
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AsyncButton } from "@/components/async-button";
import { DateTime } from 'luxon';
import { displayToLuxonFormat, luxonToDisplayFormat, zoneMap } from '@/utils/timezoneUtils';
import { getConnectionStatusDisplay, getEngagementStatusDisplay } from '@/utils/leadStatus';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import { LEAD_NAME_MAX_LENGTH, LEADS_TABLE_MIN_WIDTHS } from '@/constants/uiConstants';
import { useCampaignStore } from '@/api/store/campaignStore';
import { getLeadsByCampaignId } from '@/api/leads/leadsApi';
import CampaignLeadJourneySidebar from '@/components/Campaign/CampaignLeadJourneySidebar';
import { LeadConnectionStatus, LeadEngagementStatus } from '@/constants/leadEnums';
import { setAnalyticsCardFilterHandler, getPendingFilter } from '@/utils/analyticsCardFilterHandler';
import { exportCampaignLeadsAsCsv } from '@/api/campaign/campaigns';
import { useToast } from '@/hooks/use-toast';

// Status enums not needed for filtering on this page anymore

// Enums moved to constants/leadEnums to avoid React Fast Refresh incompatibilities

// Define proper types based on the backend structure
interface BackendLead {
  url?: string;
  urn?: string;
  firstName?: string;
  lastName?: string;
  connectionStatus?: string;
  engagementStatus?: string;
  lastActivity?: number;
  accountId?: string;
  configID?: number;
  timestamp?: number;
  campaignLeadId?: string;
  details?: Record<string, any>; // CSV data from lead.details
  campaignLeadDetails?: Record<string, any>; // Alternative location for CSV data
}

// Frontend lead structure for the component
interface Lead {
  id: number | string;
  name: string;
  status: string;
  lastActivity: string;
  assignedAccount: string;
  url?: string;
  connectionStatus?: string;
  engagementStatus?: string;
  isAccountDeleted?: boolean;
  isAccountDisconnected?: boolean;
  isAccountSyncInactive?: boolean;
  campaignLeadId?: string;
  details?: Record<string, any>; // CSV data for display in columns
}

const CampaignAnalytics = () => {
  const { campaign, refreshLeadsData } = useCampaignStore();
  const { toast } = useToast();

  // View-only state variables
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnectionStatuses, setSelectedConnectionStatuses] = useState<string[]>([]);
  const [selectedEngagementStatuses, setSelectedEngagementStatuses] = useState<string[]>([]);
  // Remove predefined status filter; filtering is centralized upstream
  const [showDataWarning, setShowDataWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  console.log("campaign Lead", campaign)

  // Use accountDetails from campaign data instead of fetching all accounts
  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>();

    if (campaign?.senderAccounts) {
      Object.values(campaign.senderAccounts as any).forEach((account: any) => {
        if (account?.id !== undefined) {
          const displayName = `${account.firstName} ${account.lastName}`.trim() || 'Unknown';
          map.set(String(account.id), displayName);
        }
      });
    }

    return map;
  }, [campaign?.senderAccounts]);

  const getAccountName = (accountId?: string | number) => {
    if (!accountId) return 'Unassigned';
    const data = accountNameMap.get(String(accountId)) || String(accountId);
    return data
  };

  // Add the refreshLeads function
  const refreshLeads = async () => {
    if (!id) {
      throw new Error("Campaign ID is missing");
    }

    try {
      console.log("Starting refresh leads for campaign:", id);

      // Fetch first page to get pagination info and lead list metadata
      const firstPageResponse = await getLeadsByCampaignId(id, 1, 100);
      const firstPageData = firstPageResponse.data as any;
      const pagination = firstPageData?.pagination || {
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0
      };
      const leadList = firstPageData?.leadList || null;
      const leadListId = leadList?.id || campaign.leadListId || campaign.leads?.leadListId;

      if (!leadListId) {
        throw new Error("Lead list ID not found");
      }

      // Collect all leads from first page
      let allLeads = firstPageData?.leads || [];

      // If there are more pages, fetch them all in parallel
      if (pagination.totalPages > 1) {
        const remainingPages = [];
        for (let page = 2; page <= pagination.totalPages; page++) {
          remainingPages.push(getLeadsByCampaignId(id, page, pagination.pageSize));
        }

        // Fetch all remaining pages in parallel
        const remainingResponses = await Promise.all(remainingPages);
        remainingResponses.forEach((response) => {
          const pageData = (response.data as any)?.leads || [];
          allLeads = [...allLeads, ...pageData];
        });
      }

      console.log(`Fetched ${allLeads.length} leads for campaign ${id}`);

      // Update campaign store with refreshed leads
      const columnMapping = leadList?.columnMapping || campaign.leads?.columnMapping || [];
      const source = leadList?.source || campaign.leads?.source || null;
      const leadListMetadata = leadList || campaign.leads?.leadListMetadata || null;

      // Use refreshLeadsData which bypasses view mode check
      refreshLeadsData(leadListId, allLeads, columnMapping, source, leadListMetadata);

      // Verify the update
      console.log("Campaign store updated with leads:", allLeads.length);
      console.log("Lead list metadata:", leadListMetadata);

      console.log("Refresh leads completed successfully");
      return { success: true };
    } catch (error) {
      console.error("Failed to refresh leads:", error);
      throw error;
    }
  };

  // Handle CSV export
  const handleExportCsv = async () => {
    if (!id) {
      toast({
        title: "Error",
        description: "Campaign ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const { blob, filename } = await exportCampaignLeadsAsCsv(id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use filename from backend
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Campaign leads exported successfully",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error exporting campaign leads:", error);
      
      let errorMessage = "Failed to export campaign leads.";
      const errorMsg = error?.message || '';
      
      if (errorMsg.includes('400') || errorMsg.includes('DRAFT')) {
        errorMessage = "Cannot export leads from a campaign in DRAFT status.";
      } else if (errorMsg.includes('401') || errorMsg.includes('Authentication')) {
        errorMessage = "Your session may have expired. Please refresh the page and try again.";
      } else if (errorMsg.includes('404')) {
        errorMessage = "Campaign not found or not accessible.";
      } else if (errorMsg.includes('500')) {
        errorMessage = "Server error. Please try again later.";
      }
      
      toast({
        title: "Export failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };





  // Map leads data from centralized store
  const allLeads = useMemo(() => {
    if (!campaign?.leads?.data || !Array.isArray(campaign.leads.data)) return [];

    try {
      const mappedLeads = campaign.leads.data; // Already an array

      return mappedLeads.map((lead: BackendLead, index: number) => {
        // Format timestamp to readable date if available using Luxon with timezone
        let formattedDate = 'N/A';
        if (lead.timestamp) {
          const timestamp = lead.timestamp;
          try {
            const timeMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;

            const mappedTimezone = zoneMap[campaign.timeZone] || campaign.timeZone;

            formattedDate = DateTime.fromMillis(timeMs)
              .setZone(mappedTimezone)
              .toFormat('HH:mm, d MMM, yyyy (z)');
          } catch (e) {
            formattedDate = 'Invalid date';
          }
        }

        const accountName = getAccountName(lead.accountId);

        const accountDetail = campaign?.senderAccounts?.find(a => a.id === lead.accountId);

        console.log("accountxfvfvdv", accountDetail, lead.accountId, campaign?.senderAccounts);

        const isAccountDeleted = accountDetail?.isDeleted;
        const isAccountDisconnected = accountDetail?.connectionStatus === 'DISCONNECTED';
        const isAccountSyncInactive = accountDetail?.syncStatus === 'INACTIVE';

        console.log('accountDetail', accountDetail?.syncStatus);
        console.log('isAccountSyncInactive', isAccountSyncInactive);


        return {
          id: lead.urn || `lead-${lead.accountId}-${index}`,
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.url || 'Unnamed Lead',
          connectionStatus: lead.connectionStatus,
          engagementStatus: lead.engagementStatus,
          lastActivity: formattedDate,
          assignedAccount: accountName,
          accountId: lead.accountId,
          url: lead.url,
          isAccountDeleted,
          isAccountDisconnected,
          isAccountSyncInactive,
          campaignLeadId: (lead as any).campaignLeadId,
          details: lead.details || lead.campaignLeadDetails || {}, // Include CSV data
        };

      });
    } catch (error) {
      console.error("Error processing lead data:", error);
      setShowDataWarning(true);
      return []; // Return empty array on error
    }
  }, [campaign.leads, campaign?.leads?.data, campaign?.leads?.leadListId, accountNameMap, campaign.timeZone, campaign.senderAccounts]);


  // Get unique assigned accounts for dropdown with real names
  const assignedAccounts = useMemo(() => {
    return Array.from(new Set(allLeads.map(lead => lead.assignedAccount))).sort();
  }, [allLeads]);

  // Get column mapping from campaign for CSV columns
  const columnMapping = useMemo(() => {
    return campaign?.leads?.columnMapping || campaign?.leads?.leadListMetadata?.columnMapping || [];
  }, [campaign?.leads?.columnMapping, campaign?.leads?.leadListMetadata?.columnMapping]);


  console.log("columnMapping",columnMapping)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCampaignLeadId, setSelectedCampaignLeadId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Build available status lists with counts from current data
  const connectionStatusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      const key = (l.connectionStatus || '').toString().toUpperCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).map((k) => ({
      value: k,
      label: getConnectionStatusDisplay(k).label,
      count: counts[k],
    }));
  }, [allLeads]);

  const engagementStatusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      const key = (l.engagementStatus || '').toString().toUpperCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).map((k) => ({
      value: k,
      label: getEngagementStatusDisplay(k).label,
      count: counts[k],
    }));
  }, [allLeads]);

  // Apply search, assigned account, and local status filters
  const q = searchQuery.toLowerCase();
  const baseFiltered = allLeads.filter(lead => {
    const matchesSearch =
      (lead.name && lead.name.toLowerCase().includes(q)) ||
      (lead.url && lead.url.toLowerCase().includes(q));

    const matchesAccounts = selectedAccounts.length === 0 || selectedAccounts.includes(lead.assignedAccount);

    const conn = (lead.connectionStatus || '').toString().toUpperCase();
    const eng = (lead.engagementStatus || '').toString().toUpperCase();

    const matchesConn = selectedConnectionStatuses.length === 0 || selectedConnectionStatuses.includes(conn);
    const matchesEng = selectedEngagementStatuses.length === 0 || selectedEngagementStatuses.includes(eng);

    return matchesSearch && matchesAccounts && matchesConn && matchesEng;
  });

  // Deduplicate by id to avoid accidental duplicates on re-renders or upstream merges
  const seenIds = new Set<string>();
  const filteredLeads = baseFiltered.filter((lead: any) => {
    const key = String(lead.id ?? '');
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });


  // Removed legacy getStatusDisplay mapping in favor of shared util + engagement mapping

  const shortenLinkedInUrl = (url: string | undefined): string => {
    if (!url) return '';

    // For LinkedIn profile URLs
    if (url.includes('linkedin.com/in/')) {
      // Extract username part
      const username = url.split('/in/')[1]?.split('/')[0] || '';
      if (username.length > 10) {
        return `linkedin.com/in/${username.substring(0, 8)}...`;
      } else {
        return `linkedin.com/in/${username}`;
      }
    }

    // For other LinkedIn URLs
    if (url.includes('linkedin.com')) {
      const parts = url.replace('https://', '').replace('http://', '').replace('www.', '').split('/');
      if (parts.length > 2 && parts[1].length > 10) {
        return `${parts[0]}/${parts[1].substring(0, 8)}...`;
      }
      return url.replace('https://www.', '').replace('http://www.', '').substring(0, 25) + '...';
    }

    // For non-LinkedIn URLs
    if (url.length > 30) {
      return url.substring(0, 27) + '...';
    }

    return url;
  };

  // Handle analytics card clicks to filter leads
  const handleCardClick = useCallback((filterType: 'connectionRequests' | 'requestsAccepted' | 'messagesSent' | 'responses') => {
    // Clear existing filters first
    setSelectedConnectionStatuses([]);
    setSelectedEngagementStatuses([]);
    setSearchQuery('');

    // Apply filters based on card type (matching backend logic)
    switch (filterType) {
      case 'connectionRequests':
        // Connection Requests: CONNECTION_SENT or CONNECTION_ACCEPTED
        setSelectedConnectionStatuses([
          LeadConnectionStatus.CONNECTION_SENT,
          LeadConnectionStatus.CONNECTION_ACCEPTED
        ]);
        break;

      case 'requestsAccepted':
        // Requests Accepted: CONNECTION_ACCEPTED only
        setSelectedConnectionStatuses([
          LeadConnectionStatus.CONNECTION_ACCEPTED
        ]);
        break;

      case 'messagesSent':
        // Messages Sent: IN_SEQUENCE, SUCCESSFULLY_ENGAGED, or COMPLETED
        setSelectedEngagementStatuses([
          LeadEngagementStatus.IN_SEQUENCE,
          LeadEngagementStatus.SUCCESSFULLY_ENGAGED,
          LeadEngagementStatus.COMPLETED
        ]);
        break;

      case 'responses':
        // Responses: ALREADY_ENGAGED or SUCCESSFULLY_ENGAGED
        setSelectedEngagementStatuses([
          LeadEngagementStatus.ALREADY_ENGAGED,
          LeadEngagementStatus.SUCCESSFULLY_ENGAGED
        ]);
        break;
    }
  }, []);

  // Register the filter handler so CampaignEditorPage can access it
  useEffect(() => {
    setAnalyticsCardFilterHandler(handleCardClick);

    // Check if there's a pending filter to apply
    const pendingFilter = getPendingFilter();
    if (pendingFilter) {
      handleCardClick(pendingFilter);
    }

    return () => {
      setAnalyticsCardFilterHandler(null);
    };
  }, [handleCardClick]);


  // Connection status display now sourced from shared util in utils/leadStatus

  // getEngagementStatusDisplay imported from utils/leadStatus




  // Engagement status dropdown removed on this page


  // Connection status dropdown removed on this page

  return (
    <div className="space-y-6">
      {/* Data Warning */}
      {showDataWarning && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
          <AlertDescription className="text-amber-800">
            Some lead data couldn't be processed correctly. The display might be incomplete.
          </AlertDescription>
        </Alert>
      )}

      {/* Leads Table with Refresh Button */}
      <Card className="bg-white">
        <CardHeader className="bg-white border-b rounded-t-lg border-gray-100 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Campaign Leads ({filteredLeads.length})</CardTitle>
            </div>
          
            {campaign.leads?.fileName && (
              <div className="">
                <TooltipInfo
                  trigger={
                    <div className="inline-flex items-center gap-2 cursor-pointer">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-sm">
                        <span className="text-gray-700">Leads List: </span>
                        <span className="text-gray-500 font-semibold"> {campaign.leads?.fileName}</span>

                      </span>
                      <Info className="w-5 h-5 text-gray-700" />
                    </div>
                  }
                  content="These leads are saved in this list for future use. You can import this list directly into any campaign later from Import Leads → Add from My List."
                  side="top"
                  align="center"
                />
              </div>)}


            <div className="flex items-center gap-3">

              {/* Export CSV button */}
              <Button
                onClick={handleExportCsv}
                disabled={isExporting || !id || allLeads.length === 0}
                variant="outline"
                size="sm"
                className="text-sm"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>

              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border">
                {filteredLeads.length} of {allLeads.length} Leads
              </div>

              {/* Add AsyncButton for refreshing leads */}
              <AsyncButton
                onClick={refreshLeads}
                label="Refresh Leads Status"
                loadingLabel="Refreshing..."
                successMessage="Leads Status refreshed successfully"
                errorMessage="Failed to refresh leads status"
                variant="outline"
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
                className="text-sm"
              />
            </div>
          </div>
        </CardHeader>



        {/* Active filters display */}
        {(searchQuery || selectedAccounts.length > 0 || selectedConnectionStatuses.length > 0 || selectedEngagementStatuses.length > 0) && (
          <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-700 flex items-center gap-1">
                <Search className="w-3 h-3" />
                <span>{searchQuery}</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-blue-700/70 hover:text-blue-800"
                >
                  &times;
                </button>
              </Badge>
            )}

            {/* Connection Status chips */}
            {selectedConnectionStatuses.map((s) => {
              const d = getConnectionStatusDisplay(s);
              return (
                <Badge key={`conn-chip-${s}`} variant="outline" className={`${d.className} flex items-center gap-1`}>
                  <span>{d.label}</span>
                  <button
                    onClick={() => setSelectedConnectionStatuses(selectedConnectionStatuses.filter(v => v !== s))}
                    className="ml-1 opacity-70 hover:opacity-100"
                  >
                    &times;
                  </button>
                </Badge>
              );
            })}

            {/* Engagement Status chips */}
            {selectedEngagementStatuses.map((s) => {
              const d = getEngagementStatusDisplay(s);
              return (
                <Badge key={`eng-chip-${s}`} variant="outline" className={`${d.className} flex items-center gap-1`}>
                  <span>{d.label}</span>
                  <button
                    onClick={() => setSelectedEngagementStatuses(selectedEngagementStatuses.filter(v => v !== s))}
                    className="ml-1 opacity-70 hover:opacity-100"
                  >
                    &times;
                  </button>
                </Badge>
              );
            })}

            {selectedAccounts.map(account => (
              <Badge
                key={account}
                variant="outline"
                className="bg-purple-50 border-purple-100 text-purple-700 flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{account}</span>
                <button
                  onClick={() => setSelectedAccounts(selectedAccounts.filter(a => a !== account))}
                  className="ml-1 text-purple-700/70 hover:text-purple-800"
                >
                  &times;
                </button>
              </Badge>
            ))}

            {(searchQuery || selectedAccounts.length > 0 || selectedConnectionStatuses.length > 0 || selectedEngagementStatuses.length > 0) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAccounts([]);
                  setSelectedConnectionStatuses([]);
                  setSelectedEngagementStatuses([]);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 ml-auto underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={`bg-gray-50 hover:bg-gray-50 border-b border-gray-200 bg-blue-50/30`}>
                  <TableHead className="font-medium text-gray-700 py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.LEAD}px` }}>Lead</TableHead>
                  <TableHead className="font-medium text-gray-700 py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.CONNECTION_STATUS}px` }}>
                    <div className="flex items-center space-x-1">
                      <span>Connection Status</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-5 w-5 ml-1 hover:bg-gray-200 rounded-sm"
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-white border border-gray-200 shadow-md rounded-md p-1">
                          <div
                            className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => setSelectedConnectionStatuses([])}
                          >
                            <span className="text-sm font-medium">All</span>
                            <Badge className="ml-auto bg-gray-100 text-gray-600 hover:bg-gray-200">{allLeads.length}</Badge>
                          </div>
                          {connectionStatusOptions.map((s) => {
                            const active = selectedConnectionStatuses.includes(s.value);
                            return (
                              <div
                                key={`conn-head-${s.value}`}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setSelectedConnectionStatuses((prev) =>
                                    prev.includes(s.value) ? prev.filter((v) => v !== s.value) : [...prev, s.value]
                                  );
                                }}
                              >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center mr-2 ${active ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                  {active && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm">{s.label}</span>
                                <Badge className="ml-auto bg-gray-100 text-gray-600 hover:bg-gray-200">{s.count}</Badge>
                              </div>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.ENGAGEMENT_STATUS}px` }}>
                    <div className="flex items-center space-x-1">
                      <span>Engagement Status</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-5 w-5 ml-1 hover:bg-gray-200 rounded-sm"
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-white border border-gray-200 shadow-md rounded-md p-1">
                          <div
                            className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => setSelectedEngagementStatuses([])}
                          >
                            <span className="text-sm font-medium">All</span>
                            <Badge className="ml-auto bg-gray-100 text-gray-600 hover:bg-gray-200">{allLeads.length}</Badge>
                          </div>
                          {engagementStatusOptions.map((s) => {
                            const active = selectedEngagementStatuses.includes(s.value);
                            return (
                              <div
                                key={`eng-head-${s.value}`}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setSelectedEngagementStatuses((prev) =>
                                    prev.includes(s.value) ? prev.filter((v) => v !== s.value) : [...prev, s.value]
                                  );
                                }}
                              >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center mr-2 ${active ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                  {active && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm">{s.label}</span>
                                <Badge className="ml-auto bg-gray-100 text-gray-600 hover:bg-gray-200">{s.count}</Badge>
                              </div>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.LAST_ACTIVITY}px` }}>Last Activity</TableHead>

                  {/* Add dropdown to Assigned Account column */}
                  <TableHead className="font-medium text-gray-700 py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.ASSIGNED_ACCOUNT}px` }}>
                    <div className="flex items-center space-x-1">
                      <span>Assigned Account</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-5 w-5 ml-1 hover:bg-gray-200 rounded-sm"
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 bg-white border border-gray-200 shadow-md rounded-md p-1 max-h-64 overflow-y-auto">
                          {/* Select All option */}
                          <div
                            className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => {
                              if (selectedAccounts.length === assignedAccounts.length) {
                                setSelectedAccounts([]);
                              } else {
                                setSelectedAccounts([...assignedAccounts]);
                              }
                            }}
                          >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center mr-2 ${selectedAccounts.length === assignedAccounts.length
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-300"
                              }`}>
                              {selectedAccounts.length === assignedAccounts.length && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium">All Accounts</span>
                            <Badge className="ml-auto bg-gray-100 text-gray-600 hover:bg-gray-200">
                              {allLeads.length}
                            </Badge>
                          </div>

                          {/* Account options */}
                          {assignedAccounts.map((account) => {
                            const isSelected = selectedAccounts.includes(account);
                            const count = allLeads.filter(lead => lead.assignedAccount === account).length;

                            console.log('account', account);
                            console.log('leads for account', allLeads);

                            return (
                              <div
                                key={account}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAccounts(selectedAccounts.filter(a => a !== account));
                                  } else {
                                    setSelectedAccounts([...selectedAccounts, account]);
                                  }
                                }}
                              >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center mr-2 ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                                  }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm truncate max-w-[180px]">{account}</span>
                                <Badge className="ml-auto bg-gray-100 text-gray-600 hover:bg-gray-200">
                                  {count}
                                </Badge>
                              </div>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableHead>

                  {/* CSV Data Columns from Column Mapping */}
                  {columnMapping.map((mapping) => (
                    <TableHead
                      key={mapping.normalisedColumnName}
                      className="font-medium text-gray-700 py-3 px-4 whitespace-nowrap"
                      style={{ minWidth: '150px', maxWidth: '200px' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">
                          {mapping.csvColumnName}
                        </span>
                        <TooltipInfo
                          trigger={
                            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0" />
                          }
                          content={
                            <div className="font-normal">
                           Inserted as <span className="font-bold">{mapping.normalisedColumnName}</span>
                            </div>
                        }
                          side="top"
                          align="center"
                        />
                      </div>
                    </TableHead>
                  ))}

                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + columnMapping.length} className="text-center py-8 text-gray-500">
                      {allLeads.length === 0 ? "No Valid leads found" : "No leads found matching your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    return (
                      <TableRow
                        key={lead.id} // Ensure lead.id is unique and stable
                        className={`hover:bg-gray-50 transition-colors border-b border-gray-100`}
                      >
                        <TableCell className="py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.LEAD}px` }}>
                          {(() => {
                            const fullText = lead.name || shortenLinkedInUrl(lead.url) || 'N/A';
                            const shouldTruncate = fullText.length > LEAD_NAME_MAX_LENGTH;
                            const display = shouldTruncate ? `${fullText.slice(0, LEAD_NAME_MAX_LENGTH)}…` : fullText;
                            
                            // If campaignLeadId exists, make it clickable to open sidebar
                            if (lead.campaignLeadId) {
                              const handleClick = (e: React.MouseEvent) => {
                                e.preventDefault();
                                setSelectedCampaignLeadId(lead.campaignLeadId || null);
                                setIsSidebarOpen(true);
                              };
                              
                              const clickableElement = (
                                <button
                                  onClick={handleClick}
                                  className="text-blue-600 hover:underline font-medium cursor-pointer text-left"
                                >
                                  {display}
                                </button>
                              );
                              
                              return shouldTruncate ? (
                                <TooltipInfo trigger={clickableElement} content={fullText} side="top" align="start" />
                              ) : (
                                clickableElement
                              );
                            }
                            
                            // Fallback to regular link if no campaignLeadId
                            const linkProps = {
                              href: lead.url || '#',
                              target: lead.url ? '_blank' : '_self',
                              rel: 'noopener noreferrer',
                              className: `text-gray-900 font-medium ${lead.url ? 'hover:underline' : 'cursor-default'}`,
                            } as const;
                            return shouldTruncate ? (
                              <TooltipInfo trigger={<a {...linkProps}>{display}</a>} content={fullText} side="top" align="start" />
                            ) : (
                              <a {...linkProps}>{display}</a>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.CONNECTION_STATUS}px` }}>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getConnectionStatusDisplay(lead.connectionStatus).className} inline-block min-w-0`}>
                            {/* <span className={`px-2.5 py-1 rounded-full text-xs font-medium border  inline-block min-w-0`}> */}
                            {getConnectionStatusDisplay(lead.connectionStatus).label || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.ENGAGEMENT_STATUS}px` }}>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getEngagementStatusDisplay(lead.engagementStatus).className} inline-block min-w-0`}>
                            {getEngagementStatusDisplay(lead.engagementStatus).label || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600 py-3 px-4 text-sm" style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.LAST_ACTIVITY}px` }}>{lead.lastActivity}</TableCell>
                        <TableCell className={`py-3 px-4 text-sm font-medium ${lead.isAccountDeleted ? 'text-red-700 font-bold' :
                          'text-gray-700'
                          }`} style={{ minWidth: `${LEADS_TABLE_MIN_WIDTHS.ASSIGNED_ACCOUNT}px` }}>
                          <div className="flex items-center gap-2">
                            <span>{lead.assignedAccount}</span>
                            {lead.isAccountDeleted && (
                              <span className="text-xs text-red-600 font-bold bg-red-100 px-2 py-1 rounded">DELETED</span>
                            )}
                            {lead.isAccountDisconnected && !lead.isAccountDeleted && (
                              <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded">Disconnected</span>
                            )}
                            {lead.isAccountSyncInactive && !lead.isAccountDeleted && !lead.isAccountDisconnected && (
                              <span className="text-xs text-yellow-700 font-medium bg-yellow-100 px-2 py-1 rounded">Sync Inactive</span>
                            )}
                          </div>
                        </TableCell>
                        {/* CSV Data Columns */}
                        {columnMapping.map((mapping) => {
                          const value = lead.details?.[mapping.normalisedColumnName];
                          const displayValue = value !== null && value !== undefined ? String(value) : '';
                          const finalValue = displayValue || '-';
                          // Check if content is likely to be truncated (roughly 25-30 chars fit in 200px with truncate)
                          const isTruncated = finalValue.length > 25;
                          
                          return (
                            <TableCell
                              key={mapping.normalisedColumnName}
                              className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap"
                              style={{ minWidth: '150px', maxWidth: '300px' }}
                            >
                              {isTruncated ? (
                                <TooltipInfo
                                  trigger={
                                    <div className="truncate">
                                      {finalValue}
                                    </div>
                                  }
                                  content={finalValue}
                                  side="top"
                                  align="start"
                                />
                              ) : (
                                <div className="truncate">
                                  {finalValue}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        {/* Remove edit/update cell, view-only mode */}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Lead Journey Sidebar */}
      <CampaignLeadJourneySidebar
        campaignLeadId={selectedCampaignLeadId}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />
    </div>
  );
};

export default CampaignAnalytics;
