// Outline variants (no fill, subtle frame)
export function PauseOutlineIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <rect
        x="0.5"
        y="0.5"
        width="17"
        height="17"
        rx="6"
        className="fill-transparent stroke-zinc-300"
        strokeWidth="1"
      />
      <rect x="6" y="5" width="2" height="8" rx="1" className="fill-zinc-700" />
      <rect x="10" y="5" width="2" height="8" rx="1" className="fill-zinc-700" />
    </svg>
  )
}

export function RunningOutlineIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <rect
        x="0.5"
        y="0.5"
        width="17"
        height="17"
        rx="6"
        className="fill-transparent stroke-zinc-300"
        strokeWidth="1"
      />
      <path d="M7 5.5L12 9L7 12.5Z" className="fill-zinc-700" />
    </svg>
  )
}

export function PauseGhostIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <rect x="6" y="5" width="2" height="8" rx="1" className="fill-zinc-700" />
      <rect x="10" y="5" width="2" height="8" rx="1" className="fill-zinc-700" />
    </svg>
  )
}

export function RunningGhostIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path d="M7 5.5L12 9L7 12.5Z" className="fill-zinc-700" />
    </svg>
  )
}


