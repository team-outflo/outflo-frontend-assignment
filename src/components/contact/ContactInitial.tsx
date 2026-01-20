import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { ExternalLink, RefreshCw, Info, Edit3, HelpCircle } from "lucide-react";
import ContactHeader from "./ContactHeader";

interface ContactProfileLike {
  name: string;
  title?: string;
  avatar?: string;
}

interface ContactInitialProps {
  profile: ContactProfileLike;
  workspace: string;
  isEditingWorkspace: boolean;
  onChangeWorkspace: (value: string) => void;
  onSaveWorkspace: () => void;
  onEditWorkspace: () => void;
  onRefreshLinkedIn: () => void;
  onConnect: () => void;
  disableConnect?: boolean;
  onShowHelp?: () => void;
}

const ContactInitial = ({
  profile,
  workspace,
  isEditingWorkspace,
  onChangeWorkspace,
  onSaveWorkspace,
  onEditWorkspace,
  onRefreshLinkedIn,
  onConnect,
  disableConnect,
  onShowHelp,
}: ContactInitialProps) => {
  return (
    <TooltipProvider>
      <div className="animate-slide-up space-y-5">
        <ContactHeader onShowHelp={onShowHelp} />

        <Card className="animate-scale-in">
          <CardHeader className="leading-4 pb-0.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                LinkedIn Account Detected
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefreshLinkedIn}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Refresh LinkedIn data</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* LinkedIn Profile Section */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground truncate">{profile.name}</h3>
                {profile.title && <p className="text-xs text-muted-foreground truncate">{profile.title}</p>}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>

            {/* Divider */}
            <div className="border-t border-border/50"></div>

            {/* Workspace Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">OutFlo Workspace</Label>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">Account Management</p>
                      <p className="text-muted-foreground">
                        To delete your account from this workspace later, you'll need to login to that workspace to disconnect
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>

              {isEditingWorkspace ? (
                <div className="flex gap-2">
                  <Input
                    id="workspace"
                    value={workspace}
                    onChange={(e) => onChangeWorkspace(e.target.value)}
                    placeholder="Enter workspace name"
                    className="text-sm h-8"
                    autoFocus
                  />
                  <Button size="sm" onClick={onSaveWorkspace} disabled={!workspace.trim()} className="h-8">
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {workspace || "Not set"}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEditWorkspace}
                        className="text-xs h-6 px-2 hover:bg-primary/10 group"
                      >
                        <Edit3 className="w-3 h-3 group-hover:text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">Edit Workspace</p>
                        <p className="text-muted-foreground">You can connect to a different OutFlo workspace name</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connect Button */}
        <Button
          onClick={onConnect}
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-medium py-5 text-base shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={!!disableConnect}
        >
          Connect to OutFlo
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default ContactInitial;


