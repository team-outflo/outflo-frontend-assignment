import {
  Home,
  Search,
  MessageSquare,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Link2,
  PanelLeftOpen,
  PanelLeftClose,
  ListPlus,
  LayoutDashboard,
  MoreHorizontal,
  LogOut,
  CreditCard,
  User,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/api/store/authStore";
import { useMemo } from "react";

import SidebarLink from "./sidebar/sidebar-link";
import SidebarAction from "./sidebar/sidebar-action";
import WhatsappIcon from "@/lib/icons/whatsapp";
import SidebarUserMenu from "./sidebar/user-menu";

interface SidebarProps {
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  activePage?: string;
}

export const Sidebar = ({ isExpanded, onToggle, activePage = 'campaigns' }: SidebarProps) => {
  const sidebarItems = [
    { icon: ListPlus, path: "/allcampaigns", name: "Campaigns", id: "campaigns" },
  ];

  // Get user data from auth store
  const { user, reset: resetAuthState } = useAuthStore();
  
  // Generate user display data with fallbacks
  const userData = useMemo(() => {
    // If no user data, show placeholder
    if (!user) {
      return {
        name: "Guest User",
        image: null,
        initials: "GU",
        role: "Guest"
      };
    }

    // Extract name (could be company name or user's name)
    const displayName = user?.username || "User";

    // Generate initials from name
    const initials = displayName
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      name: displayName,
      initials: initials || "U",
      // role:
    };
  }, [user]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = () => {
    resetAuthState();
    queryClient.clear();
    navigate("/login")
  };

  // Fix the sidebar structure for better collapsed appearance
  return (
    <div
      className={`${isExpanded ? 'w-64' : 'w-16'} flex flex-col py-6 transition-all duration-300 h-full`}
      style={{ backgroundColor: '#28244c' }}
    >
      {/* Header */}
      <div className={`flex items-center ${isExpanded ? 'justify-between px-4' : 'justify-center'} mb-4`}>
        {/* Logo */}
        <div className={`flex items-center ${isExpanded ? 'space-x-3' : ''}`}>
          <img
            src="/image.png"
            alt="OutFlo"
            className="w-8 h-8 rounded-full object-cover"
          />
          {isExpanded && (
            <div className="text-white font-bold text-xl">OutFlo</div>
          )}
        </div>

      </div>

      <div className="px-2 mb-4">
        <SidebarAction onClick={() => onToggle(!isExpanded)} Icon={isExpanded ? ChevronLeft : ChevronRight} isExpanded={isExpanded} name={isExpanded ? "Collapse" : "Expand"} />
      </div>
      {/* Navigation Items */}
      <nav className="flex flex-col space-y-2">
        {sidebarItems.map((item) => (
          <div className="px-2" key={item.id}>
            <SidebarLink to={item.path} isExpanded={isExpanded} isActive={activePage === item.id} Icon={item.icon} name={item.name} />
          </div>
        ))}
      </nav>

      {/* Bottom controls and Profile section */}
      <div className="mt-auto px-2 space-y-2">
        <SidebarAction name="Talk to Founder" isExpanded={isExpanded} Icon={WhatsappIcon} onClick={() => {
          window.open("https://wa.me/+919878006792", "_blank")
        }} />

        <SidebarUserMenu handleLogout={handleLogout}>
          <div className={`flex items-center ${isExpanded ? 'justify-between px-3' : 'justify-center'
            } p-3 bg-white/10 rounded-xl transition-all duration-300 text-white`}>
            {isExpanded ?
              <>
                <Avatar className="w-8 h-8 border-2 border-purple-400">
                  <AvatarImage src={userData.image || ""} alt={userData.name} />
                  <AvatarFallback className="bg-purple-600 text-white text-xs">
                    {userData.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 truncate flex-1">
                  <p className="text-sm font-medium truncate">{userData.name}</p>
                  <p className="text-xs text-white/70">{userData.role}</p>
                </div>
              </>
              : <button className="rounded-full focus:outline-none" aria-label="User menu">
                <Avatar className="w-8 h-8 border-2 border-purple-400">
                  <AvatarImage src={userData.image || ""} alt={userData.name} />
                  <AvatarFallback className="bg-purple-600 text-white text-xs">
                    {userData.initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          </div>
        </SidebarUserMenu>
      </div>
    </div>
  );
};
