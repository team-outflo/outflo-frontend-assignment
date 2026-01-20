import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Users, Send, MessageCircle, Loader2, BarChart3, Pause, Eye, Play, Badge, AlertCircle, CheckCircle, Clock, XCircle, Info, Trash2, Timer, Reply, UserPlus } from 'lucide-react';
import { StatusBadge } from '@/components/Campaign/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCampaignsQuery } from '@/hooks/useCampaignQueries';
import { useCampaignInsightsQueries } from '@/hooks/useCampaignInsights';
import { CampaignState } from '@/types/campaigns';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateCampaign, useDeleteCampaign } from '@/hooks/useCampaignMutations';
import { toast } from "@/components/ui/use-toast";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { PauseGhostIcon, PauseOutlineIcon, RunningGhostIcon, RunningOutlineIcon } from '@/components/icons';
import { CreateCampaignModal } from '@/components/Campaign/CreateCampaignModal';
import { useCreateDraftCampaignFlow } from '@/hooks/useCreateDraftCampaignFlow';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

const CampaignsListContent = () => {

  // Get campaign status from insights data - only show dynamic status when ACTIVE
  const getCampaignStatus = (campaign: any) => {
    const campaignStatus = campaign.insights?.campaignStatus;
    const dynamicStatus = campaign.insights?.dynamicStatus?.status;

    // Only show dynamic status if campaign is ACTIVE, otherwise always show campaign status
    if (campaignStatus === 'ACTIVE' && dynamicStatus) {
      return dynamicStatus;
    }

    return campaignStatus || 'Unknown';
  };
  // Add search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for creating new campaign
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createDraftCampaign, isLoading: isCreatingDraft } = useCreateDraftCampaignFlow();

  // Use the campaigns API hook
  const { data: campaigns = [], isLoading, error } = useCampaignsQuery();
  // Extract campaign IDs for insights fetching
  const campaignIds = campaigns.map(campaign => campaign.id).filter(Boolean);

  // Use the insights queries hook
  const {
    data: campaignInsightsMap = {},
    isLoading: insightsLoading
  } = useCampaignInsightsQueries(campaignIds);

  // Filter campaigns based on search query and merge with insights
  const filteredCampaignsWithInsights = React.useMemo(() => {
    console.log("Campaigns data:", campaigns);
    console.log("Campaign insights map:", campaignInsightsMap);

    // First, filter campaigns by name and status
    const filteredCampaigns = campaigns.filter(campaign => {
      // Filter by search query
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    // Then merge with insights
    return filteredCampaigns.map(campaign => ({
      ...campaign,
      insights: campaignInsightsMap[campaign.id] || {
        totalLeads: 0,
        connectionRequestsSent: 0,
        connectionRequestsAccepted: 0,
        messagesSent: 0,
        responses: 0,
        campaignStatus: 'Unknown',
        dynamicStatus: {
          status: 'Unknown',
          details: {
            totalLeads: 0,
            processedLeads: 0,
            failedLeads: 0,
            pendingLeads: 0,
            failureRate: 0,
            hasActiveActions: false
          },
          lastCalculated: new Date().toISOString()
        }
      }
    }));
  }, [campaigns, campaignInsightsMap, searchQuery]);

  // Calculate total statistics using the filtered campaigns data
  const totalLeads = filteredCampaignsWithInsights.reduce((sum, c) => {
    if (c.insights) {
      return sum + (c.insights.totalLeads || 0);
    }
    return sum;
  }, 0);
  const totalSent = filteredCampaignsWithInsights.reduce((sum, c) => {
    // If we have insights, use them
    if (c.insights) {
      return sum + (c.insights.connectionRequestsSent || 0);
    }
    return sum;
  }, 0);

  const totalAccepted = filteredCampaignsWithInsights.reduce((sum, c) => {
    if (c.insights) {
      return sum + (c.insights.connectionRequestsAccepted || 0);
    }
    return sum;
  }, 0);

  const totalReplies = filteredCampaignsWithInsights.reduce((sum, c) => {
    if (c.insights) {
      return sum + (c.insights.responses || 0);
    }
    return sum;
  }, 0);

  // Count active campaigns from filtered list using the new status logic
  const activeCampaigns = filteredCampaignsWithInsights.filter(c => {
    const status = getCampaignStatus(c);
    return status === 'ACTIVE' || status === 'RUNNING' || status === 'PROCESSING';
  }).length;



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'RUNNING':
      case 'PROCESSING':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'QUEUED':
        return 'text-queued-violet-text bg-queued-violet-bg border-violet-200';
      case 'INACTIVE':
      case 'REJECTED':
      case 'DELETED':
      case 'STOPPED':
      case 'FAILED':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'COMPLETED':
      case 'SUCCESS':
      case 'NO_MORE_PENDING_ACTIONS':
      case 'FINISHED':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'DRAFT':
      case 'NOT_STARTED':
      case 'PENDING':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Get dynamic status icon
  const getDynamicStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <RunningGhostIcon className="w-4 h-4" />;
      case 'PAUSED':
        return <PauseGhostIcon className="w-3 h-3" />;
      case 'QUEUED':
        return <Timer className="w-3.5 h-3.5" />;
      case 'NO_MORE_PENDING_ACTIONS':
        return <CheckCircle className="w-3 h-3" />;
      case 'FINISHED':
        return <CheckCircle className="w-3 h-3" />;
      case 'FAILED':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  // Get dynamic status color
  const getDynamicStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'QUEUED':
        return 'text-queued-violet-text bg-queued-violet-bg border-violet-200';
      case 'NO_MORE_PENDING_ACTIONS':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'FINISHED':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'FAILED':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Format date from epoch timestamp
  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return 'Unknown';

    try {
      let date: Date;

      if (typeof timestamp === 'string') {
        // Case 1: ISO date string
        if (!isNaN(Date.parse(timestamp))) {
          date = new Date(timestamp);
        } else {
          // Case 2: numeric string
          const num = parseInt(timestamp, 10);
          if (isNaN(num)) return 'Invalid Date';
          date = new Date(num < 10000000000 ? num * 1000 : num);
        }
      } else {
        // Case 3: number input
        date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      }

      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return 'Invalid Date';
    }
  };
  // Add this new helper function for relative time display
  const getRelativeTime = (timestamp?: number | string) => {
    if (!timestamp) return '';

    try {
      let date: Date;

      if (typeof timestamp === 'string') {
        // If it's an ISO date string
        if (!isNaN(Date.parse(timestamp))) {
          date = new Date(timestamp);
        } else {
          // Otherwise treat it like a numeric string
          const num = parseInt(timestamp, 10);
          if (isNaN(num)) return '';
          date = new Date(num < 10000000000 ? num * 1000 : num);
        }
      } else {
        // If it's a number
        date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      }

      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'In the future'; // optional case
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      }

      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } catch {
      return '';
    }
  };

  // Dynamic Status Tooltip Component
  const DynamicStatusTooltip = ({ campaign }: { campaign: any }) => {
    const dynamicStatus = campaign.insights?.dynamicStatus;
    if (!dynamicStatus) return null;

    const totalLeads = dynamicStatus?.totalLeads || 0;
    const processingLeads = dynamicStatus?.processingLeads || 0;
    const processedLeads = dynamicStatus?.processedLeads || 0;
    const failedLeads = dynamicStatus?.failedLeads || 0;
    const waitingActions = dynamicStatus?.waitingActions || 0;
    const failureRate = dynamicStatus?.failureRate || 0;

    // Calculate percentages for donut chart
    const processingPercent = totalLeads > 0 ? (processingLeads / totalLeads) * 100 : 0;
    const processedPercent = totalLeads > 0 ? (processedLeads / totalLeads) * 100 : 0;
    const failedPercent = totalLeads > 0 ? (failedLeads / totalLeads) * 100 : 0;
    const waitingPercent = totalLeads > 0 ? (waitingActions / totalLeads) * 100 : 0;

    return (
      <div className="p-6 space-y-4 min-w-[320px] bg-white">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg text-gray-900">Current Lead Status</h4>
          <div className="flex items-center gap-2">
            {getDynamicStatusIcon(dynamicStatus.status)}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDynamicStatusColor(dynamicStatus.status)}`}>
              {dynamicStatus.status}
            </span>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="flex items-center justify-center py-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              {/* Processing segment */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${processingPercent * 1.01} ${100 - processingPercent * 1.01}`}
                strokeDashoffset="0"
                className="transition-all duration-500"
              />
              {/* Processed segment */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray={`${processedPercent * 1.01} ${100 - processedPercent * 1.01}`}
                strokeDashoffset={`-${processingPercent * 1.01}`}
                className="transition-all duration-500"
              />
              {/* Failed segment */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeDasharray={`${failedPercent * 1.01} ${100 - failedPercent * 1.01}`}
                strokeDashoffset={`-${(processingPercent + processedPercent) * 1.01}`}
                className="transition-all duration-500"
              />
              {/* Waiting Actions segment */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray={`${waitingPercent * 1.01} ${100 - waitingPercent * 1.01}`}
                strokeDashoffset={`-${(processingPercent + processedPercent + failedPercent) * 1.01}`}
                className="transition-all duration-500"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalLeads}</div>
                <div className="text-xs text-gray-500">Total Leads</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-700">Processing</span>
            </div>
            <div className="text-lg font-bold text-blue-600">{processingLeads}</div>
            <div className="text-xs text-gray-500">{processingPercent.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-700">Processed</span>
            </div>
            <div className="text-lg font-bold text-green-600">{processedLeads}</div>
            <div className="text-xs text-gray-500">{processedPercent.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-700">Failed</span>
            </div>
            <div className="text-lg font-bold text-red-600">{failedLeads}</div>
            <div className="text-xs text-gray-500">{failedPercent.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-700">Waiting</span>
            </div>
            <div className="text-lg font-bold text-yellow-600">{waitingActions}</div>
            <div className="text-xs text-gray-500">{waitingPercent.toFixed(1)}%</div>
          </div>
        </div>

        {/* Failure Rate */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Failure Rate</span>
            <span className={`text-lg font-bold ${failureRate > 50 ? 'text-red-600' : failureRate > 20 ? 'text-yellow-600' : 'text-green-600'}`}>
              {failureRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${failureRate > 50 ? 'bg-red-500' : failureRate > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(failureRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {formatDate(dynamicStatus.lastCalculated)} at {format(new Date(dynamicStatus.lastCalculated), 'h:mm a')}
          </div>
        </div>
      </div>
    );
  };


  const queryClient = useQueryClient();
  const { mutateAsync: updateCampaign, isPending: isUpdating } = useUpdateCampaign();
  const { mutateAsync: deleteCampaign, isPending: isDeleting } = useDeleteCampaign();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [insightsRefreshing, setInsightsRefreshing] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);

  // Add this helper function
  const handleCampaignStatusChange = async (campaignId: string, newState: CampaignState) => {
    if (!campaignId) return;

    setActionInProgress(campaignId);

    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      await updateCampaign({
        campaignId,
        campaignData: {
          name: campaign.name,
          description: campaign.description || '',
          status: newState
        }
      });

      // Refresh campaign data and insights
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaignInsights', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignInsights'] });

      // Show insights refreshing state
      setInsightsRefreshing(campaignId);

      // Wait for insights to actually refresh before clearing loading state
      await queryClient.refetchQueries({ queryKey: ['campaignInsights', campaignId] });
      setInsightsRefreshing(null);

      const actionText =
        newState === CampaignState.PAUSED ? 'paused' :
          newState === CampaignState.RUNNING ? 'resumed' : 'stopped';

      toast({
        title: 'Success',
        description: `Campaign ${actionText} successfully`
      });
    } catch (error) {
      console.error('Failed to update campaign status:', error);
      toast({
        variant: "destructive",
        title: 'Action failed',
        description: 'Could not update campaign status. Please try again.'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle delete campaign for draft campaigns
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!campaignId) return;

    setActionInProgress(campaignId);

    try {
      await deleteCampaign({ campaignId });

      toast({
        title: 'Success',
        description: 'Campaign deleted successfully'
      });

      // Close the confirmation dialog
      setDeleteConfirmOpen(false);
      setCampaignToDelete(null);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast({
        variant: "destructive",
        title: 'Delete failed',
        description: 'Could not delete campaign. Please try again.'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle delete button click - show confirmation dialog for draft campaigns
  const handleDeleteClick = (campaign: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCampaignToDelete({ id: campaign.id, name: campaign.name });
    setDeleteConfirmOpen(true);
  };


  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-3">
            Campaigns
          </h1>
        </div>

        <Button
          className="bg-[#5a41cd] hover:bg-[#5a41cd]/90  text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 px-6 py-3 text-base font-semibold"
          onClick={() => {
            console.log('Create campaign button clicked');
            setIsCreateModalOpen(true);
          }}
        >
          <Plus className="w-5 h-5" />
          Start New Campaign
        </Button>

        <CreateCampaignModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCreateCampaign={createDraftCampaign}
          isLoading={isCreatingDraft}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : campaigns.length}
            </div>
            <p className="text-sm text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Active Campaigns</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : activeCampaigns}
            </div>
            <p className="text-sm text-gray-500">Currently running</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalLeads}
            </div>
            <p className="text-sm text-gray-500">Prospects reached</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Replies</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <Reply className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalReplies}
            </div>
            <p className="text-sm text-gray-500">Engagement received</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="border shadow-xl mb-8 overflow-hidden rounded-xl bg-white">
        {/* <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex flex-row justify-between items-center"> */}
        {/* <CardTitle className="text-xl font-semibold text-gray-900">Campaign Overview</CardTitle> */}
        {/* <div className="flex items-center gap-3"> */}
        {/* Add search input */}
        {/* <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div> */}
        {/* <Button variant="outline" size="sm" className="text-xs">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filter
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              Export
            </Button> */}
        {/* </div> */}
        {/* </CardHeader> */}

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg text-gray-700">Loading campaigns...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 px-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-4xl">!</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Error loading campaigns</h3>
              <p className="text-red-600 mb-8 max-w-md mx-auto">
                {error ? String(error) : "An unexpected error occurred"}
              </p>
            </div>
          ) : filteredCampaignsWithInsights.length === 0 ? (
            <div className="text-center py-16 px-6">
              {searchQuery ? (
                // Show no results message when searching
                <div>
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">No matching campaigns</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    No campaigns found matching "{searchQuery}". Try a different search term.
                  </p>
                  <Button onClick={() => setSearchQuery('')} className="bg-primary text-white">
                    Clear search
                  </Button>
                </div>
              ) : (
                // Show empty state when no campaigns exist
                <div>
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-purple-200 rounded-full flex items-center justify-center">
                    <Plus className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">Ready to start your first campaign?</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Create targeted outreach campaigns and connect with your ideal prospects through personalized messaging.
                  </p>
                  <Button
                    className="bg-[#5a41cd] hover:bg-[#5a41cd]/90  text-white shadow-lg hover:shadow-xl transition-all duration-300  gap-3 px-6 py-3 text-base font-semibold"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create Your First Campaign
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table >

                  <TableHeader className=''>
                  <TableRow className="bg-gray-50 hover:bg-gray-100 text-xs">
                    <TableHead className="text-gray-700 cursor-pointer hover:text-primary transition-colors uppercase">
                      <div className="flex items-center">
                        Campaign Name
                        {/* <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg> */}
                      </div>
                    </TableHead>

                    <TableHead className="font-semibold text-gray-700  text-center uppercase">Status</TableHead>
                    <TableHead className="text-center">
                      <TooltipInfo
                        trigger={
                          <div className="flex items-center gap-2 justify-center font-semibold text-gray-700 cursor-pointer">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span>LEADS</span>
                          </div>

                        }
                        content="Total number of leads added to this campaign for processing."
                        side="bottom"
                        contentClassName="font-normal"
                      />
                    </TableHead>
                    <TableHead className="text-center">
                      <TooltipInfo
                        trigger={
                          <div className="flex items-center gap-2 justify-center font-semibold text-gray-700 cursor-pointer">
                            <UserPlus className="w-4 h-4 text-blue-500" />
                            <span>SENT</span>
                          </div>
                        }
                        content="Number of new connection requests successfully sent in this campaign."
                        side="bottom"
                        contentClassName="font-normal"
                      />
                    </TableHead>
                    {/* <TableHead className="font-semibold text-center text-gray-700">
                      <div className="flex items-center gap-1 justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>CONNECTED</span>
                      </div>
                    </TableHead> */}
                    <TableHead className="font-semibold text-center text-gray-700">
                      <TooltipInfo
                        trigger={
                          <div className="flex items-center gap-2 justify-center font-semibold text-gray-700 cursor-pointer">
                            <MessageCircle className="w-4 h-4 text-orange-500" />
                            <span>MESSAGES</span>
                          </div>
                        }
                        content="Total number of messages delivered across all sequence steps. Includes follow-ups and multiple messages sent to the same lead."
                        side="bottom"
                        contentClassName="font-normal"
                      />
                    </TableHead>
                    <TableHead className="text-center">
                      <TooltipInfo
                        trigger={
                          <div className="flex items-center gap-2 justify-center font-semibold text-gray-700 cursor-pointer">
                            <Reply className="w-4 h-4 text-green-500" />
                            <span>REPLIES</span>
                          </div>
                        }
                        content="Number of unique leads who replied in this campaign."
                        side="bottom"
                        contentClassName="font-normal"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase">Created</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase">Actions</TableHead>
                  </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredCampaignsWithInsights.map((campaign) => {
                    // Determine campaign status (check both state and status fields, and insights)
                    const campaignStatus = campaign.state || campaign.status || campaign.insights?.campaignStatus;
                    const isDraft = campaignStatus === 'DRAFT' || campaignStatus === CampaignState.DRAFT;
                    const campaignRoute = isDraft ? `/campaign/edit/${campaign.id}` : `/campaign/view/${campaign.id}`;

                    return (
                      <TableRow
                        key={campaign.id}
                        className="group border-b hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer"
                        onClick={() => {
                          window.location.href = campaignRoute;
                        }}
                      >
                        <TableCell className="font-semibold text-gray-900 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-primary mr-3 flex items-center justify-center text-white font-bold">
                              {campaign.name.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className='hover:underline cursor-pointer'
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = campaignRoute;
                              }}
                            >
                              {campaign.name}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {insightsLoading || insightsRefreshing === campaign.id ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-gray-500 text-sm">
                                {insightsRefreshing === campaign.id ? 'Refreshing...' : 'Loading...'}
                              </span>
                            </div>
                          ) : (
                            (() => {
                              const status = getCampaignStatus(campaign);
                              const campaignStatus = campaign.insights?.campaignStatus;
                              const hasDynamicStatus = campaign.insights?.dynamicStatus && campaignStatus === 'ACTIVE';
                              const isPaused = campaignStatus === 'PAUSED';

                              return (
                                <div className="flex items-center justify-center">
                                  {(() => {
                                    let bg = 'bg-gray-50';
                                    let ring = 'ring-gray-200';
                                    let text = 'text-gray-800';
                                    switch (status) {
                                      case 'ACTIVE':
                                      case 'RUNNING':
                                      case 'PROCESSING':
                                        bg = 'bg-blue-50';
                                        ring = 'ring-blue-200';
                                        text = 'text-blue-800';
                                        break;
                                      case 'PAUSED':
                                        bg = 'bg-amber-50';
                                        ring = 'ring-amber-200';
                                        text = 'text-amber-800';
                                        break;
                                      case 'QUEUED':
                                        bg = 'bg-queued-violet-bg';
                                        ring = 'ring-violet-200';
                                        text = 'text-queued-violet-text';
                                        break;
                                      case 'COMPLETED':
                                      case 'SUCCESS':
                                        bg = 'bg-blue-50';
                                        ring = 'ring-blue-200';
                                        text = 'text-blue-800';
                                        break;
                                      case 'FAILED':
                                      case 'INACTIVE':
                                      case 'REJECTED':
                                      case 'DELETED':
                                      case 'STOPPED':
                                        bg = 'bg-red-50';
                                        ring = 'ring-red-200';
                                        text = 'text-red-800';
                                        break;
                                      case 'NO_MORE_PENDING_ACTIONS':
                                      case 'FINISHED':
                                        bg = 'bg-green-50';
                                        ring = 'ring-green-200';
                                        text = 'text-green-800';
                                        break;
                                      default:
                                        bg = 'bg-gray-50';
                                        ring = 'ring-gray-200';
                                        text = 'text-gray-800';
                                    }

                                    const label = isPaused
                                      ? 'Paused'
                                      : status === 'QUEUED'
                                        ? 'Queued'
                                        : (typeof status === 'string'
                                          ? status
                                            .split('_')
                                            .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                                            .join(' ')
                                          : 'Unknown');

                                    // Special handling for QUEUED status
                                    if (status === 'QUEUED') {
                                      return (
                                        <StatusBadge status="queued" queuedVariant="violet" className="rounded-full px-2 pr-4 py-1 ring-1 ring-violet-200 border-violet-200" />
                                      );
                                    }

                                    return (
                                      <span className={`inline-flex items-center gap-2 rounded-full ${bg} px-2 pr-4 py-1 ring-1 ${ring}`}>
                                        {hasDynamicStatus ? (
                                          getDynamicStatusIcon(status)
                                        ) : (
                                          (() => {
                                            switch (status) {
                                              case 'ACTIVE':
                                              case 'RUNNING':
                                              case 'PROCESSING':
                                              case 'NO_MORE_PENDING_ACTIONS':
                                              case 'FINISHED':
                                                return <RunningGhostIcon className="!w-10 !h-10" />;
                                              case 'PAUSED':
                                                return <PauseGhostIcon className="w-4 h-4" />;
                                              case 'COMPLETED':
                                              case 'SUCCESS':
                                                return <CheckCircle className="w-4 h-4" />;
                                              case 'FAILED':
                                              case 'INACTIVE':
                                              case 'REJECTED':
                                              case 'DELETED':
                                              case 'STOPPED':
                                                return <XCircle className="w-4 h-4" />;
                                              default:
                                                return <Info className="w-4 h-4" />;
                                            }
                                          })()
                                        )}
                                        <span className={`text-xs font-medium ${text}`}>{label}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              );
                            })()
                          )}
                        </TableCell>

                        <TableCell>
                          {insightsLoading || insightsRefreshing === campaign.id ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="font-medium">{campaign.insights?.totalLeads || 0}</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col items-center">
                            {insightsLoading || insightsRefreshing === campaign.id ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              </div>
                            ) : (
                              <>
                                <span className="font-medium">{campaign.insights?.connectionRequestsSent || 0}</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* <TableCell>
                        <div className="flex flex-col items-center">
                          {insightsLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin inline" />
                          ) : (
                            <>
                              <span className="font-medium">{campaign.insights?.connectionRequestsAccepted || 0}</span>
                            </>
                          )}
                        </div>
                      </TableCell> */}

                        <TableCell>
                          <div className="flex flex-col items-center">
                            {insightsLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin inline" />
                            ) : (
                              <>
                                <span className="font-medium">{campaign.insights?.messagesSent || 0}</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col items-center">
                            {insightsLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin inline" />
                            ) : (
                              <>
                                <span className="font-medium">{campaign.insights?.responses || 0}</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-gray-600">{formatDate(campaign.createdAt)}</span>
                            <span className="text-xs text-gray-400">{getRelativeTime(campaign.createdAt)}</span>
                          </div>
                        </TableCell>

                        <TableCell >
                          <div className="">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="text-xs"
                                    disabled={actionInProgress === campaign.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isDraft) {
                                        handleDeleteClick(campaign, e);
                                      } else {
                                        const currentStatus = campaign.insights?.campaignStatus || campaign.insights?.dynamicStatus?.status;
                                        const newState = currentStatus === 'PAUSED'
                                          ? CampaignState.RUNNING
                                          : CampaignState.PAUSED;
                                        handleCampaignStatusChange(campaign.id, newState);
                                      }
                                    }}
                                  >
                                    {actionInProgress === campaign.id ? (
                                      <Loader2 className="!w-4 !h-4 animate-spin" />
                                    ) : isDraft ? (
                                      <div className="flex items-center justify-center rounded-lg p-1 border border-red-300 hover:border-red-400 transition-colors">
                                        <Trash2 className="w-3 h-3 text-red-600 hover:text-red-700" />
                                      </div>
                                    ) : (() => {
                                      const currentStatus = campaign.insights?.campaignStatus || campaign.insights?.dynamicStatus?.status;
                                      return currentStatus === 'PAUSED' ? (
                                        <RunningOutlineIcon className="!w-6 !h-6" />
                                      ) : (
                                        <PauseOutlineIcon className="!w-6 !h-6" />
                                      );
                                    })()}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  <p>
                                    {actionInProgress === campaign.id
                                      ? (isDraft ? 'Deleting...' : (() => {
                                        const currentStatus = campaign.insights?.campaignStatus || campaign.insights?.dynamicStatus?.status;
                                        return currentStatus === 'PAUSED' ? 'Resuming...' : 'Pausing...';
                                      })())
                                      : (isDraft ? 'Delete Campaign' : (() => {
                                        const currentStatus = campaign.insights?.campaignStatus || campaign.insights?.dynamicStatus?.status;
                                        return currentStatus === 'PAUSED' ? 'Resume Campaign' : 'Pause Campaign';
                                      })())
                                    }
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                Delete Campaign?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-700 py-3 text-base">
              Do you really want to delete campaign <span className="font-semibold text-gray-900">{campaignToDelete?.name}</span> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2 sm:flex-row">
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCampaignToDelete(null);
              }}
              className="bg-white w-full border-gray-300 text-gray-700 hover:bg-gray-50 m-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (campaignToDelete?.id) {
                  handleDeleteCampaign(campaignToDelete.id);
                }
              }}
              disabled={actionInProgress === campaignToDelete?.id}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 m-0 w-full"
            >
              {actionInProgress === campaignToDelete?.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete campaign
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Main component wrapping the content in the layout
const CampaignsList = () => {
  return (
    <DashboardLayout activePage="campaigns">
      <CampaignsListContent />
    </DashboardLayout>
  );
};

export default CampaignsList;
