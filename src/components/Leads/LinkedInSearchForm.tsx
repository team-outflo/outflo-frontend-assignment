import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { OutFloPrimaryButton } from '@/outfloNativeComponents/OutFloPrimaryButton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAccounts } from '@/api/accounts/accounts';
import { processLinkedInSearch } from '@/api/leads/leadsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info } from 'lucide-react';
import { Account } from '@/types/accounts';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

export type LinkedInAccountType = 'classic' | 'sales_navigator' | 'recruiter';

interface LinkedInSearchFormProps {
  campaignId: string;
  accountType: LinkedInAccountType;
  onProcessingStarted: (leadListId: string) => void;
}

const ACCOUNT_TYPE_LABELS: Record<LinkedInAccountType, string> = {
  classic: 'LinkedIn',
  sales_navigator: 'Sales Navigator',
  recruiter: 'Recruiter'
};

const ACCOUNT_TYPE_PLACEHOLDERS: Record<LinkedInAccountType, string> = {
  classic: 'https://www.linkedin.com/search/results/people/?keywords=...',
  sales_navigator: 'Paste your Sales Navigator search URL',
  recruiter: 'Paste your Recruiter search URL'
};

const ACCOUNT_TYPE_INSTRUCTIONS: Record<LinkedInAccountType, { text: string; linkText: string; url: string }> = {
  classic: {
    text: 'Filter profiles in the',
    linkText: 'LinkedIn search',
    url: 'https://www.linkedin.com/search/results/people/'
  },
  sales_navigator: {
    text: 'Filter profiles in the',
    linkText: 'Sales Nav Leads search',
    url: 'https://www.linkedin.com/sales/search/people?viewAllFilters=true'
  },
  recruiter: {
    text: 'Filter profiles in the',
    linkText: 'Recruiter search',
    url: 'https://www.linkedin.com/recruiter/search/people'
  }
};

const ACCOUNT_SELECTOR_TOOLTIPS: Record<LinkedInAccountType, string> = {
  classic: 'Choose the LinkedIn account that will be used to pull profiles from this search URL. Make sure the selected account has access to view the search results.',
  sales_navigator: 'Choose the LinkedIn account that will be used to pull profiles from this Sales Navigator search URL. Make sure the selected account has an active Sales Navigator subscription with access to the search results.',
  recruiter: 'Choose the LinkedIn account that will be used to pull profiles from this Recruiter search URL. Make sure the selected account has an active Recruiter subscription with access to the search results.'
};

const LIST_NAME_TOOLTIP = 'Enter a name for the list where these profiles will be saved. You can reuse this list later in other campaigns or export it from your Saved Lists.';

const LIMIT_TOOLTIPS: Record<LinkedInAccountType, string> = {
  classic: 'Set how many profiles you want to import from this LinkedIn search. For account safety, avoid importing very large numbers at once. Only import the amount you actually need.',
  sales_navigator: 'Set how many profiles you want to import from this Sales Nav search. For account safety, avoid importing very large numbers at once. Only import the amount you actually need.',
  recruiter: 'Set how many profiles you want to import from this Recruiter search. For account safety, avoid importing very large numbers at once. Only import the amount you actually need.'
};

const MAX_LIMITS: Record<LinkedInAccountType, number> = {
  classic: 1000,
  sales_navigator: 2500,
  recruiter: 2500
};

const INPUT_FOCUS_STYLES = 'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#5a41cd] focus-visible:border-1';

export const LinkedInSearchForm: React.FC<LinkedInSearchFormProps> = ({
  campaignId,
  accountType,
  onProcessingStarted,
}) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchUrl, setSearchUrl] = useState<string>('');
  const [limit, setLimit] = useState<number>(10);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize list name with default value (only once on mount)
  const [listName, setListName] = useState<string>(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    const accountTypeLabel = accountType === 'classic'
      ? 'linkedin-search'
      : accountType.replace('_', '-');
    return `${accountTypeLabel}-${timestamp}`;
  });

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const response = await getAccounts();
        const accountsData = response.data || [];
        // Filter only active/connected accounts
        const activeAccounts = accountsData.filter((acc: Account) =>
          acc.status !== 'INACTIVE' && acc.connectionStatus !== 'DISCONNECTED'
        );
        setAccounts(activeAccounts);
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load LinkedIn accounts',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [toast]);

  const handleProcess = async () => {
    if (!selectedAccountId) {
      toast({
        title: 'Error',
        description: 'Please select a LinkedIn account',
        variant: 'destructive',
      });
      return;
    }

    if (!searchUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a LinkedIn search URL',
        variant: 'destructive',
      });
      return;
    }

    if (!listName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a list name',
        variant: 'destructive',
      });
      return;
    }

    const maxLimit = MAX_LIMITS[accountType];
    if (limit > maxLimit) {
      toast({
        title: 'Error',
        description: `Maximum limit for ${ACCOUNT_TYPE_LABELS[accountType]} is ${maxLimit.toLocaleString()} profiles`,
        variant: 'destructive',
      });
      return;
    }

    if (limit < 1) {
      toast({
        title: 'Error',
        description: 'Limit must be at least 1',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await processLinkedInSearch(
        searchUrl.trim(),
        limit,
        selectedAccountId,
        listName.trim(),
        accountType
      );

      const leadListId = (response.data as any)?.leadList?.id;

      if (!leadListId) {
        throw new Error('Lead list ID not found in response');
      }

      toast({
        title: 'Success',
        description: `${ACCOUNT_TYPE_LABELS[accountType]} search processing started`,
      });

      onProcessingStarted(leadListId);
    } catch (error: any) {
      console.error('Error processing LinkedIn search:', error);

      // ApiError already extracts the error message from backend response
      // Backend format: { status: 400, data: null, error: "..." }
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const instruction = ACCOUNT_TYPE_INSTRUCTIONS[accountType];

  return (
    <div className="space-y-6">
     


      {/* LinkedIn Search URL */}
      <div className="space-y-2">
        <Label htmlFor="searchUrl">{instruction.text}{' '}
        <a
          href={instruction.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5a41cd] underline font-medium"
        >
          {instruction.linkText}
        </a>
        {' '}and paste the URL below</Label>
        <Input
          id="searchUrl"
          type="url"
          placeholder={ACCOUNT_TYPE_PLACEHOLDERS[accountType]}
          value={searchUrl}
          onChange={(e) => setSearchUrl(e.target.value)}
          disabled={isProcessing}
          className={INPUT_FOCUS_STYLES}
        />
      </div>
      {/* Account Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="account">
            {accountType === 'classic' 
              ? 'Select LinkedIn Account' 
              : accountType === 'sales_navigator'
              ? 'Select Sales Nav Account'
              : 'Select Recruiter Account'}
          </Label>
          <TooltipInfo
            trigger={
              <Info className="w-4 h-4 text-gray-500" />
            }
            content={ACCOUNT_SELECTOR_TOOLTIPS[accountType]}
            side="top"
            align="start"
          />
        </div>
        {isLoadingAccounts ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading accounts...
          </div>
        ) : (
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
            disabled={isProcessing}

          >
            <SelectTrigger id="account" className={`${INPUT_FOCUS_STYLES} focus:ring-0 focus:ring-offset-0 focus:border-[#5a41cd] focus:border-1`}>
              <SelectValue placeholder="Select a LinkedIn account">
                {selectedAccountId && (() => {
                  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
                  if (!selectedAccount) return null;
                  const senderName = `${selectedAccount.firstName || ''} ${selectedAccount.lastName || ''}`.trim() || selectedAccount.id;
                  return (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        {selectedAccount.profileImageUrl ? (
                          <AvatarImage src={selectedAccount.profileImageUrl} alt={senderName} />
                        ) : null}
                        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                          {(selectedAccount.firstName?.[0] || '') + (selectedAccount.lastName?.[0] || '') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{senderName}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <SelectItem value="none" disabled>
                  No accounts available
                </SelectItem>
              ) : (
                accounts.map((account) => {
                  const senderName = `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.id;
                  return (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          {account.profileImageUrl ? (
                            <AvatarImage src={account.profileImageUrl} alt={senderName} />
                          ) : null}
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                            {(account.firstName?.[0] || '') + (account.lastName?.[0] || '') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{senderName}</span>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        )}
      </div>



      {/* List Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="listName">List Name</Label>
          <TooltipInfo
            trigger={
              <Info className="w-4 h-4 text-gray-500" />
            }
            content={LIST_NAME_TOOLTIP}
            side="top"
            align="start"
          />
        </div>
        <Input
          id="listName"
          type="text"
          placeholder={accountType === 'classic'
            ? 'linkedin-search-2025-01-16'
            : `${accountType.replace('_', '-')}-search-2025-01-16`}
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          disabled={isProcessing}
          className={INPUT_FOCUS_STYLES}
        />
      </div>

      {/* Limit */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="limit">Limit</Label>
          <TooltipInfo
            trigger={
              <Info className="w-4 h-4 text-gray-500" />
            }
            content={LIMIT_TOOLTIPS[accountType]}
            side="top"
            align="start"
          />
        </div>
        <Input
          id="limit"
          type="number"
          min="0"
          max={MAX_LIMITS[accountType]}
          placeholder="10"
          value={limit}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0;
            const maxLimit = MAX_LIMITS[accountType];
            if (value > maxLimit) {
              setLimit(maxLimit);
            } else if (value < 0) {
              setLimit(0);
            } else {
              setLimit(value);
            }
          }}
          disabled={isProcessing}
          className={INPUT_FOCUS_STYLES}
        />
        <p className="text-xs text-gray-500">
          Max: {MAX_LIMITS[accountType].toLocaleString()} profiles for {ACCOUNT_TYPE_LABELS[accountType]} Search URL
        </p>
      </div>

      {/* Process Button */}
      <div className="flex gap-3 pt-4">
        <OutFloPrimaryButton
          onClick={handleProcess}
          disabled={isProcessing || !selectedAccountId || !searchUrl.trim() || !listName.trim()}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Process Search'
          )}
        </OutFloPrimaryButton>
      </div>
    </div>

  );
};

