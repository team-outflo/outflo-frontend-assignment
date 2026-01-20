"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import type { EditorMessage } from "./types"
import { serializeToEnrichmentText } from "./utils"

interface DebugMessageBarProps {
  message: EditorMessage
  className?: string
  variables?: Array<{
    id: string
    name?: string
    placeholder?: string
    description?: string
    exampleValue?: string
    inputBoxHoverInfo?: string
  }>
}

// Mock data for variable replacement (for debugging)
// Supports both formats: dot notation and underscore with camelCase
const MOCK_VARIABLE_DATA: Record<string, string> = {
  // LinkedIn variables (both formats)
  "linkedin.first_name": "John",
  "linkedin_first_name": "John",
  "linkedin.last_name": "Doe",
  "linkedin_last_name": "Doe",
  "linkedin.full_name": "John Doe",
  "linkedin_full_name": "John Doe",
  "linkedin.headline": "Software Engineer at Tech Corp",
  "linkedin_headline": "Software Engineer at Tech Corp",
  "linkedin.company": "Tech Corp",
  "linkedin_company": "Tech Corp",
  "linkedin.location": "San Francisco, CA",
  "linkedin_location": "San Francisco, CA",
  // Campaign variables
  "campaign.name": "Q1 Outreach Campaign",
  "campaign_name": "Q1 Outreach Campaign",
  "campaign.subject": "Let's Connect",
  "campaign_subject": "Let's Connect",
  // Sender variables (API format with camelCase)
  "sender.first_name": "Jane",
  "sender_firstName": "Jane",
  "sender_first_name": "Jane",
  "sender.last_name": "Smith",
  "sender_lastName": "Smith",
  "sender_last_name": "Smith",
  "sender.headline": "Test Headline",
  "sender_headline": "Test Headline",
  "sender.location": "Test Location",
  "sender_location": "Test Location",
  "sender.company": "My Company",
  "sender_company": "My Company",
  // CSV variables (generic examples)
  "csv_company": "Example Corp",
  "csv_title": "VP of Engineering",
  "csv_email": "example@example.com",
  // API variables
  "api_companySize": "50-100",
  "api_industry": "Technology",
}

export default function DebugMessageBar({ message, className = "", variables = [] }: DebugMessageBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Build mock data from variables if available, otherwise use default mock data
  const mockData = useMemo(() => {
    const data: Record<string, string> = { ...MOCK_VARIABLE_DATA }
    
    // Add variables from API with their exampleValue if available
    variables.forEach((variable) => {
      if (variable.exampleValue) {
        data[variable.id] = variable.exampleValue
      }
    })
    
    return data
  }, [variables])

  const resolvedMessage = useMemo(() => {
    const enrichmentText = serializeToEnrichmentText(message.json)
    
    // Replace variables with mock data (prioritize API exampleValue, then mock data)
    // Storage format uses single curly brackets {variableId}
    let resolved = enrichmentText
    
    // First, try to replace with variables from API (exampleValue)
    variables.forEach((variable) => {
      if (variable.exampleValue) {
        // Escape special regex characters in variable ID
        const escapedId = variable.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        // Match single curly brackets {variableId} (storage format)
        const pattern = new RegExp(`\\{${escapedId}\\}`, "g")
        resolved = resolved.replace(pattern, variable.exampleValue)
      }
    })
    
    // Then replace with mock data for any remaining variables
    Object.entries(mockData).forEach(([key, value]) => {
      // Skip if already replaced by API exampleValue
      if (!variables.find(v => v.id === key && v.exampleValue)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        // Match single curly brackets {variableId} (storage format)
        const pattern = new RegExp(`\\{${escapedKey}\\}`, "g")
        resolved = resolved.replace(pattern, value)
      }
    })

    // Replace any remaining {variableId} patterns with [VARIABLE: variableId]
    resolved = resolved.replace(/\{([^}]+)\}/g, "[VARIABLE: $1]")

    return resolved
  }, [message.json, variables, mockData])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolvedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const enrichmentText = serializeToEnrichmentText(message.json)

  return (
    <div className={`border-t bg-muted/30 ${className}`}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 text-xs"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            Debug Message
          </Button>
          <span className="text-xs text-muted-foreground">
            {message.characterCount} chars
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs"
        >
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Enrichment Text */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Enrichment Text ({"{variableId}"} format):</div>
            <div className="p-2 bg-background rounded border text-sm font-mono whitespace-pre-wrap break-words">
              {enrichmentText || "(empty)"}
            </div>
          </div>

          {/* Resolved Message */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Resolved Message (with mock data):</div>
            <div className="p-2 bg-background rounded border text-sm whitespace-pre-wrap break-words">
              {resolvedMessage || "(empty)"}
            </div>
          </div>

          {/* Variable Info */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Variables Found:</div>
            <div className="p-2 bg-background rounded border text-xs max-h-48 overflow-y-auto">
              {enrichmentText.match(/\{([^}]+)\}/g)?.map((match, idx) => {
                const variableId = match.replace(/\{|\}/g, "")
                const variable = variables.find(v => v.id === variableId)
                const hasExampleValue = variable?.exampleValue !== undefined
                const hasMockData = mockData[variableId] !== undefined
                const displayValue = variable?.exampleValue || mockData[variableId]
                
                return (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${hasExampleValue || hasMockData ? "bg-green-500" : "bg-amber-500"}`} />
                    <span className="font-mono text-xs">{variableId}</span>
                    {variable?.name && (
                      <span className="text-muted-foreground text-xs">({variable.name})</span>
                    )}
                    {displayValue && (
                      <span className="text-muted-foreground text-xs">→ {displayValue}</span>
                    )}
                    {!displayValue && (
                      <span className="text-muted-foreground text-xs">(no mock data)</span>
                    )}
                  </div>
                )
              }) || <span className="text-muted-foreground">No variables found</span>}
            </div>
          </div>
        </div>
      )}

      <code>
        {JSON.stringify(message.json, null, 2)}
      </code>
      <p>enrichmentText</p>
      <p>{message.enrichmentText}</p>
      <p>plainText</p>
      <p>{message.plainText}</p>
      <p>characterCount</p>
      <p>{message.characterCount}</p>
    </div>
  )
}
