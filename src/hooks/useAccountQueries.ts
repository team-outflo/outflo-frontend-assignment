import { useQuery } from "../common/api";
import { getAccounts, getAccountConfig } from "../api/accounts/accounts";
import { Account } from "../types/accounts";
import { useAuthStore } from "../api/store/authStore";

export const useAccountsQuery = () => {
  const { isAuthenticated } = useAuthStore();

  const response = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => (await getAccounts()).data,
    options: {
      refetchInterval: 10000, // Poll every 10 seconds for more frequent updates
      refetchOnWindowFocus: true, // Refetch when user returns to the tab
      refetchOnMount: true, // Refetch when component mounts
      enabled: isAuthenticated,
      staleTime: 0, // Always consider data stale to ensure fresh data
    },
  });
  return response;
};

export const useAccountConfigQuery = (accountId: string | undefined) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<{
    maxConnectionRequestsPerDay: number;
    maxMessagesPerDay: number;
  }>({
    queryKey: ["accounts", accountId, "config"],
    queryFn: async () => {
      if (!accountId) throw new Error("Account ID is required");
      const response = await getAccountConfig(accountId);
      return response.data;
    },
    options: {
      enabled: isAuthenticated && Boolean(accountId),
      // Don't refetch too often since limits aren't changed frequently
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });
};