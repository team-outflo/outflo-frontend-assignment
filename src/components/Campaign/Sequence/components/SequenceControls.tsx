import React, { useCallback, useState } from 'react';
import { AlertCircle, Settings, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface SequenceControlsProps {
  viewMode: boolean;
  hasFollowUps: boolean;
  excludeConnected: boolean;
  onToggleExcludeConnected: (checked: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarOpen: boolean;
}

export const SequenceControls: React.FC<SequenceControlsProps> = ({
  viewMode,
  hasFollowUps,
  excludeConnected,
  onToggleExcludeConnected,
  setIsSidebarOpen,
  isSidebarOpen

}) => {


  // Create a stable callback that handles the viewMode check
  const handleToggleExcludeConnected = useCallback((checked: boolean) => {
    if (!viewMode) {
      onToggleExcludeConnected(checked);
    }
  }, [viewMode, onToggleExcludeConnected]);

  return (
    <div className="space-y-6 pb-2">
  
      {/* View mode summary when there are no follow-ups */}
      {viewMode && !hasFollowUps && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            This campaign only uses the initial connection request with no follow-up messages.
          </p>
        </div>
      )}

      {/* View mode empty state */}
      {/* {viewMode && (
        <div className="pt-6 mt-6 text-center bg-gray-50 p-8 rounded-lg border border-gray-200">
          <AlertCircle className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">No sequence steps found</p>
          <p className="text-sm text-gray-500 mt-1">This campaign doesn't have any message sequence configured.</p>
        </div>
      )} */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Message Sequence Settings
            </SheetTitle>

          </SheetHeader>
          <hr className="border-gray-200 mt-2" />
          <div className="mt-6 space-y-6">
            {/* Follow-up Settings */}
            {hasFollowUps && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="exclude-connected-sidebar"
                    checked={excludeConnected}
                    onCheckedChange={handleToggleExcludeConnected}
                    disabled={viewMode}
                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600"
                  />
                  <Label
                    htmlFor="exclude-connected-sidebar"
                    className="text-sm font-medium cursor-pointer text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Don't send messages to already connected leads
                  </Label>
                </div>

                {excludeConnected && (
                  <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200/60">
                    <div className="flex items-center justify-between gap-2">
                    <AlertCircle className="w-8 h-8 text-blue-500" />
                      <p className="text-xs text-blue-600 flex items-center">
                        Messages will only be sent to leads who have accepted your connection request in this campaign.
                      </p>
                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 shadow-sm text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>


      
    </div>
  );
};
