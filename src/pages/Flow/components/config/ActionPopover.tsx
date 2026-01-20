"use client";

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
import { Info } from "lucide-react";

import { sub, startOfDay } from "date-fns";
import { useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";

export function getPostedBetween(value) {
  if (!value) return null;

  const [amountStr, unitRaw] = value.split("_");
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || !unitRaw) {
    throw new Error(
      `Invalid format: "${value}". Expected e.g. "3_days", "1_week".`
    );
  }

  // Normalize singular/plural (e.g., "day" -> "days")
  const unit = unitRaw.endsWith("s") ? unitRaw : `${unitRaw}s`;

  // Get today's start
  const before = startOfDay(new Date());

  // Subtract appropriate duration
  const after = sub(before, { [unit]: amount });

  return {
    after: after.toISOString(),
    before: before.toISOString(),
  };
}

interface ActionPopoverProps {
  children: React.ReactNode;
  nodeId: string;
  actionType: string;
  viewMode?: boolean;
}

const PRESET_OPTIONS = [
  { label: "Last 7 days (1 week)", days: 7, duration: "P7D" },
  { label: "Last 14 days (2 weeks)", days: 14, duration: "P14D" },
  { label: "Last 30 days (1 month)", days: 30, duration: "P30D" },
  { label: "Last 60 days (2 months)", days: 60, duration: "P60D" },
  { label: "Last 90 days (3 months)", days: 90, duration: "P90D" },
  { label: "Custom", days: null, duration: "CUSTOM" },
];

// Convert ISO8601 duration to days
function isoToDays(iso: string): number | null {
  if (!iso) return null;
  const match = iso.match(/P(?:T(\d+)H)?(?:(\d+)D)?(?:(\d+)W)?(?:(\d+)M)?/);
  if (match) {
    if (match[1]) return Math.floor(Number(match[1]) / 24); // hours to days
    if (match[2]) return Number(match[2]);
    if (match[3]) return Number(match[3]) * 7; // weeks to days
    if (match[4]) return Number(match[4]) * 30; // months to days
  }
  return null;
}

// Convert days to ISO8601 duration
function daysToIso(days: number): string {
  return `P${days}D`;
}

export function ActionPopover({
  children,
  nodeId,
  actionType,
  viewMode = false,
}: ActionPopoverProps) {
  const { getNode, updateNodeData } = useReactFlow();
  const node = getNode(nodeId);
  const [formData, setFormData] = useState<{
    postedNewerThan?: string;
    maxNoOfSkillsToEndorse?: number;
    [key: string]: any;
  }>({});
  const [open, setOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("P7D");
  const [customDays, setCustomDays] = useState<string>("");

  useEffect(() => {
    if (node?.data) {
      if (actionType === "LIKE_A_POST") {
        // Initialize with default ISO duration if not set
        if (!node.data.postedNewerThan) {
          updateNodeData(nodeId, ({ data }) => ({
            ...data,
            postedNewerThan: "P1W", // Default: 1 week
          }));
        }
      } else if (actionType === "ENDORSE_SKILLS") {
        updateNodeData(nodeId, ({ data }) => ({
          ...data,
          maxNoOfSkillsToEndorse: 5,
        }));
      }
    }
  }, [node, nodeId, actionType, updateNodeData]);

  useEffect(() => {
    if (node?.data) {
      setFormData(node.data);
      if (actionType === "LIKE_A_POST" && node.data.postedNewerThan) {
        const days = isoToDays(String(node.data.postedNewerThan));
        const preset = PRESET_OPTIONS.find((p) => p.days === days);
        if (preset) {
          setSelectedOption(preset.duration);
          setCustomDays("");
        } else {
          setSelectedOption("CUSTOM");
          setCustomDays(days?.toString() || "");
        }
      }
    } else {
      if (actionType === "LIKE_A_POST") {
        const defaultDuration = "P7D";
        setFormData({
          postedNewerThan: defaultDuration,
        });
        setSelectedOption(defaultDuration);
        setCustomDays("");
        updateNodeData(nodeId, ({ data }) => ({
          ...data,
          postedNewerThan: defaultDuration,
        }));
      } else if (actionType === "ENDORSE_SKILLS") {
        setFormData({ maxNoOfSkillsToEndorse: 5 });
        updateNodeData(nodeId, ({ data }) => ({
          ...data,
          maxNoOfSkillsToEndorse: 5,
        }));
      }
    }
  }, [node, nodeId, actionType, updateNodeData]);

  const handleSave = () => {
    if (actionType === "LIKE_A_POST") {
      let duration: string;
      if (selectedOption === "CUSTOM") {
        const days = parseInt(customDays, 10);
        if (isNaN(days) || days <= 0) {
          return; // Don't save invalid custom days
        }
        duration = daysToIso(days);
      } else {
        duration = selectedOption;
      }
      updateNodeData(nodeId, ({ data }) => ({
        ...data,
        postedNewerThan: duration,
      }));
    } else {
      updateNodeData(nodeId, ({ data }) => ({
        ...data,
        ...formData,
      }));
    }
    setOpen(false);
  };

  const handleOptionChange = (value: string) => {
    if (viewMode) return;
    setSelectedOption(value);
    if (value !== "CUSTOM") {
      const preset = PRESET_OPTIONS.find((p) => p.duration === value);
      if (preset) {
        setFormData({
          ...formData,
          postedNewerThan: preset.duration,
        });
      }
    }
  };

  const renderContent = () => {
    if (actionType === "LIKE_A_POST") {
      const selectedPreset = PRESET_OPTIONS.find((p) => p.duration === selectedOption);
      const showCustomInput = selectedOption === "CUSTOM";

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              POSTS NEWER THAN
            </Label>
            <Select
              value={selectedOption}
              onValueChange={(value: string) => handleOptionChange(value)}
              disabled={viewMode}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedPreset?.label || "Select an option"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.map((option) => (
                  <SelectItem key={option.duration} value={option.duration}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomInput && !viewMode && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Enter days"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                days ago
              </span>
            </div>
          )}

          {!viewMode && (
            <Button onClick={handleSave} className="w-full" size="sm">
              Save Configuration
            </Button>
          )}
        </div>
      );
    }

    if (actionType === "ENDORSE_SKILLS") {
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="maxSkills" className="text-xs">
              Max skills to endorse
            </Label>
            <Input
              id="maxSkills"
              type="number"
              min="1"
              max="50"
              value={formData.maxNoOfSkillsToEndorse || 5}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxNoOfSkillsToEndorse: Number(e.target.value) || 1,
                })
              }
              disabled={viewMode}
            />
          </div>
          {!viewMode && (
            <Button onClick={handleSave} className="w-full" size="sm">
              Save
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  // For actions that don't need popovers, just return children
  if (actionType !== "LIKE_A_POST" && actionType !== "ENDORSE_SKILLS") {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="center">
        <div className="space-y-1 mb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">
                Configure {actionType.replace(/_/g, " ")}
              </h4>
            
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>{renderContent()}</div>
      </PopoverContent>
    </Popover>
  );
}
