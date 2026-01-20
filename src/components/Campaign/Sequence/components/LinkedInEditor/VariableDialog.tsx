"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { VariableAttrs, VariableFallback, FallbackStrategy } from "./types"
import { VARIABLE_OPTIONS } from "./types"

interface VariableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attrs: VariableAttrs
  variable?: {
    id: string
    name?: string
    placeholder?: string
    description?: string
    inputBoxHoverInfo?: string
    allLeadsPresentInfo?: string
    type?: string
    missingRows?: number | number[]
    totalRows?: number
  } | null
  onSave: (updates: { label: string; fallback: VariableFallback }) => void
}

export default function VariableDialog({ open, onOpenChange, attrs, variable, onSave }: VariableDialogProps) {
  const [label, setLabel] = useState(attrs.label)
  const [strategy, setStrategy] = useState<FallbackStrategy>(attrs.fallback.strategy)
  const [value, setValue] = useState(String(attrs.fallback.value ?? ""))
  const [dependsOn, setDependsOn] = useState<string[]>(attrs.fallback.dependsOn ?? [])

  useEffect(() => {
    if (open) {
      setLabel(attrs.label)
      setStrategy(attrs.fallback.strategy)
      setValue(String(attrs.fallback.value ?? ""))
      setDependsOn(attrs.fallback.dependsOn ?? [])
    }
  }, [open, attrs])

  const handleSave = () => {
    const fallback: VariableFallback = {
      strategy,
      value: value || null,
    }
    if (strategy === "computed" && dependsOn.length > 0) {
      fallback.dependsOn = dependsOn
    }
    onSave({ label, fallback })
  }

  const handleDependsOnChange = (variableId: string) => {
    setDependsOn((prev) => (prev.includes(variableId) ? prev.filter((id) => id !== variableId) : [...prev, variableId]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Variable</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="variable-id">Variable ID</Label>
            <Input id="variable-id" value={attrs.id} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="variable-label">Label</Label>
            <Input
              id="variable-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Display label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallback-strategy">Fallback Strategy</Label>
            <Select value={strategy} onValueChange={(val) => setStrategy(val as FallbackStrategy)}>
              <SelectTrigger id="fallback-strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="empty">Empty</SelectItem>
                <SelectItem value="static">Static</SelectItem>
                <SelectItem value="computed">Computed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(strategy === "static" || strategy === "default") && (
            <div className="space-y-2">
              <Label htmlFor="fallback-value">Fallback Value</Label>
              <Input
                id="fallback-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter fallback value"
              />
            </div>
          )}
          {strategy === "computed" && (
            <div className="space-y-2">
              <Label>Dependencies</Label>
              <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                {VARIABLE_OPTIONS.filter((v) => v.id !== attrs.id).map((variable) => (
                  <label
                    key={variable.id}
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted px-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={dependsOn.includes(variable.id)}
                      onChange={() => handleDependsOnChange(variable.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{variable.label}</span>
                    <span className="text-xs text-muted-foreground">({variable.id})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
