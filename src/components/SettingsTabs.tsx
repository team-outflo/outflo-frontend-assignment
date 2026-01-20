import { NavLink, useNavigate } from "react-router-dom";
import { User, CreditCard, HelpCircle, User2, LogOut, Link2 } from "lucide-react";
import { Button } from "./ui/button";
import { useAuthStore } from "@/api/store/authStore";
import { useQueryClient } from "@tanstack/react-query";

const tabs = [
  {
    name: "Profile Settings",
    path: "/profile",
    icon: User2,
  },
  { name: "Billing", path: "/billing", icon: CreditCard },
  { name: "Integration", path: "/integration", icon: Link2 },
  { name: "Support", path: "/support", icon: HelpCircle },
];

export function SettingsTabs() {
  const { reset: resetAuthState } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = () => {
    resetAuthState();
    queryClient.clear();
    navigate("/login")
  };

  return (
    <nav className="flex flex-col gap-1 w-56 border-r border-border border-gray-100 pr-8 py-8 -my-8 sticky top-8">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`
          }
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.name}</span>
        </NavLink>
      ))}

      <Button
        className="mt-auto text-destructive hover:text-destructive"
        size="sm"
        variant="outline"
        color="error"
        onClick={handleLogout}
      >
        <LogOut />
        Log Out
      </Button>
    </nav>
  );
}
