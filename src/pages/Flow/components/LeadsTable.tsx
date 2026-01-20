"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getSequenceLeads } from "@/api/leads/leadsApi";
import { useCampaignStore } from "@/api/store/campaignStore";
import { formatWithAbbrev } from "@/utils/timeUtils";
import { displayToLuxonFormat } from "@/utils/timezoneUtils";
import CampaignLeadJourneySidebar from "@/components/Campaign/CampaignLeadJourneySidebar";

interface Lead {
  id: string;
  name: string;
  linkedInUrl: string;
  actionStatus: string;
  lastActivity: string;
  campaignLeadId?: string;
}

interface LeadsTableModalProps {
  campaignSequenceId?: string;
  isOpen: boolean;
  title: string;
  onClose: () => void;
}

export function LeadsTableModal({
  campaignSequenceId,
  title,
  onClose,
  isOpen,
}: LeadsTableModalProps) {
  const { campaign } = useCampaignStore();
  const campaignId = campaign?.id;
  const [selectedCampaignLeadId, setSelectedCampaignLeadId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Get timezone for date formatting
  const effectiveTimeZone = campaign?.timeZone 
    ? (displayToLuxonFormat(campaign.timeZone) || campaign.timeZone)
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: sequenceLeadsData, isLoading } = useQuery<{
    waiting?: any[];
    processed?: any[];
    failed?: any[];
    counts?: {
      waiting: number;
      processed: number;
      failed: number;
    };
  }>({
    queryKey: ["sequence-leads", campaignId, campaignSequenceId],
    queryFn: async () => {
      if (!campaignId || !campaignSequenceId) {
        throw new Error("Campaign ID and Sequence ID are required");
      }
      const response = await getSequenceLeads(campaignId, campaignSequenceId);
      return (response.data as any) || {};
    },
    enabled: isOpen && !!campaignId && !!campaignSequenceId,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get both processed and failed leads for the table using actual API response data
  const tableLeads: Lead[] = [
    ...(sequenceLeadsData?.processed || []),
    ...(sequenceLeadsData?.failed || []),
  ].map((lead: any) => {
    // Use actual fields from API response
    const firstName = lead.firstName || '';
    const lastName = lead.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || lead.details?.firstName && lead.details?.lastName 
      ? `${lead.details.firstName} ${lead.details.lastName}`.trim()
      : lead.url || lead.details?.linkedinUrl || 'Unnamed Lead';
    
    const linkedInUrl = lead.url || lead.details?.linkedinUrl || '';
    
    // Use actionStatus from API response (SUCCESS, SKIPPED, FAILED)
    const actionStatus = lead.actionStatus || 'N/A';
    
    // Use updatedAt or actionTimestamp for last activity
    const lastActivity = lead.updatedAt 
      ? formatWithAbbrev(lead.updatedAt, effectiveTimeZone)
      : lead.actionTimestamp
      ? formatWithAbbrev(new Date(lead.actionTimestamp).toISOString(), effectiveTimeZone)
      : lead.timestamp
      ? formatWithAbbrev(new Date(lead.timestamp).toISOString(), effectiveTimeZone)
      : 'N/A';
    
    return {
      id: lead.campaignLeadId || lead.leadId || lead.id,
      name,
      linkedInUrl,
      actionStatus,
      lastActivity,
      campaignLeadId: lead.campaignLeadId,
    };
  });

  const metrics = sequenceLeadsData?.counts || {
    waiting: sequenceLeadsData?.waiting?.length || 0,
    processed: sequenceLeadsData?.processed?.length || 0,
    failed: sequenceLeadsData?.failed?.length || 0,
  };

  const getStatusColor = (status: string) => {
    const statusUpper = (status || '').toUpperCase();
    if (statusUpper.includes('CONNECTED') || statusUpper === 'CONNECTION_EXISTS') {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (statusUpper.includes('PENDING') || statusUpper.includes('SENT') || statusUpper.includes('WAIT')) {
      return "bg-blue-50 text-blue-700 border border-blue-200";
    }
    if (statusUpper.includes('VIEWED') || statusUpper.includes('IN_SEQUENCE')) {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    if (statusUpper.includes('NOT_STARTED') || statusUpper === 'NONE') {
      return "bg-gray-50 text-gray-700 border border-gray-200";
    }
    return "bg-gray-50 text-gray-700 border border-gray-200";
  };

  const MetricCard = ({ label, value }: { label: string; value: number }) => {
    const getMetricColor = (label: string) => {
      switch (label) {
        case "Leads Waiting":
          return "text-amber-600";
        case "Leads Passed":
          return "text-emerald-600";
        case "Leads Failed":
          return "text-red-600";
        default:
          return "text-gray-600";
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className={`text-2xl font-bold ${getMetricColor(label)}`}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[70vw] w-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Leads at {title}</DialogTitle>
        </DialogHeader>

        {/* {isLoading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading leads...
            </div>
          </div>
        ) : ( */}
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-3">
            {isLoading && <div className="h-[86px]"></div>}
            {!isLoading && (
              <>
                {/* {metrics.waiting > 0 && (
                  <MetricCard label="Leads Waiting" value={metrics.waiting} />
                )} */}
                <MetricCard label="Leads Processed" value={metrics.processed} />
                <MetricCard label="Leads Failed" value={metrics.failed} />
              </>
            )}
          </div>

          <div className="overflow-x-auto flex-1 border border-gray-200 rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading leads...
                </div>
              </div>
            ) : tableLeads.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                No leads found for this sequence
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      LinkedIn URL
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Action Status
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableLeads.map((lead: Lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (lead.campaignLeadId) {
                          setSelectedCampaignLeadId(lead.campaignLeadId);
                          setIsSidebarOpen(true);
                        }
                      }}
                    >
                      <td className="py-2 px-3 text-gray-900 font-medium">
                        {lead.name}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {lead.linkedInUrl ? (
                          <a
                            href={lead.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate block max-w-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.linkedInUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                            lead.actionStatus
                          )}`}
                        >
                          {lead.actionStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-sm">
                        {lead.lastActivity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && tableLeads.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-600">
                {tableLeads.length} lead{tableLeads.length !== 1 ? 's' : ''} (Processed: {metrics.processed}, Failed: {metrics.failed})
              </div>
            </div>
          )}
        </div>
        {/* )} */}
      </DialogContent>

      {/* Campaign Lead Journey Sidebar */}
      <CampaignLeadJourneySidebar
        campaignLeadId={selectedCampaignLeadId}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />
    </Dialog>
  );
}
