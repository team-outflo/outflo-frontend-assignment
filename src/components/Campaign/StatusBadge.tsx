import React from "react"
import { Timer } from "lucide-react"
import { cn } from "@/lib/utils"

type QueuedVariant = "violet"

interface StatusBadgeProps {
  status: "queued" | string
  queuedVariant?: QueuedVariant
  className?: string
}

const queuedStyles: Record<QueuedVariant, string> = {
  violet: "bg-queued-violet-bg text-queued-violet-text",
}

const queuedIcons: Record<QueuedVariant, React.ReactNode> = {
  violet: <Timer className="w-3.5 h-3.5 text-queued-violet-icon" />,
}

export function StatusBadge({ status, queuedVariant = "violet", className }: StatusBadgeProps) {
  if (status === "queued" || status === "QUEUED") {
    return (
      <span className={cn("status-badge inline-flex items-center gap-2", queuedStyles[queuedVariant], className)}>
        {queuedIcons[queuedVariant]}
        <span className="text-xs font-medium">Queued</span>
      </span>
    )
  }

  return null
}

