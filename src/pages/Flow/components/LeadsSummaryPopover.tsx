
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
// Clock import commented out - waiting section commented for later
// import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { getSequenceStats } from "@/api/leads/leadsApi";
import { useCampaignStore } from "@/api/store/campaignStore";

interface LeadsSummaryPopoverProps {
    campaignSequenceId: string;
    children: React.ReactNode;
    onOpenLeadsTable?: () => void;
}

export const LeadsSummaryPopover = ({ campaignSequenceId, children, onOpenLeadsTable }: LeadsSummaryPopoverProps) => {
    const [open, setOpen] = useState(false);
    const { campaign } = useCampaignStore();
    const campaignId = campaign?.id;

    const { data: statsData, isLoading } = useQuery<{
        sequences?: Array<{
            sequenceId: string;
            action: string;
            waiting: number;
            processed: number;
            failed: number;
        }>;
    }>({
        queryKey: ["sequence-stats", campaignId],
        queryFn: async () => {
            if (!campaignId) throw new Error("Campaign ID is required");
            const response = await getSequenceStats(campaignId);
            return (response.data as any) || {};
        },
        enabled: open && !!campaignId, // Only fetch when popover is open and campaignId exists
        staleTime: 30000, // Cache for 30 seconds
    });

    // Find stats for this specific sequence
    const stats = statsData?.sequences?.find(
        (seq) => seq.sequenceId === campaignSequenceId
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                asChild
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-64 p-0 border-0 shadow-lg"
                sideOffset={5}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenLeadsTable) {
                        onOpenLeadsTable();
                    }
                }}
            >
                <div className="bg-dashboard-card rounded-lg overflow-hidden border border-border/50 shadow-xl cursor-pointer">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
                        {isLoading ? (
                            <Skeleton className="h-4 w-24" />
                        ) : (
                            <p className="text-xs font-medium text-muted-foreground">
                                {stats ? stats.waiting + stats.processed + stats.failed : 0} Total Leads
                            </p>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="p-2 space-y-1.5">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-14 w-full rounded-md" />
                                <Skeleton className="h-14 w-full rounded-md" />
                                <Skeleton className="h-14 w-full rounded-md" />
                            </>
                        ) : (
                            <>
                                {/* Waiting - Commented out for later */}
                                {/* <div className="flex items-center gap-2.5 p-2 rounded-md bg-amber-50 border border-amber-200">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center">
                                        <Clock className="w-3.5 h-3.5 text-amber-900" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">Waiting</p>
                                        <p className="text-lg font-bold text-status-waiting">
                                            {stats?.waiting ?? 0}
                                        </p>
                                    </div>
                                </div> */}

                                {/* Processed (Passed) */}
                                <div className="flex items-center gap-2.5 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">Processed</p>
                                        <p className="text-lg font-bold text-status-passed">
                                            {stats?.processed ?? 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Failed */}
                                <div className="flex items-center gap-2.5 p-2 rounded-md bg-red-50 border border-red-200">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-200 flex items-center justify-center">
                                        <XCircle className="w-3.5 h-3.5 text-rose-900" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">Failed</p>
                                        <p className="text-lg font-bold text-status-failed">
                                            {stats?.failed ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};
