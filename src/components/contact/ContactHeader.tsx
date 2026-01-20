import { Button } from "@/components/ui/button";
import { HelpCircle, Users } from "lucide-react";

interface ContactHeaderProps {
  onShowHelp?: () => void;
}

const ContactHeader = ({ onShowHelp }: ContactHeaderProps) => {
  return (
    <div className="text-center space-y-2 relative">
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center animate-pulse-glow">
          <Users className="w-4 h-4 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">OutFlo</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowHelp}
          className="absolute right-0 top-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Streamline your LinkedIn Outreach</p>
    </div>
  );
};

export default ContactHeader;


