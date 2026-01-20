import { User, CreditCard, HelpCircle, LogOut, Plug, Link2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function SidebarUserMenu({ children, handleLogout }) {
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger 
                className="w-full" 
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                {children}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="right"
                align="end"
                className="bg-black text-white border-0 min-w-[10rem] max-w-[10rem] w-[10rem] px-0 py-2 overflow-hidden"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <Link to="/profile" onClick={() => setOpen(false)}>
                    <DropdownMenuItem className="hover:bg-menu-dark-hover hover:text-white text-white transition-all cursor-pointer px-4 py-2 flex items-center focus:bg-menu-dark-hover focus:text-white">
                        <User size={16} className="mr-2 text-white" />
                        <span className="text-white">Profile</span>
                    </DropdownMenuItem>
                </Link>
                <Link to="/billing" onClick={() => setOpen(false)}>
                    <DropdownMenuItem className="cursor-pointer hover:bg-menu-dark-hover hover:text-white text-white transition-all px-4 py-2 flex items-center focus:bg-menu-dark-hover focus:text-white">
                        <CreditCard size={16} className="mr-2 text-white" />
                        <span className="text-white">Billing</span>
                    </DropdownMenuItem>
                </Link>
                <Link to="/integration" onClick={() => setOpen(false)}>
                    <DropdownMenuItem className="cursor-pointer hover:bg-menu-dark-hover hover:text-white text-white transition-all px-4 py-2 flex items-center focus:bg-menu-dark-hover focus:text-white">
                        <Link2 size={16} className="mr-2 text-white" />
                        <span className="text-white">Integration</span>
                    </DropdownMenuItem>
                </Link>
                <Link to="/support" onClick={() => setOpen(false)}>
                    <DropdownMenuItem className="cursor-pointer hover:bg-menu-dark-hover hover:text-white text-white transition-all px-4 py-2 flex items-center focus:bg-menu-dark-hover focus:text-white">
                        <HelpCircle size={16} className="mr-2 text-white" />
                        <span className="text-white">Support</span>
                    </DropdownMenuItem>
                </Link>
                <div className="h-px bg-white/10 my-1.5" />

                <DropdownMenuItem
                    className="cursor-pointer hover:bg-destructive hover:text-white text-white focus:bg-destructive focus:text-white transition-all px-4 py-2 flex items-center"
                    onClick={() => {
                        setOpen(false);
                        handleLogout();
                    }}
                >
                    <LogOut className="mr-3 h-4 w-4 text-white" />
                    <span className="text-sm text-white">Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
