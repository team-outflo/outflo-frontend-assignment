import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export default function SidebarTooltip({ children, content }) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild className="w-full">
                  <div className="">
                  {children}
                  </div>
                </TooltipTrigger>
                <TooltipContent sideOffset={12} side="right" align="center" className="bg-black text-white border-0 max-w-xs"
                >
                    <div className="text-sm leading-relaxed whitespace-normal break-words">
                        {content}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
