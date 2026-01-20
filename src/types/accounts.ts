import { AccountStatus, SyncState } from '../constants/accountConstant';

export type Account = {
  isDeleted: unknown;
  id: string;
  createdAt: string;
  updatedAt: string;
  status: AccountStatus;
  orgId: string;
  urn: string;
  connectionStatus: string; 
  syncStatus: SyncState;
  firstName: string;
  lastName: string;
  convFetchedFailures?: number;
  accountActions?: {
    dailyConnectionLimit?: number;
    weeklyConnectionLimitExceeded?: boolean;
    weeklyConnectionStopDate?: string;
    lastUpdateDate?: string;
    sendMessage?: number;
    sentInvitations?: number;
    campaignFailures?: number;
    sendConnectionReq?: number;
  };
  isPremium?: boolean;
  salesNavigator?: boolean;
  linkedinRecruiter?: boolean;
  campaignFailures?: number;
  profileImageUrl?: string;
  configLimits?: {  
    maxConnectionRequestsPerDay?: number;
    maxMessagesPerDay?: number;
  };
};

export interface AccountData {
  firstName: string;
  lastName?: string;
  email?: string;
}


export interface PostAccountDataRequest {
  orgID: string;
  urn: string;
  metadata: {
    cookies: { [key: string]: unknown }[];
  };
  headers: Record<string, string>;
}

// Chro

export type GetAccountsResponse = {
  data: Account[];
};

export type GetAccountResponse = {
  data: Account;
};
export { SyncState };

