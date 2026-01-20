import { LucideIcon } from "lucide-react";
import { Link, LinkProps } from "react-router-dom";
import SidebarTooltip from "./sidebar-tooltip";

type SidebarLinkProps = {
    isExpanded: boolean;
    isActive: boolean;
    name: string;
    Icon: LucideIcon;
};

export default function SidebarLink(props: LinkProps & SidebarLinkProps) {
    if (!props.isExpanded) {
        return (
            <SidebarTooltip content={props.name}>
                <SidebarLinkItem {...props} />
            </SidebarTooltip>
        );
    }

    return <SidebarLinkItem {...props} />;
}

function SidebarLinkItem({
    to,
    isExpanded,
    isActive,
    name,
    Icon,
}: LinkProps & SidebarLinkProps) {
    return (
        <Link
            to={to}
            className={`w-[100%] group relative flex items-center ${isExpanded ? "px-4 justify-start" : "justify-center px-0"
                } py-3 rounded-xl transition-all duration-300 hover:bg-white/10 ${isActive
                    ? "bg-white/20 text-white shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
        >
            <Icon
                size={20}
                className="transition-transform group-hover:scale-110 flex-shrink-0"
            />
            {isExpanded && <span className="ml-3 font-medium">{name}</span>}
            {isActive && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-full"></div>
            )}
        </Link>
    );
}
