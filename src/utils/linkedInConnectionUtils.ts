// LinkedIn Connection Check types
export interface LinkedInConnectionData {
  connectionStatus: "CONNECTED" | "NOT_CONNECTED";
  workspace?: {
    id: string;
    name: string;
    domain: string;
    status: string;
    isCustomerWs: boolean;
  };
  account?: {
    id: string;
    status: string;
    connectionStatus: string;
    syncStatus: string;
    isPremium: boolean;
  };
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
    headline: string;
    company: string;
    location: string;
  };
  message?: string;
}

export interface LinkedInConnectionResponse {
  status: number;
  data: LinkedInConnectionData;
  error: string | null;
}

export interface LinkedInProfile {
  memberId?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  [key: string]: any;
}

export interface HandleConnectAccountParams {
  // State flags
  isExtensionAvailable: boolean;
  isSubscriptionActive: boolean;
  
  // Account limits
  totalActiveAccounts: number;
  seatsAlloted: number;
  
  // Profile functions
  fetchProfile: () => Promise<LinkedInProfile | null>;
  clearProfile: () => void;
  
  // Connection check function
  checkLinkedInConnection: (urn: string) => Promise<LinkedInConnectionResponse>;
  
  // Callbacks
  onShowSubscriptionDialog: () => void;
  onShowSeatsLimitDialog?: () => void;
  onShowProfileModal: () => void;
  onSetLinkedInConnectionData: (data: LinkedInConnectionData | null) => void;
  onSetIsCheckingConnection: (isChecking: boolean) => void;
  
  // Optional logger
  logger?: {
    log?: (...args: any[]) => void;
    error?: (...args: any[]) => void;
  };
}

/**
 * Handles the connect account click flow for LinkedIn connection
 * This function manages the entire flow of connecting a LinkedIn account,
 * including subscription checks, extension availability, profile fetching,
 * and connection status checking.
 * 
 * @param params - Configuration object containing all required dependencies
 */
export const handleConnectAccount = async (params: HandleConnectAccountParams): Promise<void> => {
  const {
    isExtensionAvailable,
    isSubscriptionActive,
    totalActiveAccounts,
    seatsAlloted,
    fetchProfile,
    clearProfile,
    checkLinkedInConnection,
    onShowSubscriptionDialog,
    onShowSeatsLimitDialog,
    onShowProfileModal,
    onSetLinkedInConnectionData,
    onSetIsCheckingConnection,
    logger = console,
  } = params;

  console.log("totalActiveAccounts:", isSubscriptionActive);

  // Check if extension is available
  if (!isExtensionAvailable) {
    logger.log?.("Extension not available, showing modal with extension installation content");
    onSetLinkedInConnectionData(null);
    onShowProfileModal();
    return;
  }

  try {
    // Clear any existing profile data
    clearProfile();
    
    // Fetch the LinkedIn profile
    const profile = await fetchProfile();

    if (profile && profile.memberId) {
      logger.log?.("Profile has memberId, checking connection");
      
      // Check LinkedIn connection status
      onSetIsCheckingConnection(true);
      
      try {
        const connectionResponse = await checkLinkedInConnection(`urn:li:fsd_profile:${profile.memberId}`);
        onSetLinkedInConnectionData(connectionResponse.data);

        // Show modal with connection status
        logger.log?.("Setting showProfileModal to true");
        onShowProfileModal();

      } catch (error) {
        logger.error?.('Error checking LinkedIn connection:', error);
        // Still show modal even if connection check fails
        logger.log?.("Connection check failed, still showing modal");
        onShowProfileModal();
      } finally {
        onSetIsCheckingConnection(false);
      }
    } else {
      // Profile is null or doesn't have memberId - user not logged into LinkedIn
      // Still show modal to handle the "not logged in" case
      logger.log?.("Profile is null or no memberId, showing modal for not logged in case");
      onSetLinkedInConnectionData(null);
      onShowProfileModal();
    }

  } catch (error) {
    logger.error?.("Failed to get LinkedIn profile:", error);
    // Even if fetchProfile fails, show modal to handle the error case
    logger.log?.("fetchProfile failed, showing modal");
    onSetLinkedInConnectionData(null);
    onShowProfileModal();
  }
};

