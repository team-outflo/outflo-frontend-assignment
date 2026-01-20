import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useCreateDraftCampaign } from './useCampaignMutations';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { mapBackendCampaignToFrontend } from './useCampaignQueries';

export const useCreateDraftCampaignFlow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: createDraft, isPending: isLoading } = useCreateDraftCampaign();
  const store = useCampaignStore();

  const createDraftCampaign = useCallback(
    async (name: string) => {
      return new Promise<void>((resolve, reject) => {
        createDraft(
          { payload: { name } },
          {
            onSuccess: async (response: any) => {
              try {
                // Response is already the campaign data (extracted by checkUnauthorized)
                const campaignData = response.data;
                
                if (!campaignData || !campaignData?.id) {
                  throw new Error('Invalid response: missing campaign data');
                }

                // Transform the draft response to frontend Campaign format
                // This reuses the existing mapBackendCampaignToFrontend function
                // which handles both configs and sequenceDraft
                const transformedCampaign = await mapBackendCampaignToFrontend(campaignData);

                // Initialize the campaign store with the transformed data
                store.init(transformedCampaign, 'edit', [], []);

                // Navigate to edit page with the campaign ID
                navigate(`/campaign/edit/${campaignData.id}`);

                toast({
                  title: 'Success',
                  description: 'Campaign draft created successfully!',
                });

                resolve();
              } catch (error) {
                console.error('Error processing draft campaign:', error);
                const errorMessage =
                  error instanceof Error ? error.message : 'Failed to process campaign draft';
                
                toast({
                  title: 'Error',
                  description: errorMessage,
                  variant: 'destructive',
                });

                reject(error);
              }
            },
            onError: (error: any) => {
              // Extract error message from response
              let errorMessage = 'Failed to create campaign draft';
              
              if (error?.errorInfo?.data?.error) {
                errorMessage = error.errorInfo.data.error;
              } else if (error?.errorInfo?.data?.message) {
                errorMessage = error.errorInfo.data.message;
              } else if (error?.message) {
                errorMessage = error.message;
              }

              toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
              });

              reject(error);
            },
          }
        );
      });
    },
    [createDraft, navigate, toast, store]
  );

  return {
    createDraftCampaign,
    isLoading,
  };
};

