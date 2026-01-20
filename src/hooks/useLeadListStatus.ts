import { useState, useEffect, useRef } from 'react';
import { getLeadListById } from '@/api/leads/leadsApi';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';

interface LeadListStatus {
  status: 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'UNKNOWN';
  leadListId: string | null;
}

interface ProgressInfo {
  totalLeads: number;
  limit: number;
  processed: number;
  pending: number;
}

interface UseLeadListStatusOptions {
  leadListId: string | null;
  enabled?: boolean;
  pollInterval?: number;
  maxAttempts?: number;
  onComplete?: (leadListId: string) => void;
  onError?: (error: Error) => void;
}

export const useLeadListStatus = ({
  leadListId,
  enabled = true,
  pollInterval = 2000, // 2 seconds
  maxAttempts = 150, // 5 minutes max (150 * 2s)
  onComplete,
  onError,
}: UseLeadListStatusOptions) => {
  const store = useCampaignStore();
  const [status, setStatus] = useState<LeadListStatus['status']>('UNKNOWN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const attemptsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!leadListId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getLeadListById(leadListId);
      const leadList = (response.data as any)?.leadList;
      const currentStatus = leadList?.status || 'UNKNOWN';

      setStatus(currentStatus);

      // Store leadList metadata in campaign store on each poll
      if (leadList) {
        const columnMapping = leadList.columnMapping || [];
        const source = leadList.source || null;
        // Use setLeadsFromList to update metadata (pass empty leads array since we're just updating metadata)
        store.setLeadsFromList(leadListId, [], columnMapping, source, leadList);

        // Extract progress info
        const totalLeads = leadList.totalLeads || 0;
        let limit = 0;
        
        // For LinkedIn: get limit from source.metadata.limit
        if (leadList.source?.type === 'LINKEDIN') {
          limit = leadList.source.metadata?.limit || totalLeads;
        }
        // For CSV: get limit from source.metadata.totalRows
        else if (leadList.source?.type === 'CSV') {
          limit = leadList.source.metadata?.totalRows || totalLeads;
        }
        // Fallback to totalLeads if no limit found
        else {
          limit = totalLeads;
        }

        setProgressInfo({
          totalLeads,
          limit,
          processed: totalLeads,
          pending: Math.max(0, limit - totalLeads),
        });
      }

      if (currentStatus === 'ACTIVE') {
        // Processing complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoading(false);
        onComplete?.(leadListId);
        return;
      }

      if (currentStatus === 'FAILED') {
        // Processing failed
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoading(false);
        const error = new Error('Lead list processing failed');
        setError(error);
        onError?.(error);
        return;
      }

      // Still processing
      attemptsRef.current += 1;
      if (attemptsRef.current >= maxAttempts) {
        // Max attempts reached
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoading(false);
        const error = new Error('Lead list processing timeout - maximum attempts reached');
        setError(error);
        onError?.(error);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check lead list status');
      setError(error);
      setIsLoading(false);
      onError?.(error);
      
      // Stop polling on error
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!leadListId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset attempts when leadListId changes
    attemptsRef.current = 0;
    setStatus('UNKNOWN');
    setError(null);

    // Check status immediately
    checkStatus();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      checkStatus();
    }, pollInterval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [leadListId, enabled, pollInterval, maxAttempts]);

  return {
    status,
    isLoading,
    error,
    isComplete: status === 'ACTIVE',
    isFailed: status === 'FAILED',
    progressInfo,
  };
};

