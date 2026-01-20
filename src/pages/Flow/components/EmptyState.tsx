'use client'

import { Workflow, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAddNode: (type: string) => void
  isLoading: boolean
}

export function EmptyState({ onAddNode, isLoading }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center max-w-md pointer-events-auto">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Workflow className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Start Building Your Campaign
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Create your LinkedIn outreach automation workflow by adding nodes for
          actions, delays, and conditional logic.
        </p>
        <Button
          size="lg"
          onClick={() => onAddNode('start')}
          className="gap-2"
          disabled={isLoading}
        >

          {isLoading && <Loader2 className='animate-spin h-4 w-4' />}
          {!isLoading && <Plus className="w-4 h-4" />}
          Create Start Node
        </Button>
      </div>
    </div>
  )
}
