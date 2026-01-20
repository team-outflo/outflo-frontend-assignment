import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { TooltipInfo } from "@/components/utils/TooltipInfo"
import VariableDialog from "./VariableDialog"
import type { VariableAttrs, VariableFallback } from "./types"
import { isApiVariable, getApiVariableBaseName } from "@/utils/variableUtils"
import { useCampaignStore } from "@/api/store/campaignStore"
import type { CsvColumnFix } from "@/types/campaigns"
import type { ValidatedVariable } from "../../types"
import { post } from "@/common/api/client"
import { checkUnauthorized } from "@/common/api/post-process"
import { useToast } from "@/hooks/use-toast"
import { normalizeVariableId } from "../fallbackUtils"

// ============================================================================
// Helper Functions - Variable Classification
// ============================================================================

/**
 * Checks if a variable ID is a first-class variable (linkedin_* or sender_*)
 */
function isFirstClassVariable(variableId: string): boolean {
  return variableId.startsWith("linkedin_") || 
         variableId.startsWith("linkedin.") ||
         variableId.startsWith("sender_") || 
         variableId.startsWith("sender.")
}

/**
 * Checks if a variable ID is a custom variable (not first-class)
 */
function isCustomVariable(variableId: string): boolean {
  return !isFirstClassVariable(variableId)
}

// ============================================================================
// Helper Functions - Chip Styling
// ============================================================================

type ChipColor = {
  bgColor: string
  textColor: string
}

const GREEN_CHIP: ChipColor = {
  bgColor: "bg-green-100",
  textColor: "text-green-700",
}

const RED_CHIP: ChipColor = {
  bgColor: "bg-red-100",
  textColor: "text-red-700",
}

/**
 * Determines chip color based on variable type and fix configuration
 */
function getChipColor(
  variableId: string,
  getCsvColumnFix: ((columnName: string) => CsvColumnFix | undefined) | undefined
): ChipColor {
  // First-class variables are always green
  if (isFirstClassVariable(variableId)) {
    return GREEN_CHIP
  }

  // Custom variables: red if no fix OR fix type is skipLeads, green otherwise
  if (isCustomVariable(variableId)) {
    const normalizedId = normalizeVariableId(variableId)
    const fix = getCsvColumnFix?.(normalizedId)
    
    if (!fix) {
      return RED_CHIP
    }
    
    return GREEN_CHIP
  }

  // Fallback to green
  return GREEN_CHIP
}

// ============================================================================
// Helper Functions - Tooltip Content Generation
// ============================================================================

/**
 * Generates human-readable fix explanation from fixChain
 */
function generateFixExplanation(fixChain: CsvColumnFix["fixChain"]): string {
  if (!fixChain) {
    return ""
  }

  const { fixType, defaultValue, sourceField, fallback } = fixChain
  let details = ""

  if (fixType === "insertDefaultValue") {
    details = `Fallback value: "${defaultValue || "Not set"}"`
  } else if (fixType === "fetchFromLinkedIn") {
    details = `Fetch from LinkedIn: ${sourceField || "Not selected"}`
    if (fallback) {
      if (fallback.fixType === "insertDefaultValue") {
        details += `\nFallback: "${fallback.defaultValue || "Not set"}"`
      } else if (fallback.fixType === "sendBlank") {
        details += "\nFallback: Insert a blank value"
      } else {
        details += "\nFallback: Skip this lead if the value cannot be found"
      }
    }
  } else if (fixType === "sendBlank") {
    details = "Insert a blank value"
  } else if (fixType === "skipLeads") {
    details = "Skip this lead if the required value is missing"
  } else if (fixType === "allLeadsPresent") {
    details = "All required values are present — no fix needed"
  }

  return details
}


/**
 * Gets tooltip content for a variable
 */
function getTooltipContent(
  variableId: string,
  variable: ValidatedVariable | null | undefined,
  getCsvColumnFix: ((columnName: string) => CsvColumnFix | undefined) | undefined,
  csvConfigForViewMode: any
): string {
  // First-class variables: show inputBoxHoverInfo or description
  if (isFirstClassVariable(variableId)) {
    return variable?.inputBoxHoverInfo || variable?.description || ""
  }

  // Custom variables: show fix explanation or mandatory configuration message
  if (isCustomVariable(variableId)) {
    const normalizedId = normalizeVariableId(variableId)
    
    // Check for fix in view mode
    if (csvConfigForViewMode) {
      const columnFix = csvConfigForViewMode.columnFixes?.find((fix: any) => 
        fix.columnName === variableId || fix.columnName === normalizedId
      )
      
      if (columnFix?.fixChain) {
        const sourceLabel = variableId.includes("linkedin_")
          ? "LinkedIn"
          : variableId.includes("csv_")
          ? "your provided list"
          : "your provided list"
        
        const tooltipCopy = `This variable is automatically filled with the variable we fetched from ${sourceLabel}. `
        return tooltipCopy + generateFixExplanation(columnFix.fixChain)
      }
    }
    
    // Check for fix in edit mode
    if (getCsvColumnFix) {
      const fix = getCsvColumnFix(normalizedId)
      if (fix?.fixChain) {
        return generateFixExplanation(fix.fixChain)
      }
    }
    
    // No fix exists - show mandatory configuration message
    return "This variable requires configuration. Click to configure."
  }

  return ""
}

// ============================================================================
// Main Component
// ============================================================================

export default function VariableNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const attrs: VariableAttrs = {
    id: node.attrs.id ?? "",
    label: node.attrs.label ?? "Variable",
    source: node.attrs.source ?? "linkedin",
    fallback: node.attrs.fallback ?? { strategy: "default", value: "" },
  }

  const { getCsvColumnFix, variables, campaign, mode, setVariables } = useCampaignStore()
  const { toast } = useToast()
  
  // Subscribe to csvConfig.columnFixes to trigger re-render when fixes change
  const columnFixes = campaign?.csvConfig?.columnFixes ?? []
  
  // Get options from the extension (for static callbacks and config)
  const extension = editor.extensionManager.extensions.find(ext => ext.name === "variableMention")
  const options = extension?.options || {}
  const {
    onLinkedInVariableClick,
    onCsvVariableClick,
    onApiVariableClick,
    csvConfigForViewMode,
    csvData,
  } = options

  // Get disabled state from extension storage (editor-specific)
  const storage = editor.storage?.variableMention
  const disabled = storage?.disabled ?? false

  // Find the variable object from the variables array
  const variable = useMemo(() => {
    return variables.find(v => v.id === attrs.id) || null
  }, [variables, attrs.id])

  // Determine chip styling - re-compute when columnFixes change
  const { bgColor, textColor } = useMemo(() => {
    return getChipColor(attrs.id, getCsvColumnFix)
  }, [attrs.id, getCsvColumnFix, columnFixes])

  // Track previous fix to detect changes
  const prevFixRef = useRef<string | undefined>(undefined)
  
  // Trigger node update when fix changes to force re-render with new color
  useEffect(() => {
    const normalizedId = normalizeVariableId(attrs.id)
    const currentFix = getCsvColumnFix(normalizedId)
    const currentFixKey = currentFix ? JSON.stringify(currentFix.fixChain) : undefined
    
    // Only update if fix actually changed
    if (prevFixRef.current !== currentFixKey) {
      prevFixRef.current = currentFixKey
      // Trigger a node update to force re-render with new styling
      // Updating with same attributes triggers TipTap to re-render the node view
      updateAttributes(attrs)
    }
  }, [columnFixes, attrs.id, getCsvColumnFix, updateAttributes, attrs])

  // Determine if chip is clickable
  const isClickable = useMemo(() => {
    return !disabled
  }, [disabled])

  // Get tooltip content - re-compute when columnFixes change
  const tooltipContent = useMemo(() => {
    return getTooltipContent(attrs.id, variable, getCsvColumnFix, csvConfigForViewMode)
  }, [attrs.id, variable, getCsvColumnFix, csvConfigForViewMode, columnFixes])

  // Handle chip click - opens configuration modal
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    const variableId = attrs.id
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top,
    }

    const normalizedId = normalizeVariableId(variableId)

    // Check if variable exists and create if needed (only in edit mode)
    if (mode === 'edit') {
      const variableExists = variables.some(v => v.id === variableId || v.id === normalizedId)
      
      // Only create custom variables (csv_ or API variables) that don't exist
      if (!variableExists && (variableId.startsWith("csv_") || isApiVariable(variableId))) {
        if (!campaign?.id) {
          toast({
            title: "Cannot create variable",
            description: "Campaign ID is required to create a new variable.",
            variant: "destructive",
          })
          return
        }

        let variableName =variableId
        try {
          // Extract variable name from ID
       
          

          const response = await post(
            `/campaigns/${campaign.id}/custom-variables`,
            { variableName: variableName.trim() }
          ).then(checkUnauthorized)

          // Handle different possible response structures
          const createdVariable = (response as any)?.data?.data?.variable || (response as any)?.data?.variable || (response as any)?.variable

          if (createdVariable) {
            // Map the created variable to ValidatedVariable format
            const newVariableId = createdVariable.id || createdVariable.variableId || variableId
            const validatedVariable: ValidatedVariable = {
              id: newVariableId,
              name: createdVariable.name || variableName,
              description: createdVariable.description || "",
              placeholder: createdVariable.placeholder || `{${newVariableId}}`,
              exampleValue: createdVariable.exampleValue || "",
              type: (createdVariable.type === "custom" ? "api" : createdVariable.type) as ValidatedVariable["type"],
              source: (createdVariable.source === "custom" ? "api" : createdVariable.source) as ValidatedVariable["source"],
              inputBoxHoverInfo: createdVariable.inputBoxHoverInfo || "",
              allLeadsPresentInfo: createdVariable.allLeadsPresentInfo || "",
              isValidated: createdVariable.isValidated ?? true,
              missingRows: [],
              totalRows: 0,
              validationStatus: createdVariable.isValidated ? "valid" : "pending",
            }

            // Check if variable already exists before adding (safety check)
            const variableAlreadyExists = variables.some(v => v.id === newVariableId || v.id === variableId || v.id === normalizedId)
            if (!variableAlreadyExists) {
              // Add the new variable to the global variables array
              const updatedVariables = [...variables, validatedVariable]
              setVariables(updatedVariables)
            }

            toast({
              title: "Variable created",
              description: `"${variableName}" has been created and added to variables.`,
            })
            // Continue with the click handler below
          } else {
            toast({
              title: "Unexpected response",
              description: "Variable creation may have failed.",
              variant: "destructive",
            })
            return
          }
        } catch (error) {
          console.error("Error creating custom variable:", error)
          toast({
            title: `Failed to create variable "${variableName}"`,
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
          return
        }
      }
    }

    // Route to appropriate handler based on variable type
    if (variableId.startsWith("linkedin_")) {
      if (onLinkedInVariableClick) {
        const baseName = variableId.replace(/^(linkedin_)/, "")
        const variableName = baseName
          .replace(/([A-Z])/g, " $1")
          .split(/[_\s]+/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .filter(Boolean)
          .join(" ")
        onLinkedInVariableClick(normalizedId, variableName, position)
      }
    } else if (variableId.startsWith("csv_") && onCsvVariableClick) {
      const baseName = variableId.replace("csv_", "")
      const variableName = baseName
        .replace(/([A-Z])/g, " $1")
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .filter(Boolean)
        .join(" ")
      onCsvVariableClick(variableId, variableName)
    } else if (isApiVariable(variableId) && onApiVariableClick) {
      const baseName = getApiVariableBaseName(variableId)
      const variableName = baseName
        .replace(/([A-Z])/g, " $1")
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .filter(Boolean)
        .join(" ")
      onApiVariableClick(variableId, variableName)
    }
  }, [attrs.id, disabled, onLinkedInVariableClick, onCsvVariableClick, onApiVariableClick, mode, variables, campaign, toast, setVariables])

  // Handle dialog save
  const handleSave = useCallback((updates: {
    label: string
    fallback: VariableFallback
  }) => {
    updateAttributes({
      label: updates.label,
      fallback: updates.fallback,
    })
    setDialogOpen(false)
  }, [updateAttributes])

  const buttonElement = (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center rounded-md my-0.5 p-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
        isClickable
          ? "cursor-pointer hover:opacity-80"
          : "cursor-default"
      } ${bgColor} ${textColor}`}
      style={{ display: "inline-flex" }}
    >
      {"{"}
      {attrs.id}
      {"}"}
    </button>
  )

  const tooltipContentToShow = tooltipContent ? (
    tooltipContent
  ) : (
    <>
      <p>
        <span className="font-semibold">Label:</span> {attrs.label}
      </p>
      <p>
        <span className="font-semibold">ID:</span> {attrs.id}
      </p>
      <p>
        <span className="font-semibold">Source:</span> {attrs.source}
      </p>
    </>
  )

  return (
    <NodeViewWrapper as="span" className="variable-node-wrapper">
      <TooltipInfo
        trigger={buttonElement}
        content={tooltipContentToShow}
        side="top"
      />

      {!disabled && (
        <VariableDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          attrs={attrs} 
          variable={variable} 
          onSave={handleSave} 
        />
      )}
    </NodeViewWrapper>
  )
}
