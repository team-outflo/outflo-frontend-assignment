import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Account } from '@/types/accounts';
import { useQueryClient } from '@tanstack/react-query';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import SenderLimitsDrawer from '@/components/SenderLimitsDrawer';

interface ConfigureAccountLimitsButtonProps {
  account: Account;
}

const ConfigureAccountLimitsButton: React.FC<ConfigureAccountLimitsButtonProps> = ({ account }) => {
  const [isLimitsDrawerOpen, setIsLimitsDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const queryClient = useQueryClient();
  const campaignStore = useCampaignStore();

  const handleConfigureLimits = () => {
    setSelectedAccount(account);
    setIsLimitsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsLimitsDrawerOpen(false);
    setSelectedAccount(null);
  };

  const handleSuccess = async () => {
    // Refetch all accounts (already used in edit mode) - this will include updated config limits
    try {
      const { getAccounts } = await import('@/api/accounts/accounts');
      const response = await getAccounts();
      const allAccounts = response.data as Account[];
      
      if (allAccounts) {
        // Find the updated account from the response
        const updatedAccount = allAccounts.find((acc) => acc.id === account.id);
        
        if (updatedAccount && updatedAccount.configLimits) {
          // Update the accounts cache with the refetched data
          queryClient.setQueryData<Account[]>(['accounts'], allAccounts);
          
          // No need to update campaign store in view mode anymore
          // The React Query cache update will automatically trigger re-renders
          // Both view and edit mode now use the same data source (React Query cache)
        }
      }
    } catch (error) {
      console.error('Failed to fetch updated accounts:', error);
    }
  };

  // Only show button when account is connected
  if (account.connectionStatus !== 'CONNECTED') {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs border-[#5a41cd]/20 text-[#5a41cd] hover:bg-[#5a41cd]/10"
        onClick={handleConfigureLimits}
      >
        <Settings size={10} className="mr-1" />
        Configure limits
      </Button>
      <SenderLimitsDrawer
        isOpen={isLimitsDrawerOpen}
        onClose={handleCloseDrawer}
        account={selectedAccount}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default ConfigureAccountLimitsButton;

