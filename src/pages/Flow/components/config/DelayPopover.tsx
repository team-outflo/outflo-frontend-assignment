import type React from "react";

import { useState, useEffect } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useReactFlow } from "@xyflow/react";

interface DelayPopoverProps {
    children: React.ReactNode;
    nodeId: string;
    viewMode?: boolean;
}

export function DelayPopover({ children, nodeId, viewMode = false }: DelayPopoverProps) {
    const { getNode, updateNodeData } = useReactFlow();
    const node = getNode(nodeId);
    const [delayValue, setDelayValue] = useState<number>(5);
    const [delayUnit, setDelayUnit] = useState<"minutes" | "hours" | "days">(
        "minutes"
    );
    const [open, setOpen] = useState(false);

    const [days, setDays] = useState(0);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);

    useEffect(() => {
        if (node?.data?.delay) {
            const totalMinutes = Number.parseInt(node.data?.delay ?? 180);
            setDays(Math.floor(totalMinutes / 1440));
            setHours(Math.floor((totalMinutes % 1440) / 60));
            setMinutes(totalMinutes % 60);
        }
    }, [node]);

    const handleSave = () => {
        const totalMinutes = days * 1440 + hours * 60 + minutes
        updateNodeData(nodeId, () => ({
            delay: totalMinutes,
        }))
        setOpen(false)
    }


    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent className="w-64" align="center">
                <div className="space-y-1">
                    <h4 className="font-medium text-sm">Configure Delay</h4>
                    {/* <p className="text-xs text-muted-foreground">
                        Set how long to wait before next action
                    </p> */}
                </div>
                <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                        {/* <Label htmlFor="delay-value" className="text-xs">
                            Delay Duration
                        </Label> */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-2">
                                <Label htmlFor="days" className="text-xs">
                                    Days
                                </Label>
                                <Input
                                    id="days"
                                    type="number"
                                    min="0"
                                    value={days}
                                    onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
                                    disabled={viewMode}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hours" className="text-xs">
                                    Hours
                                </Label>
                                <Input
                                    id="hours"
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={hours}
                                    onChange={(e) =>
                                        setHours(Math.max(0, Number(e.target.value)))
                                    }
                                    disabled={viewMode}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minutes" className="text-xs">
                                    Minutes
                                </Label>
                                <Input
                                    id="minutes"
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minutes}
                                    onChange={(e) =>
                                        setMinutes(Math.max(0, Number(e.target.value)))
                                    }
                                    disabled={viewMode}
                                />
                            </div>
                        </div>
                    </div>
                    {!viewMode && (
                        <Button onClick={handleSave} className="w-full" size="sm">
                            Save
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
