import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllLeadLists, getLeadsByListId, exportLeadsAsCsv, createEmptyLeadList } from '@/api/leads/leadsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Download, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeadList {
  id: string;
  name: string;
  totalLeads: number;
  status: 'ACTIVE' | 'PROCESSING' | 'FAILED' | 'UNKNOWN';
  createdAt: string;
  updatedAt: string;
}

interface SavedLeadListsSectionProps {
  onLeadsLoaded: (leadListId: string, leads: any[]) => void;
}

export const SavedLeadListsSection: React.FC<SavedLeadListsSectionProps> = ({
  onLeadsLoaded,
}) => {
  const { toast } = useToast();
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [selectedLeadListId, setSelectedLeadListId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [exportingListId, setExportingListId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Fetch all lead lists on mount
  useEffect(() => {
    fetchLeadLists();
  }, []);

  const fetchLeadLists = async () => {
    setIsLoading(true);
    try {
      const response = await getAllLeadLists();
      const lists = (response.data as LeadList[]) || [];
      // Filter to show only ACTIVE lists (but allow PROCESSING to be visible)
      const filteredLists = lists.filter(
        (list) => list.status === 'ACTIVE' || list.status === 'PROCESSING'
      );
      // Sort by most recent first
      filteredLists.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - 
        new Date(a.updatedAt || a.createdAt).getTime()
      );
      setLeadLists(filteredLists);
    } catch (error) {
      console.error('Error fetching lead lists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved lead lists',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLeads = async () => {
    if (!selectedLeadListId) {
      toast({
        title: 'Error',
        description: 'Please select a lead list',
        variant: 'destructive',
      });
      return;
    }

    const selectedList = leadLists.find((list) => list.id === selectedLeadListId);
    if (selectedList?.status === 'PROCESSING') {
      toast({
        title: 'Info',
        description: 'This lead list is still processing. Please wait until it is complete.',
        variant: 'default',
      });
      return;
    }

    setIsLoadingLeads(true);
    try {
      const response = await getLeadsByListId(selectedLeadListId);
      const leadsData = (response.data as any)?.leads || [];
      const leadList = (response.data as any)?.leadList;

      if (!leadList || leadList.status !== 'ACTIVE') {
        throw new Error('Lead list is not active');
      }

      toast({
        title: 'Success',
        description: `Loaded ${leadsData.length} leads from "${leadList.name}"`,
      });

      onLeadsLoaded(selectedLeadListId, leadsData);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleExport = async (leadListId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the list when clicking export
    
    if (!leadListId) {
      toast({
        title: 'Error',
        description: 'Lead list ID is missing',
        variant: 'destructive',
      });
      return;
    }

    setExportingListId(leadListId);
    try {
      const blob = await exportLeadsAsCsv(leadListId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get list name for filename
      const list = leadLists.find(l => l.id === leadListId);
      const listName = list?.name || leadListId;
      const sanitizedListName = listName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      link.download = `${sanitizedListName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Leads exported successfully',
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export leads',
        variant: 'destructive',
      });
    } finally {
      setExportingListId(null);
    }
  };

  const handleCreateEmptyList = () => {
    setIsCreatingNew(true);
    setNewListName('');
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setNewListName('');
  };

  const handleSaveNewList = async () => {
    if (!newListName.trim()) return;

    setIsCreatingList(true);
    try {
      await createEmptyLeadList(newListName.trim());
      
      toast({
        title: 'List created',
        description: `"${newListName}" has been created successfully.`,
      });

      setIsCreatingNew(false);
      setNewListName('');
      fetchLeadLists(); // Refresh the list
    } catch (error) {
      console.error('Error creating empty lead list:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create lead list',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingList(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {/* <h3 className="text-lg font-semibold text-gray-900 mb-2">Saved Lead Lists</h3> */}
          <p className="text-base text-gray-600">
            Select a previously created lead list to use in this campaign.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLeadLists}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Create Empty List Section */}
      <div className="overflow-hidden transition-all duration-300 ease-in-out">
        {!isCreatingNew ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateEmptyList}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Empty List
          </Button>
        ) : (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <div className="p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  List Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter list name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  autoFocus
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelCreate}
                  disabled={isCreatingList}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNewList}
                  disabled={!newListName.trim() || isCreatingList}
                >
                  {isCreatingList ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading lead lists...</span>
        </div>
      ) : leadLists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No saved lead lists found.</p>
          <p className="text-xs text-gray-400 mt-2">
            Create a lead list using CSV upload or LinkedIn search.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leadLists.map((list) => (
              <div
                key={list.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedLeadListId === list.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                } ${list.status === 'PROCESSING' ? 'opacity-75' : ''}`}
                onClick={() => {
                  if (list.status !== 'PROCESSING') {
                    setSelectedLeadListId(list.id);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        checked={selectedLeadListId === list.id}
                        onChange={() => {
                          if (list.status !== 'PROCESSING') {
                            setSelectedLeadListId(list.id);
                          }
                        }}
                        disabled={list.status === 'PROCESSING'}
                        className="mt-1"
                      />
                      <h4 className="font-medium text-gray-900">{list.name}</h4>
                      {getStatusBadge(list.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 ml-6">
                      <span>{list.totalLeads} leads</span>
                      <span>•</span>
                      <span>{formatDate(list.updatedAt || list.createdAt)}</span>
                    </div>
                  </div>
                  {list.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleExport(list.id, e)}
                      disabled={exportingListId === list.id}
                      className="ml-2"
                      title="Export this lead list as CSV"
                    >
                      {exportingListId === list.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleLoadLeads}
              disabled={!selectedLeadListId || isLoadingLeads}
              className="w-full"
            >
              {isLoadingLeads ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Load Selected List'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

