import React, { useState } from 'react';
import { Search, Download, Loader2, CheckCircle2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/leads';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import { exportLeadsAsCsv } from '@/api/leads/leadsApi';
import { useToast } from '@/hooks/use-toast';
import { LeadsTableView } from './LeadsTableView';
import { ColumnMapping } from '@/types/campaigns';
import { Lead as CampaignLead } from '@/types/campaigns';
import { useCampaignStore } from '@/api/store/campaignStore';

interface LeadsGridViewProps {
    leads: Lead[];
    searchQuery: string;
    totalCount: number;
    validLinkedInCount: number;
    leadListId?: string | null;
    columnMapping?: ColumnMapping[];
    campaignLeads?: CampaignLead[];
    onSearchChange: (query: string) => void;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
    onPageChange?: (page: number) => void;
    isPageLoading?: boolean;
}

export const LeadsGridView: React.FC<LeadsGridViewProps> = ({
    leads,
    searchQuery,
    totalCount,
    validLinkedInCount,
    leadListId,
    columnMapping,
    campaignLeads = [],
    onSearchChange,
    pagination,
    onPageChange,
    isPageLoading = false,
}) => {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const store = useCampaignStore();
    const storeLeads = store.campaign.leads;

    // Debug: Log columnMapping to ensure it's being passed correctly
    React.useEffect(() => {
        if (columnMapping && columnMapping.length > 0) {
            console.log('LeadsGridView - Column mapping available:', columnMapping);
            console.log('LeadsGridView - Campaign leads count:', campaignLeads.length);
        }
    }, [columnMapping, campaignLeads]);

    const handleExport = async () => {
        if (!leadListId) {
            toast({
                title: 'Error',
                description: 'Lead list ID is missing. Cannot export leads.',
                variant: 'destructive',
            });
            return;
        }

        setIsExporting(true);
        try {
            const blob = await exportLeadsAsCsv(leadListId);
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `leads-export-${leadListId}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast({
                title: 'Success',
                description: 'Leads exported successfully',
            });
        } catch (error) {
            console.error('Error exporting leads:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to export leads',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

     
    // Get import method from leadList data or store
    const getImportMethod = (): string => {
     
        return storeLeads.leadListMetadata.name;
    };
    
    // Get tooltip message for import method
    const getImportMethodTooltip = (): string => {
        const storeSource = storeLeads?.source 
        
        if (storeSource) {
            const sourceType = storeSource.type;
            if (sourceType === 'LINKEDIN') {
                const accountType = storeSource.metadata?.accountType;
                if (accountType === 'classic') return 'This lead list was imported using LinkedIn Search';
                if (accountType === 'sales_navigator') return 'This lead list was imported using LinkedIn Sales Navigator';
                if (accountType === 'recruiter') return 'This lead list was imported using LinkedIn Recruiter';
                return 'This lead list was imported using LinkedIn';
            }
            if (sourceType === 'CSV') return 'This lead list was imported from a CSV file';
            if (sourceType === 'SAVED_LIST') return 'This lead list was imported from your saved lists';
            return 'This lead list was imported using CSV Upload';
        }
        
        return 'This lead list was imported using CSV Upload';
    };
    const totalLeadsLabel = totalCount || leads.length;
    const paginationStart = pagination
        ? Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total || 0)
        : 0;
    const paginationEnd = pagination
        ? Math.min(pagination.page * pagination.pageSize, pagination.total || 0)
        : 0;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 " />
                            <Input 
                                placeholder="Search leads..." 
                                value={searchQuery} 
                                onChange={e => onSearchChange(e.target.value)} 
                                className="pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#5a41cd] focus-visible:border-1" 
                            />
                            <TooltipInfo
                                trigger={
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full cursor-pointer">
                                        {`${leads.length}`}
                                    </span>
                                }
                                content={`${leads.length} total leads`}
                            />
                        </div>
                        {storeLeads?.source && (
                                <TooltipInfo
                                    trigger={
                                        <div className="inline-flex items-center gap-2 cursor-pointer">
                                               <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            <span className="text-sm">
                                                <span className="text-gray-700">Leads List: </span>
                                                <span className="text-gray-500 font-semibold">{getImportMethod()}</span>
                                     
                                            </span>
                                            <Info className="w-5 h-5 text-gray-700" />
                                        </div>
                                    }
                                    content="These leads are saved in this list for future use. You can import this list directly into any campaign later from Import Leads → Add from My List."
                                    side="top"
                                    align="center"
                                />
                            )}
                    </div>
                    {leadListId && (
                        <Button
                            onClick={handleExport}
                            disabled={isExporting}
                            variant="ghost"
                            className="flex items-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </>
                            )}
                        </Button>
                    )}
                </div>
               
            </div>


            {/* Leads Display - Table or Grid */}
            <div className="p-6">
                {isPageLoading && (
                    <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading leads...
                    </div>
                )}

                {columnMapping  ? (
                    // Show table view when columnMapping is available from backend
                    <LeadsTableView
                        leads={leads}
                        campaignLeads={campaignLeads}
                        columnMapping={columnMapping}
                        searchQuery={searchQuery}
                    />
                ) : (
                    // Show grid view as fallback when columnMapping is not available
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {leads.map(lead => (
                            <div 
                                key={lead.id} 
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start space-x-3">
                                    <img 
                                        src={lead.avatar} 
                                        alt={`${lead.firstName} ${lead.lastName}`} 
                                        className="w-12 h-12 rounded-full bg-gray-200 object-cover" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                                        }} 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                                            <a 
                                                href={lead.linkedinUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                {lead.firstName}{lead.lastName ? ` ${lead.lastName}` : ''}
                                            </a>
                                        </h3>

                                        {/* Display only company and location */}
                                        <div className="text-xs text-gray-500 mt-1">
                                            {lead.company && (
                                                <span className="block text-gray-600">
                                                    {lead.company}
                                                </span>
                                            )}
                                            {lead.location && (
                                                <span className="block">
                                                    {lead.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {leads.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <p>No valid LinkedIn leads found</p>
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex flex-col gap-4 mt-8 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-gray-600">
                            Showing{' '}
                            {pagination.total > 0
                                ? `${Math.max(paginationStart, 1)}-${Math.max(paginationEnd, paginationStart)}`
                                : '0'}{' '}
                            of {pagination.total.toLocaleString()} leads
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="min-w-[100px]"
                                disabled={pagination.page === 1 || isPageLoading}
                                onClick={() => onPageChange?.(pagination.page - 1)}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-gray-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                className="min-w-[100px]"
                                disabled={pagination.page === pagination.totalPages || isPageLoading}
                                onClick={() => onPageChange?.(pagination.page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
