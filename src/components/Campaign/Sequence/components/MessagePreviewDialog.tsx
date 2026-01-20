import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Settings, RefreshCw, User, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LinkedInDataConfigurationModal } from './LinkedInDataConfigurationModal';
import { EnrichmentService, EnrichmentRequest } from './enrichmentService';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { useAuthStore } from '@/api/store/authStore';
import { Account } from '@/types/accounts';
import { Lead as CampaignLead } from '@/types/campaigns';

interface MessagePreview {
  leadId: string;
  accountId: string;
  message: string;
  status: boolean;
}

interface MessagePreviewDialogProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  viewMode?: boolean;
  fromConnectionSheet?: boolean;
  accountType?: 'premium' | 'non-premium';
}

export const MessagePreviewDialog: React.FC<MessagePreviewDialogProps> = ({
  isOpen,
  message,
  onClose,
  viewMode = false,
  fromConnectionSheet = false,
  accountType = 'non-premium'
}) => {
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isLinkedInConfigOpen, setIsLinkedInConfigOpen] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadLinkedInData, setLeadLinkedInData] = useState<Record<string, any>>({});

  // Get data from campaign store (single source of truth)
  const { campaign } = useCampaignStore();
  const { accessToken, isAuthenticated } = useAuthStore();
  
  // Use campaign store data for both view and edit modes
  const accounts = campaign?.senderAccounts || [];
  const leads = campaign?.leads?.data || [];
  const csvConfig = campaign?.csvConfig || {};

  const currentAccount = accounts[currentAccountIndex];
  const selectedLead = Array.isArray(leads) ? leads.find(lead => {
    const leadId = lead.id || lead.profileId || lead.url || (lead as any).details?.linkedinUrl;
    return leadId === selectedLeadId;
  }) : null;
  const currentPreview = messagePreviews.find(
    preview => preview.accountId === currentAccount?.id && preview.leadId === selectedLeadId
  );

  console.log('currentPreview', currentPreview);

  // Character limit validation for connection messages
  const getCharacterLimit = () => {
    return accountType === 'premium' ? 300 : 200;
  };

  const isMessageExceedingLimit = () => {
    console.log('isMessageExceedingLimit debug:', {
      fromConnectionSheet,
      accountType,
      currentPreview: currentPreview?.message,
      messageLength: currentPreview?.message?.length,
      limit: getCharacterLimit()
    });
    if (!fromConnectionSheet || !currentPreview?.message) return false;
    const limit = getCharacterLimit();
    const exceeds = currentPreview.message.length > limit;
    console.log('Message exceeds limit:', exceeds);
    return exceeds;
  };

  const getCharacterCountDisplay = () => {
    if (!fromConnectionSheet || !currentPreview?.message) return null;
    const limit = getCharacterLimit();
    const current = currentPreview.message.length;
    return `${current}/${limit}`;
  };

  // Generate sample LinkedIn data for a lead
  const generateSampleLinkedInData = (lead: any) => {
    // Handle both regular campaign leads and view mode leads
    const firstName = lead.firstName || lead.details?.firstName || lead.profile?.firstName || 'John';
    const lastName = lead.details?.lastName || lead.profile?.lastName || 'Doe';
    const company = lead.details?.company || lead.profile?.company || 'Acme Corp';
    
    return {
      firstName: firstName,
      lastName: lastName,
      headline: lead.details?.headline || lead.profile?.headline || `${lead.details?.jobTitle || lead.profile?.title || 'Marketing Manager'} at ${company}`,
      location: lead.details?.location || lead.profile?.location || 'San Francisco, CA',
      company: company,
      title: lead.details?.jobTitle || lead.profile?.title || 'Marketing Manager'
    };
  };

  // Get LinkedIn data for current lead (generated or user-modified)
  const getLinkedInDataForLead = useCallback((lead: any) => {
    const leadId = lead.id || lead.profileId || lead.url || lead.leadDetails?.linkedinUrl || lead.campaignLeadDetails?.linkedinUrl;
    
    // If user has modified data, use that, otherwise generate sample
    if (leadLinkedInData[leadId]) {
      return leadLinkedInData[leadId];
    }
    
    return generateSampleLinkedInData(lead);
  }, [leadLinkedInData]);

  // Initialize data when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Set first lead as selected if available
      if (Array.isArray(leads) && leads.length > 0 && !selectedLeadId) {
        const firstLead = leads[0];
        const leadId = firstLead.id || firstLead.profileId || firstLead.url || (firstLead as any).details?.linkedinUrl;
        setSelectedLeadId(leadId);
      }
    }
  }, [isOpen, leads, selectedLeadId]);

  // Load message preview for current selection only
  // Sends raw data with variables to backend - no client-side enrichment
  const loadMessagePreviews = useCallback(async () => {
    if (accounts.length === 0 || !Array.isArray(leads) || leads.length === 0) {
      return;
    }

    // Check if we have a current selection
    if (!currentAccount || !selectedLead) {
      return;
    }

    // Check authentication
    if (!isAuthenticated || !accessToken) {
      setError('Authentication required. Please log in to preview messages.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Send raw data with variables to backend - backend handles all enrichment logic
      console.log('Sending enrichment request for lead:', selectedLead);
      
      // Extract CSV data from lead (same for both view and edit modes)
      const leadCsvData = selectedLead || {};
      
      const request: EnrichmentRequest = {
        message: message,
        leadLinkedInData: getLinkedInDataForLead(selectedLead),
        leadCsvData: leadCsvData,
        leadSenderData: currentAccount,
        csvConfig: {
          columnFixes: (csvConfig as any)?.columnFixes || [],
          detectedColumns: (csvConfig as any)?.detectedColumns || []
        }
      };


      const result = await EnrichmentService.processMessage(request);

      console.log('result', result);
      
      const preview: MessagePreview = {
        leadId: selectedLead.id || selectedLead.profileId || selectedLead.url,
        accountId: currentAccount.id,
            message: result.enrichedMessage,
            status: result.success 
      };
      
      // Update the previews array with only the current selection
      setMessagePreviews(prev => {
        const filtered = prev.filter(p => !(p.accountId === currentAccount.id && p.leadId === (selectedLead.id || selectedLead.profileId || selectedLead.url)));
        return [...filtered, preview];
      });
      
      // If enrichment failed, show a warning
      if (!result.success) {
        console.error(`Enrichment failed for lead ${selectedLead.id}:`, result.error);
        setError('Message enrichment failed. Check the console for details.');
      }
      
    } catch (err) {
      console.error('Failed to load message preview:', err);
      
      // Handle specific authentication errors
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError('Authentication failed. Please log in again to preview messages.');
        } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
          setError('Access denied. You do not have permission to preview messages.');
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Failed to load message preview: ${err.message}`);
        }
      } else {
        setError('Failed to load message preview. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accounts, leads, currentAccount, selectedLead, isAuthenticated, accessToken, message, csvConfig, getLinkedInDataForLead]);

  const handleAccountNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentAccountIndex(prev => 
        prev === 0 ? accounts.length - 1 : prev - 1
      );
    } else {
      setCurrentAccountIndex(prev => 
        prev === accounts.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleLeadChange = (leadId: string) => {
    if (leadId === selectedLeadId) return; // Don't reload if same lead
    
    setSelectedLeadId(leadId);
  };

  // Auto-load preview when account or lead changes
  useEffect(() => {
    if (currentAccount && selectedLead && isOpen) {
      loadMessagePreviews();
    }
  }, [currentAccount, selectedLead, isOpen, loadMessagePreviews]);

  // Refresh enrichment when LinkedIn data is updated
  useEffect(() => {
    if (Object.keys(leadLinkedInData).length > 0 && currentAccount && selectedLead && isOpen) {
      console.log('LinkedIn data updated, refreshing enrichment...');
      loadMessagePreviews();
    }
  }, [leadLinkedInData, currentAccount, selectedLead, isOpen, loadMessagePreviews]);

  const handleLinkedInDataSave = (leadId: string, linkedInData: any) => {
    console.log('handleLinkedInDataSave called with:', { leadId, linkedInData });
    
    // Store the user's modified LinkedIn data
    setLeadLinkedInData(prev => {
      const updated = {
        ...prev,
        [leadId]: linkedInData
      };
      console.log('Updated leadLinkedInData:', updated);
      return updated;
    });
    
    // Close the modal first
    setIsLinkedInConfigOpen(false);
  };



  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[700px] h-[600px] max-w-none max-h-none overflow-y-auto flex flex-col data-[state=open]:animate-none">
          <DialogHeader className="pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Message Preview
                </DialogTitle>
              </div>
              
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-6 pr-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            {/* Navigation and Selection */}
            <div className="flex items-center justify-between pt-4">
              {/* Account Selection Dropdown */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Sender:</span>
                {accounts.length > 0 ? (
                  <Select 
                    value={currentAccount?.id || ''} 
                    onValueChange={(accountId) => {
                      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
                      if (accountIndex !== -1) {
                        setCurrentAccountIndex(accountIndex);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48 transition-all duration-200 ease-in-out">
                      <SelectValue placeholder="Select sender account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account, index) => (
                        <SelectItem 
                          key={account.id} 
                          value={account.id}
                          className="transition-all duration-150 ease-in-out"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {(account?.firstName || '?').charAt(0)}
                  </div>
                            <span>{account ? `${account.firstName} ${account.lastName}` : 'Unknown'}</span>
                </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500">No accounts available</div>
                )}
              </div>

              {/* Lead Selection */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Lead:</span>
                {Array.isArray(leads) && leads.length > 0 ? (
                <Select value={selectedLeadId} onValueChange={handleLeadChange}>
                    <SelectTrigger className="w-48 transition-all duration-200 ease-in-out">
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => {
                      const leadId = lead.id || lead.profileId || lead.url || (lead as any).details?.linkedinUrl;
                      const linkedinUrl = (lead as any).linkedinUrl || (lead as any).details?.linkedinUrl || lead.url;
                      
                      // Always show LinkedIn URL, fallback to lead ID if no URL
                      const displayText = linkedinUrl || leadId || 'Unknown Lead';
                      
                      return (
                        <SelectItem 
                          key={leadId} 
                          value={leadId}
                          className="transition-all duration-150 ease-in-out"
                        >
                          {displayText}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                ) : (
                  <div className="text-sm text-gray-500 transition-all duration-200 ease-in-out">No leads available</div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkedInConfigOpen(true)}
                  className="h-8 w-8 p-0"
                  title="Configure LinkedIn data"
                  disabled={!selectedLead}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (Array.isArray(leads) && leads.length > 0) {
                      const currentIndex = leads.findIndex(lead => {
                        const leadId = lead.id || lead.profileId || lead.url || (lead as any).details?.linkedinUrl;
                        return leadId === selectedLeadId;
                      });
                      const nextIndex = (currentIndex + 1) % leads.length;
                      const nextLead = leads[nextIndex];
                      const nextLeadId = nextLead.id || nextLead.profileId || nextLead.url || (nextLead as any).details?.linkedinUrl;
                      setSelectedLeadId(nextLeadId);
                    }
                  }}
                  disabled={isLoading || accounts.length === 0 || leads.length === 0 || !isAuthenticated || !currentAccount || !selectedLead}
                  className="h-8 w-8 p-0 transition-all duration-200 hover:scale-105 active:scale-95"
                  title={!isAuthenticated ? "Please log in to preview next lead" : !currentAccount || !selectedLead ? "Please select an account and lead" : "Preview next lead"}
                >
                  <RefreshCw className={`h-4 w-4 transition-transform duration-200 ${isLoading ? 'animate-spin' : 'hover:rotate-90'}`} />
                </Button>
              </div>
            </div>


            {/* Message Preview Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <div className="relative">
                      <div className="w-8 h-8 border-3 border-blue-100 rounded-full"></div>
                      <div className="w-8 h-8 border-3 border-transparent border-t-blue-500 rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">
                        Loading enriched message preview...
                      </p>
                      <div className="flex justify-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                    <Button
                      onClick={loadMessagePreviews}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : accounts.length === 0 || !Array.isArray(leads) || leads.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-6 h-6 text-gray-400" />
                      </div>
                    <p className="text-sm text-gray-600 mb-2">No data available</p>
                    <p className="text-xs text-gray-500">
                      {accounts.length === 0 && (!Array.isArray(leads) || leads.length === 0)
                        ? 'No accounts or leads found. Please add some data first.'
                        : accounts.length === 0 
                        ? 'No accounts found. Please add accounts first.'
                        : 'No leads found. Please add leads first.'
                      }
                    </p>
                        </div>
                      </div>
              ) : (
                <div>
                  {/* Message Content */}
                  <textarea
                    value={currentPreview?.message || 'No message available for this account and lead combination.'}
                    readOnly
                    disabled
                    className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-0 cursor-default"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                  
                  {/* Character Limit Warning for Connection Messages */}
                  {fromConnectionSheet && currentPreview?.message && (
                    <div className="mt-4">
                      {/* Character Count Display */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">Character count:</span>
                        <span className={`text-xs font-medium ${
                          isMessageExceedingLimit() ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {getCharacterCountDisplay()}
                        </span>
                      </div>
                      
                      {/* Warning Message */}
                      {isMessageExceedingLimit() && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                              <p className="font-medium"> Connection Request Warning</p>
                              <p className="text-amber-700 mt-1">
                                Your connection request will be sent without a note because the message exceeds the character limit.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>

            {/* Footer Info */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Preview Information</p>
                  <p className="text-xs text-blue-700 mt-1">
                    This preview uses enriched LinkedIn data. Click the settings icon to configure lead information.
                  </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LinkedIn Data Configuration Modal */}
      <LinkedInDataConfigurationModal
        isOpen={isLinkedInConfigOpen}
        onClose={() => setIsLinkedInConfigOpen(false)}
        lead={selectedLead ? {
          id: (selectedLead as any).linkedinUrl || selectedLead.profileId || selectedLead.url || (selectedLead as any).details?.linkedinUrl,
          name: `${selectedLead.firstName || (selectedLead as any).details?.firstName || 'Unknown'} ${(selectedLead as any).details?.lastName || (selectedLead as any).lastName || ''}`,
          linkedInData: getLinkedInDataForLead(selectedLead)
        } : null}
        onSave={handleLinkedInDataSave}
      />
    </>
  );
};
