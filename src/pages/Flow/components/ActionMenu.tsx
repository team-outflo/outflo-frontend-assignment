import {
    UserPlus,
    Mail,
    Inbox,
    Eye,
    ThumbsUp,
    GitBranch,
    Award,
    UserMinus,
    UserCheck,
    UserX,
    MessageCircle,
    MessageCircleOff,
    MessageSquare,
    Mic,
    Check,
    X,
    Lock,
    LockOpen,
    Clock,
    Square,
    Send,
    LucideIcon,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const iconMap: Record<string, LucideIcon> = {
    UserPlus,
    Mail,
    Inbox,
    Eye,
    ThumbsUp,
    GitBranch,
    Award,
    UserMinus,
    UserCheck,
    UserX,
    MessageCircle,
    MessageCircleOff,
    MessageSquare,
    Mic,
    Check,
    X,
    Lock,
    LockOpen,
    Clock,
    Square,
    Send,
};

interface ActionMenuProps {
    onSelectAction: (actionId: string) => void;
    actions: Array<{
        icon: string;
        id: string;
        label: string;
        type: string;
    }>;
}

export default function ActionMenu({
    onSelectAction,
    actions,
    children,
}: React.PropsWithChildren<ActionMenuProps>) {
  const groupedActions = actions.reduce((groups, action) => {
    if (!groups[action.type]) {
      groups[action.type] = [];
    }
    groups[action.type].push(action);
    return groups;
  }, {} as Record<string, typeof actions>);

  const labels = {
    conditional: "Conditionals",
    action: "Actions",
  };
  const orderedTypes = ["action", "conditional"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="px-0" side="top">
        {orderedTypes
          .filter((type) => groupedActions[type])
          .map((type) => (
            <div key={type}>
              <DropdownMenuLabel className="text-xs font-semi text-slate-500 uppercase">
                {labels[type]}
              </DropdownMenuLabel>
              {groupedActions[type].map((action) => {
                const Icon = iconMap[action.icon] || UserPlus;
                return (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => onSelectAction(action.id)}
                    className="gap-2 cursor-pointer rounded-none pr-4"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
