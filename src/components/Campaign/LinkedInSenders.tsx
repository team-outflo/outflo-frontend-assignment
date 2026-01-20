import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Account } from '@/types/accounts';
import { useQuery } from '@/common/api';
import { getAccounts } from '@/api/accounts/accounts';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import { LinkedInSenderAccountCard } from './LinkedInSenderAccountCard';
import NextSequenceButton from './NextSequenceButton';
import ConfigureAccountLimitsButton from '@/components/common/ConfigureAccountLimitsButton';
// Import the LinkedIn Connection Modal
// Removed LinkedInConnectionModal feature temporarily

// Add this utility function for random profile images
const getRandomProfileImage = () => {
  // Total number of profile images available (user1.png through user13.png)
  const totalImages = 13;
  const randomIndex = Math.floor(Math.random() * totalImages) + 1;
  return `/profileImages/user${randomIndex}.png`;
};

const LinkedInSenders: React.FC = () => {
  // Get everything from centralized campaign store
  const campaignStore = useCampaignStore();

  console.log('campaignStore-linkedin-senders', campaignStore);
  const { campaign, mode } = campaignStore;
  const selectedAccounts = campaign.accountIDs;

  const isViewMode = mode === 'view';

  const { data: fetchedAccounts, isLoading, error } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await getAccounts();
      return response.data;
    },
    options: {
      enabled: true, // Fetch accounts in both view and edit mode
    }
  });
  
  // Transform account to display format
  const formatAccountForDisplay = (account: Account | any) => {
    const firstName = account.firstName || '';
    const lastName = account.lastName || '';
    const fullName = account.fullName || `${firstName} ${lastName}`.trim();
    const name = fullName.substring(0, 20) + (fullName.length > 20 ? '...' : '');
    
    return {
      id: account.id,
      name,

      // Use real profile picture if available, otherwise use our random image
      profilePicture: account.profileImageUrl || account.profileImage || getRandomProfileImage(),
      hasWarning: account.syncStatus === 'INACTIVE', // Yellow warning for sync inactive
      isDisconnected: account.connectionStatus === 'DISCONNECTED', // Red for disconnected
      isSyncInactive: account.syncStatus === 'INACTIVE', // Yellow for sync inactive
      isDeleted: account.isDeleted || account.deleted || account.status === 'deleted',
      selected: (account.connectionStatus === 'DISCONNECTED' || account.deleted || account.status === 'deleted') ? false : selectedAccounts.includes(account.id),
      account: account,
      configLimits: account.configLimits,
    };
  };

  // Merge accounts from /accounts route with accounts from campaign.accountStatuses
  const mergeAccounts = (fetchedAccounts: Account[] = [], accountStatuses: any = {}) => {
    // Create a map of accounts from /accounts route (preferred source for active accounts)
    const accountsMap = new Map<string, Account>();
    fetchedAccounts.forEach(account => {
      accountsMap.set(account.id, account);
    });

    // Add accounts from accountStatuses that are not in fetchedAccounts (deleted accounts)
    Object.keys(accountStatuses).forEach(accountId => {
      if (!accountsMap.has(accountId)) {
        const accountDetails = accountStatuses[accountId];
        const accountFromStatus: any = {
          id: accountDetails.id,
          firstName: accountDetails.firstName || '',
          lastName: accountDetails.lastName || '',
          fullName: accountDetails.fullName || `${accountDetails.firstName || ''} ${accountDetails.lastName || ''}`.trim(),
          email: accountDetails.email || '',
          profileImageUrl: accountDetails.profileImage || null,
          connectionStatus: accountDetails.connectionStatus || 'DISCONNECTED',
          syncStatus: accountDetails.syncStatus || 'INACTIVE',
          isDeleted: accountDetails.deleted || accountDetails.status === 'deleted',
          deleted: accountDetails.deleted || accountDetails.status === 'deleted',
          status: accountDetails.status || 'deleted',
          configLimits: accountDetails.configLimits || null,
        };
        accountsMap.set(accountDetails.id, accountFromStatus);
      }
    });

    // Convert map to array and format for display
    return Array.from(accountsMap.values()).map(account => formatAccountForDisplay(account));
  };

  // Initialize display accounts state
  const [displayAccounts, setDisplayAccounts] = useState<any[]>([]);
  


  // Update display accounts from sources; merge fetchedAccounts with campaign.accountStatuses
  // Also sync with store's accountIDs to reflect selections
  useEffect(() => {
    // Merge accounts from /accounts route with accounts from campaign.accountStatuses
    const mergedAccounts = mergeAccounts(fetchedAccounts || [], campaign.accountStatuses || {});


    
    // Update selected state based on store's accountIDs (single source of truth)
    const syncedAccounts = mergedAccounts.map(account => ({
      ...account,
      selected: campaign.accountIDs?.includes(account.id) || false
    }));

    
    // In view mode, filter to only show selected accounts
    const accountsToDisplay = isViewMode
      ? syncedAccounts.filter(account => account.selected)
      : syncedAccounts;
    
    setDisplayAccounts(accountsToDisplay);
  }, [fetchedAccounts, isViewMode, campaign.accountIDs, campaign.accountStatuses]);

  // Calculate select all checkbox state
  const getSelectAllState = () => {
    const selectableAccounts = displayAccounts.filter(account => 
      !account.isDisconnected && !account.isDeleted
    );
    
    if (selectableAccounts.length === 0) return { checked: false, indeterminate: false };
    
    const selectedCount = selectableAccounts.filter(account => account.selected).length;
    
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === selectableAccounts.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const selectAllState = getSelectAllState();

  const handleAccountSelect = (accountId: string, checked: boolean) => {
    // Don't allow changes in view mode
    if (isViewMode) return;
    
    // Find the account to check its status
    const account = displayAccounts.find(acc => acc.id === accountId);
    
    if (!account) return;
    
    // Allow deselecting any account regardless of status
    if (!checked) {
      // Update display accounts for UI
      const updatedDisplayAccounts = displayAccounts.map(acc => 
        acc.id === accountId ? { ...acc, selected: false } : acc
      );
      setDisplayAccounts(updatedDisplayAccounts);
      
      // Update campaign store directly - single source of truth
      const newSelectedAccounts = updatedDisplayAccounts
        .filter(acc => acc.selected)
        .map(acc => acc.account);
      
      const newAccountIDs = newSelectedAccounts.map(acc => acc.id);
      
      // Update store with both senderAccounts and accountIDs
      campaignStore.setSenderAccounts(newSelectedAccounts);
      campaignStore.updateCampaign({ accountIDs: newAccountIDs });
      return;
    }
    
    // Only allow selecting if account is connected (not disconnected and not deleted)
    if (account.isDisconnected || account.isDeleted) {
      return;
    }
    
    // Update display accounts for UI
    const updatedDisplayAccounts = displayAccounts.map(acc => 
      acc.id === accountId ? { ...acc, selected: checked } : acc
    );
    setDisplayAccounts(updatedDisplayAccounts);
    
    // Update campaign store directly - single source of truth
    const newSelectedAccounts = updatedDisplayAccounts
      .filter(acc => acc.selected)
      .map(acc => acc.account);
    
    const newAccountIDs = newSelectedAccounts.map(acc => acc.id);
    
    // Update store with both senderAccounts and accountIDs
    campaignStore.setSenderAccounts(newSelectedAccounts);
    campaignStore.updateCampaign({ accountIDs: newAccountIDs });
  };

  const handleSelectAll = (checked: boolean) => {
    // Don't allow changes in view mode
    if (isViewMode) return;
    
    // Get all selectable accounts (active and connected)
    const selectableAccounts = displayAccounts.filter(account => 
      !account.isDisconnected && !account.isDeleted
    );
    
    if (selectableAccounts.length === 0) return;
    
    // Update all selectable accounts
    const updatedDisplayAccounts = displayAccounts.map(account => {
      if (!account.isDisconnected && !account.isDeleted) {
        return { ...account, selected: checked };
      }
      return account;
    });
    
    setDisplayAccounts(updatedDisplayAccounts);
    
    // Update campaign store directly - single source of truth
    const newSelectedAccounts = updatedDisplayAccounts
      .filter(account => account.selected)
      .map(account => account.account);
    
    const newAccountIDs = newSelectedAccounts.map(account => account.id);
    
    // Update store with both senderAccounts and accountIDs
    campaignStore.setSenderAccounts(newSelectedAccounts);
    campaignStore.updateCampaign({ accountIDs: newAccountIDs });
  };

  // Calculate active accounts count
  const activeAccountsCount = fetchedAccounts?.filter(account => account.connectionStatus !== 'DISCONNECTED').length || 0;
  const totalAccountsCount = fetchedAccounts?.length || 0;

  // Calculate total connection limits for selected accounts
  const calculateTotalConnectionLimits = () => {
    const selectedAccounts = displayAccounts.filter(account => account.selected);
    return selectedAccounts.reduce((total, account) => {
      const limit = account.account?.configLimits?.maxConnectionRequestsPerDay || 
                   account.account?.accountActions?.dailyConnectionLimit || 0;
      return total + limit;
    }, 0);
  };

  const totalConnectionLimits = calculateTotalConnectionLimits();

  // displayAccounts already filtered in useEffect for view mode
  const accountsToShow = displayAccounts;

  return (
    <div className={`bg-white rounded-lg shadow-sm border 'border-gray-200'}`}>
      {/* View mode overlay indicator */}
      {/* {viewMode && (
        <div className="absolute top-0 right-0 m-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            View Mode
          </Badge>
        </div>
      )} */}
      
      <div className="p-6 border-b border-gray-200">
        {/* {viewMode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 text-sm flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              You are viewing this campaign in read-only mode. Account selections cannot be changed.
            </p>
          </div>
        )} */}
        
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-gray-700">
              {isViewMode 
                ? 'LinkedIn accounts used in this campaign:' 
                : 'Select multiple LinkedIn sender accounts for this campaign:'}
            </p>
            {!isViewMode && (
              <TooltipInfo
                trigger={
                  <Info className="w-4 h-4 text-gray-500" />
                }
                content="The more accounts you connect, the more leads you can reach per day. OutFlo will split the leads you add in the next step evenly across all connected accounts, helping you send more connection requests safely and consistently. No more ~200 leads per week limit."
                side="top"
                align="start"
              />
            )}
          </div>
          <div className="">
            <NextSequenceButton />
          </div>
        </div>
        
        {!isViewMode && activeAccountsCount < totalAccountsCount && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {activeAccountsCount === 0 ? (
                <span>All accounts are disconnected. Please reconnect accounts before creating campaigns.</span>
              ) : (
                <span>{totalAccountsCount - activeAccountsCount} of {totalAccountsCount} accounts are disconnected and cannot be selected.</span>
              )}
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-gray-600">Loading LinkedIn accounts...</p>
        </div>
      )}

      {error && (
        <div className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
          <p className="mt-2 text-gray-700">Error loading accounts. Please try again.</p>
          <Button 
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
            disabled={isViewMode}
          >
            Retry
          </Button>
        </div>
      )}

     
      {isViewMode && accountsToShow.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-600">No LinkedIn accounts were selected for this campaign.</p>
        </div>
      )}

      {!isLoading && !error && accountsToShow.length > 0 && (
        <div className={`overflow-hidden ''}`}>
          <Table>
            <TableHeader>
              <TableRow className={` bg-gray-50 `}>
                {!isViewMode && (
                  <TableHead className="w-12">
                    <TooltipInfo
                      trigger={
                        <div>
                          <Checkbox
                            checked={selectAllState.checked}
                            ref={(el) => {
                              if (el && 'indeterminate' in el) {
                                (el as any).indeterminate = selectAllState.indeterminate;
                              }
                            }}
                            disabled={isViewMode || displayAccounts.filter(account => 
                              !account.isDisconnected && !account.isDeleted
                            ).length === 0}
                            onCheckedChange={(checked) => 
                              handleSelectAll(checked === true ? true : false)
                            }
                            className={isViewMode || displayAccounts.filter(account => 
                              !account.isDisconnected && !account.isDeleted
                            ).length === 0 ? 'cursor-not-allowed' : ''}
                          />
                        </div>
                      }
                      content="Select all active and connected accounts"
                      side="top"
                      align="center"
                    />
                  </TableHead>
                )}
                <TableHead className="text-gray-700 font-medium">
                  Name
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountsToShow.map((account) => (
                <TableRow
                  key={account.id}
                  className={`transition-colors hover:bg-gray-50 ${
                    account.selected ? 'bg-blue-50/70' : ''
                  }`}
                >
                  {!isViewMode && (
                    <TableCell>
                      {(account.isDisconnected || account.isDeleted) ? (
                        <TooltipInfo
                          trigger={
                            <div>
                              <Checkbox
                                checked={account.selected}
                                disabled={!account.selected} // Allow deselecting if selected, prevent selecting if not selected
                                onCheckedChange={(checked) => 
                                  handleAccountSelect(account.id, checked === true ? true : false)
                                }
                                className={!account.selected ? 'cursor-not-allowed' : ''}
                              />
                            </div>
                          }
                          content={
                            account.selected
                              ? account.isDeleted 
                                ? 'This account has been deleted. Click to deselect.' 
                                : 'This account is disconnected. Click to deselect.'
                              : account.isDeleted 
                                ? 'This account has been deleted and cannot be selected' 
                                : 'This account is disconnected and cannot be selected'
                          }
                          side="top"
                          align="center"
                        />
                      ) : (
                        <div>
                          <Checkbox
                            checked={account.selected}
                            disabled={isViewMode}
                            onCheckedChange={(checked) => 
                              handleAccountSelect(account.id, checked === true ? true : false)
                            }
                            className={isViewMode ? 'cursor-not-allowed' : ''}
                          />
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <LinkedInSenderAccountCard
                      account={account.account || account}
                      accountStatus={undefined}
                      variant="table"
                      showConfigLimits={true}
                    />
                  </TableCell>
                  <TableCell>
                    <ConfigureAccountLimitsButton account={account.account || account} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Display total connection limits for selected accounts */}
          {!isViewMode && totalConnectionLimits > 0 && (
            <div className="p-3 bg-green-50 text-green-700 text-sm border-t border-green-100">
              <div className="flex items-center justify-between">
                <span>
                  <span className="font-medium">{displayAccounts.filter(acc => acc.selected).length}</span> account(s) selected
                </span>
                <span className="font-medium">
                  Total daily limit: {totalConnectionLimits} connections
                </span>
              </div>
            </div>
          )}
          
          {/* Display selected count in view mode */}
          {isViewMode && accountsToShow.length > 0 && (
            <div className="p-3 bg-blue-50/60 text-blue-700 text-sm border-t border-blue-100">
              <span className="font-medium">{accountsToShow.length}</span> LinkedIn {accountsToShow.length === 1 ? 'account' : 'accounts'} used in this campaign
            </div>
          )}
        </div>
      )}

      {/* LinkedInConnectionModal removed */}
    </div>
  );
};

export default LinkedInSenders;
