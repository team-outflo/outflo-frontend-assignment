import React, { useState } from 'react';
import { X, ArrowLeft, AlertCircle, CheckCircle, ExternalLink, RefreshCw, Copy, Trash2, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { createLinkedInConnection, LinkedInConnectionData as ApiLinkedInConnectionData } from '../api/connections/connections';
import { useAuthStore } from '../api/store/authStore';
import { useToast } from '../hooks/use-toast';
import { postAccountData } from '@/api/accounts/accounts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface LinkedInProfile {
  firstName: string;
  lastName: string;
  headline?: string;
  memberId: string;
  profileImage?: string;
  urn?: string;
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  headers?: Record<string, string>;
}

interface LinkedInConnectionData {
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

interface Organization {
  id: string;
  name: string;
  domain: string;
  status: string;
  createdAtEpoch: number;
  updatedAt: number;
}

interface CommonLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LinkedInProfile | null;
  onConnect: (profile: LinkedInProfile) => void;
  onChangeAccount: () => void;
  isConnecting?: boolean;
  connectionData?: LinkedInConnectionData | null;
  organization?: Organization | null;
  onLogoutLinkedIn?: () => void;
  onChangeOrganization?: () => void;
  onReconnectLinkedIn?: (profile: LinkedInProfile) => void;
  isCheckingConnection?: boolean;
  // Additional props for enhanced functionality
  showAdvancedOptions?: boolean;
  allowWorkspaceChange?: boolean;
  allowAccountReconnection?: boolean;
  // Mode-specific props
  mode?: 'connect' | 'accounts'; // Different modes for different use cases
  onSuccessRedirect?: () => void; // Custom success handler
  // Extension and login status
  isExtensionAvailable?: boolean;
  isLinkedInLoggedIn?: boolean | null;
  // Account management
  onDeleteAccount?: (accountId: string) => void;
  onConnectAnotherAccount?: () => void;
}

const CommonLinkedInModal = ({
  isOpen,
  onClose,
  profile,
  onConnect,
  onChangeAccount,
  isConnecting = false,
  connectionData,
  organization,
  onLogoutLinkedIn,
  onChangeOrganization,
  onReconnectLinkedIn,
  isCheckingConnection = false,
  showAdvancedOptions = false,
  allowWorkspaceChange = false,
  allowAccountReconnection = false,
  mode = 'connect',
  onSuccessRedirect,
  isExtensionAvailable = true,
  isLinkedInLoggedIn = null,
  onDeleteAccount,
  onConnectAnotherAccount
}: CommonLinkedInModalProps) => {
  const [isConnectingToBackend, setIsConnectingToBackend] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  console.log("CommonLinkedInModal rendered with props:", {
    isOpen,
    profile: profile ? "exists" : "null",
    isLinkedInLoggedIn,
    isExtensionAvailable,
    connectionData: connectionData ? "exists" : "null"
  });

  // Determine which case we're in
  const getCurrentCase = () => {
    // Case 1: Extension not installed
    if (!isExtensionAvailable) {
      console.log("Case 1: Extension not installed");
      return 1;
    }

    // Case 2: LinkedIn not logged in (no profile or isLinkedInLoggedIn is false)
    if (!profile || isLinkedInLoggedIn === false) {
      console.log("Case 2: LinkedIn not logged in");
      return 2;
    }

    // Case 3: Extension installed, LinkedIn logged in, but account not connected to OutFlo
    if (isLinkedInLoggedIn === true && (!connectionData || connectionData.connectionStatus === "NOT_CONNECTED")) {
      console.log("Case 3: Account not connected to OutFlo");
      return 3;
    }

    // Case 4: Account connected to different organization
    if (connectionData?.account?.status === "ACTIVE" &&
      connectionData.workspace?.id !== organization?.id) {
      console.log("Case 4: Account connected to different org");
      return 4;
    }

  
    // Case 6: Account connected but sync status is inactive
    if (connectionData?.account.status === "ACTIVE" &&
      connectionData.workspace?.id === organization?.id &&
      connectionData.account?.syncStatus !== "ACTIVE" || connectionData?.account?.connectionStatus === "DISCONNECTED") {
      console.log("Case 6: Account connected but sync inactive");
      return 6;
    }

    // Case 5: Account connected to same org and connection status is connected
    if (connectionData?.account.status === "ACTIVE" &&
      connectionData.workspace?.id === organization?.id &&
      connectionData?.account?.connectionStatus === "CONNECTED") {
      console.log("Case 5: Account connected to same org");
      return 5;
    }

    console.log("Default case 3");
    return 3; // Default case
  };

  const currentCase = getCurrentCase();
  console.log("Current case determined:", currentCase);

  // Get profile info safely
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'LinkedIn User';
  const initials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : 'LU';

  const handleConnect = async () => {
    console.log("Connecting profile:", profile);

    // Validation checks
    if (!profile) {
      setConnectionError("No LinkedIn profile available. Please log into LinkedIn first.");
      return;
    }

    if ((!profile.urn || profile.urn === 'urn:li:fsd_profile:') && !profile.memberId) {
      const errorMsg = 'Missing required data: URN or memberId is required';
      setConnectionError(errorMsg);
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    if (!profile.cookies || profile.cookies.length === 0) {
      const errorMsg = 'Missing required data: cookies are required';
      setConnectionError(errorMsg);
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    const currentOrgId = user?.orgId || organization?.id;
    if (!currentOrgId) {
      const errorMsg = 'Missing required data: organization ID is required';
      setConnectionError(errorMsg);
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    setIsConnectingToBackend(true);
    setConnectionError(null);

    try {
      // Construct URN if it's missing or incomplete
      console.log("Profile Headers:", profile.urn);
      let urn = profile.urn;
      if (!urn || urn === 'urn:li:fsd_profile:') {
        if (profile.memberId) {
          urn = `urn:li:fsd_profile:${profile.memberId}`;
        } else {
          throw new Error('Unable to construct URN: memberId is required');
        }
      }
      console.log("Profile Headers:", profile.urn);

      // Call the connection API
      const response = await postAccountData(
        currentOrgId,
        urn,
        profile.cookies, 
        profile.headers
      );

      // console.log("Account connection successful:", response);

      // Show success toast
      toast({
        title: "Account Connected",
        description: mode === 'connect'
          ? "LinkedIn account has been successfully connected to OutFlo."
          : "LinkedIn account has been successfully connected.",
      });

      // Call the parent's onConnect handler
      onConnect(profile);

      // Handle success redirect if provided
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }

    } catch (error) {
      console.error("Failed to connect account:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect LinkedIn account.";
      setConnectionError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConnectingToBackend(false);
    }
  };


  
  const getModalTitle = () => {
    if (mode === 'accounts') {
      return "Connect LinkedIn Account";
    }
    return "Connect LinkedIn Account";
  };

  const getConnectButtonText = () => {
    if (isConnectingToBackend) {
      return "Connecting...";
    }
    if (isConnecting) {
      return "Connecting...";
    }
    if (mode === 'accounts') {
      return "Yes, connect";
    }
    return "Connect to OutFlo";
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (onDeleteAccount && connectionData?.account?.id) {
      onDeleteAccount(connectionData.account.id);
      setShowDeleteModal(false);
      onClose(); // Close the modal after deletion
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose} >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button> */}
          </div>
          <SheetTitle className="text-xl font-semibold text-gray-900 mt-4">
            {getModalTitle()}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 space-y-6 px-1">
          {/* Profile Section */}
          <div className="text-center space-y-4">
            <Avatar className="w-20 h-20 mx-auto">
              {profile?.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={fullName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    // Hide the image and show fallback instead
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-[#5a41cd] to-[#7c3aed] text-white font-semibold text-lg flex items-center justify-center">
                {profile?.profileImage ? (
                  <span className="text-white text-2xl font-bold">?</span>
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">{fullName}</h3>
              {profile?.headline && (
                <p className="text-sm text-gray-600">{profile.headline}</p>
              )}
            </div>
          </div>

          {/* Checking Connection Status */}
          {isCheckingConnection && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-blue-800 font-medium">Checking LinkedIn connection status...</span>
              </div>
            </div>
          )}

          {/* Case-based Content */}
          {!isCheckingConnection && (
            <>
              {/* Case 1: Extension not installed */}
              {currentCase === 1 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-orange-800 font-semibold mb-2">Install Extension to Connect LinkedIn Account</h3>
                      <p className="text-sm text-orange-700 mb-4">
                        You need to install the OutFlo Chrome extension to connect your LinkedIn account.
                      </p>
                      <Button
                        onClick={() => {
                          window.open('https://chromewebstore.google.com/detail/outflo-%E2%80%93-scale-outreach-o/cmikcdbkjpaejenbajphdelgdjolgdod', '_blank');
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Install Extension
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 2: LinkedIn not logged in */}
              {currentCase === 2 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-red-800 font-semibold mb-2">LinkedIn Not Logged In</h3>
                      <p className="text-sm text-red-700 mb-3">
                        Please log into your LinkedIn account to connect it with OutFlo.
                      </p>
                      
                      {/* Troubleshooting Info */}
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs font-bold">i</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-blue-800 font-medium mb-1">Troubleshooting Tip:</p>
                            <p className="text-xs text-blue-700">
                              If you're already logged into LinkedIn but still seeing this message, make sure you have the OutFlo extension installed and updated.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            window.open("https://www.linkedin.com/login", '_blank');
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Login to LinkedIn
                        </Button>
                        
                        <Button
                          onClick={() => {
                            window.open('https://chromewebstore.google.com/detail/outflo-%E2%80%93-scale-outreach-o/cmikcdbkjpaejenbajphdelgdjolgdod', '_blank');
                          }}
                          variant="outline"
                          className="w-full border-blue-300 hover:bg-blue-50 text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Install/Update OutFlo Extension
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: Account not connected to OutFlo */}
              {currentCase === 3 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">?</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-800 font-semibold mb-2">Connect to OutFlo</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Do you want to connect {profile?.firstName || 'this'} LinkedIn account to OutFlo?
                      </p>
                      <div className="space-y-2">
                        <Button
                          onClick={handleConnect}
                          className="w-full bg-[#5a41cd] hover:bg-[#5a41cd]/90 text-white"
                          disabled={isConnecting || isConnectingToBackend}
                        >
                          {getConnectButtonText()}
                        </Button>
                        {onLogoutLinkedIn && (
                          <Button
                            onClick={onLogoutLinkedIn}
                            variant="outline"
                            className="w-full border-gray-300 hover:bg-gray-50"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout This LinkedIn Account
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 4: Account connected to different org */}
              {currentCase === 4 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-amber-800 font-semibold mb-2">Account Connected to Different Workspace</h3>
                      <p className="text-sm text-amber-700 mb-4">
                        This LinkedIn account is already connected to <strong>{connectionData?.workspace?.name}</strong> workspace.
                      </p>
                      <div className="space-y-2">
                        {onLogoutLinkedIn && (
                          <Button
                            onClick={onLogoutLinkedIn}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Switch LinkedIn Account
                          </Button>
                        )}
                        {allowWorkspaceChange && onChangeOrganization && (
                          <Button
                            onClick={onChangeOrganization}
                            variant="outline"
                            className="w-full border-amber-300 hover:bg-amber-50"
                          >
                            Change Workspace
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 5: Account connected to same org */}
              {currentCase === 5 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-green-800 font-semibold mb-2">Account Connected</h3>
                      <p className="text-sm text-green-700 mb-4">
                        This LinkedIn account is connected to your workspace.
                      </p>
                      <div className="space-y-2">
                        {onConnectAnotherAccount && (
                          <Button
                            onClick={onConnectAnotherAccount}
                            className="w-full bg-[#5a41cd] hover:bg-[#5a41cd]/90 text-white"
                          >
                            Connect Another Account
                          </Button>
                        )}
                        {onLogoutLinkedIn && (
                          <Button
                            onClick={onLogoutLinkedIn}
                            variant="outline"
                            className="w-full border-gray-300 hover:bg-gray-50"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout This LinkedIn Account
                          </Button>
                        )}
                        {onDeleteAccount && connectionData?.account?.id && (
                          <Button
                            onClick={handleDeleteClick}
                            variant="outline"
                            className="w-full border-red-300 hover:bg-red-50 text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 6: Account connected but sync status inactive */}
              {currentCase === 6 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-yellow-800 font-semibold mb-2">Account Sync Issue</h3>
                      <p className="text-sm text-yellow-700 mb-4">
                        This LinkedIn account is connected but has sync issues. You can reconnect or delete it.
                      </p>
                      <div className="space-y-2">
                        {onReconnectLinkedIn && (
                          <Button
                            onClick={handleConnect}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reconnect
                          </Button>
                        )}
                        {onDeleteAccount && connectionData?.account?.id && (
                          <Button
                            onClick={() => onDeleteAccount(connectionData.account.id)}
                            variant="outline"
                            className="w-full border-red-300 hover:bg-red-50 text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Display */}
          {connectionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{connectionError}</p>
            </div>
          )}

          {/* Account Actions - Footer - Only show in accounts mode */}
          {mode === 'accounts' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
              <h3 className="text-gray-800 text-sm font-medium mb-3">Account Actions</h3>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  const connectUrl = `https://reach.outflo.io/connect?orgId=${user?.orgId || organization?.id || ''}`;
                  navigator.clipboard.writeText(connectUrl);
                  toast({
                    title: "Link Copied",
                    description: "Extension connection link copied to clipboard. You can now share it with others.",
                  });
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Shareable Link
              </Button>
            </div>
          )}

          {/* Contact Support Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">?</span>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-800 text-sm font-medium mb-2">Need Help?</h3>
                <p className="text-xs text-gray-600 mb-3">
                  If you encounter any issues while connecting your LinkedIn account, our support team is here to help.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <span className="font-medium">Email:</span>
                    <a 
                      href="mailto:support@outflo.io" 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      support@outflo.io
                    </a>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <span className="font-medium">Website:</span>
                    <a 
                      href="https://outflo.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      outflo.io
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </SheetContent>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Account Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {profile?.firstName}'s LinkedIn account?
              This action cannot be undone and will remove the account from your workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="h-9 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="h-9 bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default CommonLinkedInModal;
