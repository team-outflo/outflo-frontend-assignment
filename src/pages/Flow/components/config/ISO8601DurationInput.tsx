import React, { useState, useEffect } from "react";
import { toISODuration } from "@/utils/toISODuration";
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

const presetOptions = [
  { label: "Last 24 hours", duration: "PT24H" },
  { label: "Last 3 days", duration: "P3D" },
  { label: "Last 7 days (1 week)", duration: "P1W" },
  { label: "Last 30 days", duration: "P30D" },
];

interface ISO8601DurationInputProps {
  value?: string;
  onChange: (duration: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function ISO8601DurationInput({
  value = "",
  onChange,
  label = "Posts Newer Than",
  disabled = false,
}: ISO8601DurationInputProps) {
  const [number, setNumber] = useState("");
  const [unit, setUnit] = useState<"hours" | "days" | "weeks" | "months" | "years">("days");
  const [usePreset, setUsePreset] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("P1W");

  // Initialize from value if provided
  useEffect(() => {
    if (value) {
      // Check if value matches a preset
      const preset = presetOptions.find((p) => p.duration === value);
      if (preset) {
        setUsePreset(true);
        setSelectedPreset(value);
      } else {
        // Try to parse ISO duration to extract number and unit
        setUsePreset(false);
        // Parse ISO duration (e.g., "P3D" -> 3 days, "PT24H" -> 24 hours)
        const match = value.match(/P(?:T(\d+)H)?(?:(\d+)D)?(?:(\d+)W)?(?:(\d+)M)?(?:(\d+)Y)?/);
        if (match) {
          if (match[1]) {
            setNumber(match[1]);
            setUnit("hours");
          } else if (match[2]) {
            setNumber(match[2]);
            setUnit("days");
          } else if (match[3]) {
            setNumber(match[3]);
            setUnit("weeks");
          } else if (match[4]) {
            setNumber(match[4]);
            setUnit("months");
          } else if (match[5]) {
            setNumber(match[5]);
            setUnit("years");
          }
        }
      }
    }
  }, [value]);

  const handleCustomChange = (num: string, u: typeof unit) => {
    if (disabled) return;
    setNumber(num);
    setUnit(u);
    setUsePreset(false);
    if (!num) {
      onChange("");
      return;
    }
    const iso = toISODuration(Number(num), u);
    onChange(iso);
  };

  const handlePreset = (duration: string) => {
    if (disabled) return;
    setSelectedPreset(duration);
    setUsePreset(true);
    onChange(duration);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={usePreset ? "default" : "outline"}
            size="sm"
            onClick={() => !disabled && setUsePreset(true)}
            className="flex-1"
            disabled={disabled}
          >
            Preset
          </Button>
          <Button
            type="button"
            variant={!usePreset ? "default" : "outline"}
            size="sm"
            onClick={() => !disabled && setUsePreset(false)}
            className="flex-1"
            disabled={disabled}
          >
            Custom
          </Button>
        </div>
      </div>

      {usePreset ? (
        <div className="space-y-2">
          <Select value={selectedPreset} onValueChange={handlePreset} disabled={disabled}>
            <SelectTrigger className="w-full" disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presetOptions.map((preset) => (
                <SelectItem key={preset.duration} value={preset.duration}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Number"
              value={number}
              onChange={(e) => handleCustomChange(e.target.value, unit)}
              className="flex-1"
              disabled={disabled}
            />
            <Select
              value={unit}
              onValueChange={(v) => handleCustomChange(number, v as typeof unit)}
              disabled={disabled}
            >
              <SelectTrigger className="w-32" disabled={disabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {number && (
            <p className="text-xs text-muted-foreground">
              ISO Duration: {toISODuration(Number(number), unit)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

