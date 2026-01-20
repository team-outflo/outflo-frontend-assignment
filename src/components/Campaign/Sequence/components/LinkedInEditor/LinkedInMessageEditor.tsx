import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import CharacterCount from "@tiptap/extension-character-count"
import { VariableMention } from "./VariableMention"
import VariableDropdown from "./VariableDropdown"
// import EditorToolbar from "./EditorToolbar"
import DebugMessageBar from "./DebugMessageBar"
import { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import type { EditorMessage, JSONContent } from "./types"
import { serializeToEnrichmentText, parseFromString, getVariableLabel, getVariableSource } from "./utils"
import { useToast } from "@/hooks/use-toast"
import { isApiVariable } from "@/utils/variableUtils"
import { convertToColumnFix } from "@/utils/columnFixesUtils"
import type { CsvColumnFix } from "@/types/campaigns"
import { UnifiedVariableConfigurationModal, VariableType } from "../UnifiedVariableConfigurationModal"
import type { LinkedInField } from "@/utils/columnFixesUtils"

const LINKEDIN_SAFE_LIMIT = 1900
const HARD_LIMIT = 3000

interface LinkedInMessageEditorProps {
  /** Current message state (controlled) */
  message: EditorMessage
  /** Callback when message changes */
  setMessage: (message: EditorMessage) => void
  /** Placeholder text */
  placeholder?: string
  /** Custom character limit (default: 1900 for LinkedIn) */
  characterLimit?: number
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Custom class name for the container */
  className?: string
  /** Show debug message bar */
  showDebugBar?: boolean
  /** Variable click handlers */
  onLinkedInVariableClick?: (variableId: string, variableName: string, position: { x: number; y: number }) => void
  onCsvVariableClick?: (variableId: string, variableName: string) => void
  onApiVariableClick?: (variableId: string, variableName: string) => void
  /** CSV configuration */
  getCsvColumnFix?: (columnName: string) => CsvColumnFix | undefined
  addCsvColumnFix?: (fix: CsvColumnFix) => void
  csvVariablesWithMissingData?: string[]
  csvConfigForViewMode?: any
  csvData?: any[]
  /** Variables list */
  variables?: Array<{
    id: string
    placeholder: string
    description?: string
    inputBoxHoverInfo?: string
    allLeadsPresentInfo?: string
    name?: string
    missingRows?: number | number[]
    totalRows?: number
  }>
  /** Callback when editor receives focus */
  onFocus?: () => void
  /** Campaign ID for creating variables */
  campaignId?: string
  /** Callback when a variable is created */
  onVariableCreated?: () => void | Promise<void>
}

export interface LinkedInMessageEditorRef {
  insertVariable: (variableId: string) => void
}

export const LinkedInMessageEditor = forwardRef<LinkedInMessageEditorRef, LinkedInMessageEditorProps>(({
  message,
  setMessage,
  placeholder = "Type your message... Use { to insert variables",
  characterLimit = LINKEDIN_SAFE_LIMIT,
  disabled = false,
  className = "",
  showDebugBar = false,
  onLinkedInVariableClick,
  onCsvVariableClick,
  onApiVariableClick,
  getCsvColumnFix,
  addCsvColumnFix,
  csvVariablesWithMissingData = [],
  csvConfigForViewMode,
  csvData,
  variables = [],
  onFocus,
  campaignId,
  onVariableCreated,
}, ref) => {
  const [mounted, setMounted] = useState(false)
  const [characterCount, setCharacterCount] = useState(message.characterCount)
  const isUpdatingFromProp = useRef(false)
  const lastJsonRef = useRef<string>(JSON.stringify(message.json))
  const { toast } = useToast()
  
  // State for variable configuration modal
  const [isVariableConfigOpen, setIsVariableConfigOpen] = useState(false)
  const [selectedVariable, setSelectedVariable] = useState<{
    id: string
    name: string
    type: VariableType
  } | null>(null)
  

  const handleCopy = async () => {
    const text = message.enrichmentText
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Store editor ref for paste handler
  const editorRef = useRef<any>(null)

  // Handle paste events to convert variables in pasted text to chips/nodes
  const handlePaste = useCallback((view: any, event: ClipboardEvent, slice: any) => {
    const clipboardData = event.clipboardData
    if (!clipboardData) return false

    const pastedText = clipboardData.getData('text/plain')
    if (!pastedText) return false

    // Check if the pasted text contains variables in {variableId} or {{variableId}} format
    const variablePattern = /\{(\{)?([^}]+)\}?\}/g
    const hasVariables = variablePattern.test(pastedText)
    
    if (!hasVariables) {
      // No variables found, let TipTap handle it normally
      return false
    }

    // Get editor instance from ref
    const editorInstance = editorRef.current
    if (!editorInstance) return false

    // Normalize the text: convert {{variableId}} to {variableId} for parsing
    const normalizedText = pastedText.replace(/\{\{([^}]+)\}\}/g, '{$1}')
    
    // Parse the text to convert variables to proper nodes
    const parsedContent = parseFromString(normalizedText)
    
    // Enhance parsed content with variable information from props
    if (parsedContent.content) {
      parsedContent.content.forEach((paragraph: JSONContent) => {
        if (paragraph.content) {
          paragraph.content.forEach((node: JSONContent) => {
            if (node.type === 'variableMention' && node.attrs) {
              const variableId = node.attrs.id as string
              const variable = variables.find(v => v.id === variableId)
              
              // Update with variable info from API
              if (variable) {
                node.attrs.label = variable.name || getVariableLabel(variableId)
              } else {
                node.attrs.label = getVariableLabel(variableId)
              }
              node.attrs.source = getVariableSource(variableId)
              if (!node.attrs.fallback) {
                node.attrs.fallback = { strategy: "default", value: "" }
              }
            }
          })
        }
      })
    }
    
    // Use editor's insertContent command
    editorInstance.chain().focus().insertContent(parsedContent).run()
    
    event.preventDefault()
    return true // Indicate we've handled the paste
  }, [variables])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      CharacterCount.configure({
        limit: HARD_LIMIT,
      }),
      VariableMention.configure({
        onLinkedInVariableClick: onLinkedInVariableClick,
        onCsvVariableClick:  onCsvVariableClick,
        onApiVariableClick:  onApiVariableClick,
        getCsvColumnFix: getCsvColumnFix,
        csvVariablesWithMissingData: csvVariablesWithMissingData,
        csvConfigForViewMode: csvConfigForViewMode,
        csvData: csvData,
        variables: variables || [],
        disabled,
      }),
    ],
    content: message.json,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none",
        "data-placeholder": placeholder,
      },
      handlePaste: handlePaste,
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingFromProp.current) return

      const json = editor.getJSON() as JSONContent
      const jsonStr = JSON.stringify(json)

      // Prevent duplicate updates
      if (jsonStr === lastJsonRef.current) return
      lastJsonRef.current = jsonStr

      const count = editor.storage.characterCount?.characters() ?? editor.getText().length
      const plainText = editor.getText()
      const enrichmentText = serializeToEnrichmentText(json)

      setCharacterCount(count)
      setMessage({
        json,
        enrichmentText,
        plainText,
        characterCount: count,
      })
    },
    immediatelyRender: false,
  })

  // Store editor in ref for paste handler
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Sync editor content when message.json changes externally
  useEffect(() => {
    if (!editor) return

    const currentJsonStr = JSON.stringify(editor.getJSON())
    const newJsonStr = JSON.stringify(message.json)

    if (currentJsonStr !== newJsonStr) {
      isUpdatingFromProp.current = true
      editor.commands.setContent(message.json)
      lastJsonRef.current = newJsonStr
      isUpdatingFromProp.current = false
    }
  }, [editor, message.json])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  // Sync disabled state to extension storage
  // 
  // IMPORTANT: Extension options are frozen at initialization. For editor-specific
  // state like disabled, we update the extension's storage.
  // 
  // Variables are now stored in campaignStore as the single source of truth,
  // so they don't need to be synced to extension storage.
  //
  // The extension's NodeView can access:
  // - Variables: from campaignStore (via useCampaignStore hook)
  // - Disabled: from editor.storage.variableMention.disabled
  useEffect(() => {
    if (!editor || !editor.storage?.variableMention) return

    // Update storage with disabled state only
    // Variables are accessed directly from campaignStore in NodeView
    editor.storage.variableMention.disabled = disabled ?? false
  }, [editor, disabled])

  // Handle focus events
  useEffect(() => {
    if (!editor || !onFocus) return

    const handleFocus = () => {
      onFocus()
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener("focus", handleFocus)

    return () => {
      editorElement.removeEventListener("focus", handleFocus)
    }
  }, [editor, onFocus])

  // Expose insertVariable via ref
  useImperativeHandle(ref, () => ({
    insertVariable: (variableId: string) => {
      if (!editor || disabled) return

      // Find variable from the actual variables prop (from API)
      const variable = variables.find(v => v.id === variableId)
      
      // Use variable name from API, or generate from ID
      const label = variable?.name || getVariableLabel(variableId)
      const source = getVariableSource(variableId)
     
      editor
        .chain()
        .focus()
        .insertVariable({
          id: variableId, // Keep original ID format from API
          label: label,
          source: source,
          fallback: { strategy: "default", value: "" },
        })
        .run()

      // Open configuration modal for CSV/API variables that are not yet configured
      if ((variableId.startsWith('csv_') || isApiVariable(variableId)) && getCsvColumnFix) {
        const existingFix = getCsvColumnFix(variableId)
        if (!existingFix) {
          const variableType: VariableType = isApiVariable(variableId) ? 'api' : 'csv'
          const variableName = variable?.name || getVariableLabel(variableId)
          
          setSelectedVariable({
            id: variableId,
            name: variableName,
            type: variableType
          })
          setIsVariableConfigOpen(true)
        }
      }
    },
  }), [editor, disabled, variables, getCsvColumnFix])

  if (!mounted) {
    return (
      <div className={`rounded-lg border bg-background ${className}`}>
        <div className="h-[200px]" />
      </div>
    )
  }

  if (!editor) {
    return (
      <div className={`rounded-lg border bg-background animate-pulse ${className}`}>
        <div className="h-[200px]" />
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${className}`}
    >
      {/* EditorToolbar commented out - core functionality preserved */}
      {/* <EditorToolbar editor={editor} characterCount={characterCount} characterLimit={characterLimit} variables={variables} onCopy={handleCopy} disabled={disabled} /> */}
      <div className="relative">
        <EditorContent editor={editor} />
        <VariableDropdown 
          editor={editor} 
          variables={variables} 
          campaignId={campaignId} 
          onVariableCreated={onVariableCreated}
          getCsvColumnFix={getCsvColumnFix}
          onVariableConfigRequest={(variableId, variableName, variableType) => {
            setSelectedVariable({
              id: variableId,
              name: variableName,
              type: variableType
            })
            setIsVariableConfigOpen(true)
          }}
        />
      </div>
      {/* {showDebugBar && (
        <DebugMessageBar message={message} variables={variables} />
      )} */}
      
      {/* Unified Variable Configuration Modal */}
      {selectedVariable && (
        <UnifiedVariableConfigurationModal
          isOpen={isVariableConfigOpen}
          onClose={() => {
            setIsVariableConfigOpen(false)
            setSelectedVariable(null)
          }}
          variableType={selectedVariable.type}
          variableId={selectedVariable.id}
          variableName={selectedVariable.name}
          onApply={(fixType, defaultValue, linkedInField, fallbackFixType, nestedFallbackFixType, nestedFallbackDefaultValue) => {
            if (!addCsvColumnFix) return
            
            // Create and apply the column fix based on fix type
            if (fixType === 'fetchFromLinkedIn') {
              const columnFix = convertToColumnFix({
                columnName: selectedVariable.id,
                fixType: 'fetchFromLinkedIn',
                linkedInField: linkedInField || 'firstName',
                fallbackFixType: fallbackFixType || 'skipLeads',
                fallbackDefaultValue: defaultValue
              })
              addCsvColumnFix(columnFix)
            } else if (fixType === 'allLeadsPresent') {
              const columnFixInput: any = {
                columnName: selectedVariable.id,
                fixType: 'allLeadsPresent',
                fallbackFixType: fallbackFixType || 'skipLeads',
                fallbackDefaultValue: defaultValue,
              };
              // Pass linkedInField when fallbackFixType is 'fetchFromLinkedIn'
              if (fallbackFixType === 'fetchFromLinkedIn' && linkedInField) {
                columnFixInput.linkedInField = linkedInField;
              }
              // Pass nested fallback information when fallbackFixType is 'fetchFromLinkedIn'
              if (fallbackFixType === 'fetchFromLinkedIn' && nestedFallbackFixType) {
                columnFixInput.nestedFallbackFixType = nestedFallbackFixType;
                if (nestedFallbackDefaultValue) {
                  columnFixInput.nestedFallbackDefaultValue = nestedFallbackDefaultValue;
                }
              }
              const columnFix = convertToColumnFix(columnFixInput);
              addCsvColumnFix(columnFix);
            } else {
              // For other fixes (sendBlank, insertDefaultValue, skipLeads)
              const columnFix = convertToColumnFix({
                columnName: selectedVariable.id,
                fixType,
                defaultValue,
              })
              addCsvColumnFix(columnFix)
            }
            
            setIsVariableConfigOpen(false)
            setSelectedVariable(null)
          }}
        />
      )}
    </div>
  )
})

LinkedInMessageEditor.displayName = "LinkedInMessageEditor"

export default LinkedInMessageEditor
