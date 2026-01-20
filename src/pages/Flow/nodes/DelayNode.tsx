import { Handle, Position } from "@xyflow/react";
import { Clock, Settings } from "lucide-react";
import { DelayPopover } from "../components/config/DelayPopover";
import { campaignStore } from "@/api/store/campaignStore";

function formatDelay(mins: number): string {
    // if (mins === 0) {
    //     return "No Delay";
    // }

    // if (mins >= 1440) {
    //     const days = Math.floor(mins / 1440);
    //     return `${days} day${days > 1 ? "s" : ""}`;
    // }
    // if (mins >= 60) {
    //     const hours = Math.floor(mins / 60);
    //     return `${hours} hour${hours > 1 ? "s" : ""}`;
    // }
    // return `${mins} min${mins > 1 ? "s" : ""}`;
    const minutes = mins;

    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;

    if (d === 0 && h === 0 && m === 0) return "No Delay";

    let label = ""

    if (d > 0 && h === 0 && m === 0) {
        label = `${d} Day${d === 1 ? "" : "s"}`
    } else if (d === 0 && h > 0 && m === 0) {
        label = `${h} Hour${h === 1 ? "" : "s"}`
    } else if (d === 0 && h === 0 && m > 0) {
        label = `${m} Minute${m === 1 ? "" : "s"}`
    } else {
        const timeParts = []
        if (d > 0) timeParts.push(`${d}d`)
        if (h > 0) timeParts.push(`${h}h`)
        if (m > 0 || timeParts.length === 0) timeParts.push(`${m}m`)
        label = timeParts.join(" ")
    }

    return label;
}

const Node = ({ delay }: { delay: number }) => (
    <div className=" px-4 py-2.5  rounded-lg border border-slate-300 shadow-sm min-w-[120px]">
        <div className="flex items-center justify-center gap-2">
            <Clock className="inline group-hover:hidden w-3.5 h-3.5 text-slate-600" />

            <Settings className="hidden group-hover:inline group-hover:text-blue-500 w-3.5 h-3.5 text-slate-600" />
            <span className=" group-hover:text-blue-500 font-medium text-xs text-slate-700">
                {formatDelay(delay)}
            </span>
        </div>
    </div>
);

export default function DelayNode({
    id,
    data,
}: {
    id: string;
    data: { delay: number };
}) {
    const mode = campaignStore.getState().mode;

    return (
        <div className="relative group rounded-lg bg-white hover:cursor-pointer hover:shadow-lg transition-all duration-300 ">
            <Handle
                type="target"
                position={Position.Top}
                className="invisible w-1 h-1 bg-slate-400 border-1 border-white"
            />
            <DelayPopover nodeId={id} viewMode={mode === "view"}>
                <div className=" px-4 py-2.5  rounded-lg border border-slate-300 shadow-sm min-w-[120px]">
                    <div className="flex items-center justify-center gap-2">
                        <Clock className="inline group-hover:hidden w-3.5 h-3.5 text-slate-600" />

                        <Settings className="hidden group-hover:inline group-hover:text-blue-500 w-3.5 h-3.5 text-slate-600" />
                        <span className=" group-hover:text-blue-500 font-medium text-xs text-slate-700">
                            {formatDelay(data.delay)}
                        </span>
                    </div>
                </div>
            </DelayPopover>
            {/* <pre className="absolute top-200 text-xs">{JSON.stringify(data, null, 2)}</pre> */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="invisible w-1 h-1 bg-slate-400 border-1 border-white"
            />
        </div>
    );
}
