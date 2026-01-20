import { LucideIcon } from "lucide-react";
import SidebarTooltip from "./sidebar-tooltip";
import { Button, ButtonProps } from "../ui/button";

type SidebarLinkProps = {
    isExpanded: boolean;
    name: string;
    Icon: (() => React.ReactElement) | LucideIcon;
};

export default function SidebarAction(props: ButtonProps & SidebarLinkProps) {
    if (!props.isExpanded) {
        return (
            <SidebarTooltip content={props.name}>
                <SidebarActionItem {...props} />
            </SidebarTooltip>
        );
    }

    return <SidebarActionItem {...props} />
}

function SidebarActionItem({
    onClick,
    isExpanded,
    name,
    Icon,
}: ButtonProps & SidebarLinkProps) {
    return (
        <Button
            onClick={onClick}
            className={`w-[100%] group relative flex items-center ${isExpanded ? "px-4 justify-start" : "justify-center px-0"
                } py-3 rounded-xl transition-all duration-300 text-white/60 hover:text-white bg-transparent hover:bg-gray-50/10
                } gap-3 [&_svg]:size-5`}
        >
            <Icon
                size={20}
                className="transition-transform group-hover:scale-110 flex-shrink-0"
            />
            {isExpanded && <span className="font-medium">{name}</span>}
        </Button>
    );
}
