import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { TooltipInfo } from "@/components/utils/TooltipInfo"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Plus, Info } from "lucide-react"
import type { Editor } from "@tiptap/react"
import { getVariableSource, getVariableLabel } from "./utils"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/common/api/client"
import { checkUnauthorized } from "@/common/api/post-process"
import { isApiVariable } from "@/utils/variableUtils"
import type { CsvColumnFix } from "@/types/campaigns"

interface VariableDropdownProps {
  editor: Editor
  variables?: Array<{
    id: string
    name?: string
    placeholder?: string
    description?: string
    inputBoxHoverInfo?: string
    allLeadsPresentInfo?: string
    type?: string
    missingRows?: number | number[]
    totalRows?: number
  }>
  campaignId?: string
  onVariableCreated?: () => void | Promise<void>
  /** CSV configuration for checking existing fixes */
  getCsvColumnFix?: (columnName: string) => CsvColumnFix | undefined
  /** Callback to open variable configuration modal */
  onVariableConfigRequest?: (variableId: string, variableName: string, variableType: 'csv' | 'api') => void
}

export default function VariableDropdown({
  editor,
  variables = [],
  campaignId,
  onVariableCreated,
  getCsvColumnFix,
  onVariableConfigRequest,
}: VariableDropdownProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Helper function to get the appropriate tooltip text based on variable state
  // const getTooltipText = useCallback((variable: typeof variables[0]): string => {
  //   // Handle missingRows as either number or array
  //   const missingRowsCount = Array.isArray(variable.missingRows)
  //     ? variable.missingRows.length
  //     : variable.missingRows

  //   // If missingRows > 0 (some leads missing), show inputBoxHoverInfo
  //   if (missingRowsCount !== undefined && missingRowsCount > 0) {
  //     return  variable.description || variable.inputBoxHoverInfo || ""
  //   }

  //   // If missingRows === 0 (all leads present), show allLeadsPresentInfo
  //   if (missingRowsCount === 0) {
  //     return variable.allLeadsPresentInfo || variable.description || ""
  //   }

  //   // If missingRows is undefined but totalRows exists and is > 0, assume all leads present
  //   if (missingRowsCount === undefined && variable.totalRows && variable.totalRows > 0) {
  //     return variable.allLeadsPresentInfo || variable.description || ""
  //   }

  //   // Default to description, then inputBoxHoverInfo, then allLeadsPresentInfo, then empty string
  //   return variable.description || variable.inputBoxHoverInfo || variable.allLeadsPresentInfo || ""
  // }, [])

  // Convert API variables to grouped format
  // Combine CSV and API variables into one group (like VariableSelector)
  const { linkedinVars, campaignVars, senderVars, customVars } = useMemo(() => {
    const linkedin: typeof variables = []
    const campaign: typeof variables = []
    const sender: typeof variables = []
    const custom: typeof variables = [] // Combined CSV and API variables

    variables.forEach((variable) => {
      const source = getVariableSource(variable.id)
      if (source === "linkedin") linkedin.push(variable)
      else if (source === "campaign") campaign.push(variable)
      else if (source === "sender") sender.push(variable)
      else if (source === "csv" || source === "api") {
        // Combine CSV and API variables
        custom.push(variable)
      }
    })

    // Apply search filter if search query exists
    const filterVars = (vars: typeof variables) => {
      if (!search.trim()) return vars
      const query = search.toLowerCase()
      return vars.filter(
        (v) =>
          v.id.toLowerCase().includes(query) ||
          v.name?.toLowerCase().includes(query) ||
          v.description?.toLowerCase().includes(query)
      )
    }

    return {
      linkedinVars: filterVars(linkedin),
      campaignVars: filterVars(campaign),
      senderVars: filterVars(sender),
      customVars: filterVars(custom),
    }
  }, [variables, search])

  // Determine when the "Add" button should appear (no matching vars + campaignId)
  const showAddButton = useMemo(() => {
    if (!search.trim() || !campaignId) return false
    const query = search.toLowerCase()
    const hasMatch = [
      ...linkedinVars,
      ...campaignVars,
      ...senderVars,
      ...customVars,
    ].some((v) => v.id.toLowerCase().includes(query) || v.name?.toLowerCase().includes(query))
    return !hasMatch
  }, [search, campaignId, linkedinVars, campaignVars, senderVars, customVars])

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/79b895e1-b04f-4544-a154-3135aaedab1a',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'run1',
        hypothesisId:'H1',
        location:'VariableDropdown.tsx:showAddButton',
        message:'showAddButton evaluation',
        data:{
          showAddButton,
          search: search.trim(),
          campaignId: !!campaignId,
          counts:{
            linkedin: linkedinVars.length,
            campaign: campaignVars.length,
            sender: senderVars.length,
            custom: customVars.length,
          }
        },
        timestamp:Date.now()
      })
    }).catch(()=>{})
  }, [showAddButton, search, campaignId, linkedinVars.length, campaignVars.length, senderVars.length, customVars.length])
  // #endregion

  const handleCreateCustomVariable = useCallback(
    async (variableName: string) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/79b895e1-b04f-4544-a154-3135aaedab1a',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'H2',
          location:'VariableDropdown.tsx:handleCreateCustomVariable',
          message:'create custom variable invoked',
          data:{ variableName: variableName.trim(), campaignId: !!campaignId },
          timestamp:Date.now()
        })
      }).catch(()=>{})
      // #endregion
      if (!variableName.trim() || !campaignId) {
        toast({
          title: "Cannot create variable",
          description: "Campaign ID is required to create a new variable.",
          variant: "destructive",
        })
        return
      }

      setIsCreating(true)
      try {
        const response = await post(
          `/campaigns/${campaignId}/custom-variables`,
          { variableName: variableName.trim() }
        ).then(checkUnauthorized)

        // Handle different possible response structures
        const createdVariable = (response as any)?.data?.data?.variable || (response as any)?.data?.variable || (response as any)?.variable

        if (createdVariable) {
          const variableId = createdVariable.id
          const label = createdVariable.name || variableName.trim()
          const source = getVariableSource(variableId)

          // Delete the { trigger character
          const { state } = editor
          const { from } = state.selection
          const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, "")

          if (textBefore === "{") {
            editor
              .chain()
              .focus()
              .deleteRange({ from: from - 1, to: from })
              .insertVariable({
                id: variableId,
                label: label,
                source: source,
                fallback: { strategy: "default", value: "" },
              })
              .run()
          } else {
            editor
              .chain()
              .focus()
              .insertVariable({
                id: variableId,
                label: label,
                source: source,
                fallback: { strategy: "default", value: "" },
              })
              .run()
          }

          // Refresh variables list to include the new variable
          if (onVariableCreated) {
            await onVariableCreated()
          }

          toast({
            title: "Variable created and inserted",
            description: `"${variableName}" has been created and inserted.`,
          })

          setOpen(false)
          setSearch("")
        } else {
          toast({
            title: "Unexpected response",
            description: "Variable was created but could not be inserted.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error creating custom variable:", error)
        toast({
          title: "Failed to create variable",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsCreating(false)
      }
    },
    [editor, toast, campaignId, onVariableCreated],
  )

  const handleSelect = useCallback(
    (variable: { id: string; name?: string } | string) => {
      // Handle both variable objects and custom string IDs
      const variableId = typeof variable === "string" ? variable : variable.id
      const variableName = typeof variable === "string" ? undefined : variable.name

      // Check if variable exists in the variables list
      const variableExists = variables.some(
        (v) => v.id === variableId || v.name?.toLowerCase() === variableId.toLowerCase()
      )

      // If variable doesn't exist in the list, create it first
      if (!variableExists && campaignId) {
        handleCreateCustomVariable(variableId)
        return
      }

      // If variable doesn't exist and no campaignId, show error
      if (!variableExists) {
        toast({
          title: "Variable not found",
          description: "This variable doesn't exist. Campaign ID is required to create new variables.",
          variant: "destructive",
        })
        return
      }

      // Variable exists, proceed with normal insertion
      // Delete the { trigger character
      const { state } = editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, "")

      const source = getVariableSource(variableId)
      const label = variableName || getVariableLabel(variableId)

      if (textBefore === "{") {
        editor
          .chain()
          .focus()
          .deleteRange({ from: from - 1, to: from })
          .insertVariable({
            id: variableId,
            label: label,
            source: source,
            fallback: { strategy: "default", value: "" },
          })
          .run()
      } else {
        editor
          .chain()
          .focus()
          .insertVariable({
            id: variableId,
            label: label,
            source: source,
            fallback: { strategy: "default", value: "" },
          })
          .run()
      }

      // Open configuration modal for CSV/API variables that are not yet configured
      if ((variableId.startsWith('csv_') || isApiVariable(variableId)) && getCsvColumnFix && onVariableConfigRequest) {
        const existingFix = getCsvColumnFix(variableId)
        if (!existingFix) {
          const variable = variables.find(v => v.id === variableId)
          const variableType = isApiVariable(variableId) ? 'api' : 'csv'
          const varName = variable?.name || label || getVariableLabel(variableId)
          onVariableConfigRequest(variableId, varName, variableType)
        }
      }

      setOpen(false)
      setSearch("")
    },
    [editor, toast, variables, campaignId, handleCreateCustomVariable, getCsvColumnFix, onVariableConfigRequest],
  )

  // Track previous text to detect "}" insertion
  const previousTextRef = useRef<string>("")

  // Initialize previousTextRef when editor is available
  useEffect(() => {
    if (editor) {
      const { state } = editor
      const { from } = state.selection
      previousTextRef.current = state.doc.textBetween(0, from, "")
    }
  }, [editor])

  useEffect(() => {
    const handleUpdate = () => {
      if (!editor) return

      const { state } = editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, "")

      // Check if "{" was just typed to open dropdown
      if (textBefore === "{" && !open) {
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }

      // Check if "}" was just typed to create variable
      // When "}" is typed, cursor is after it, so check character at from - 1
      if (textBefore === "}") {
        // Get all text before the cursor (including the "}")
        const textUpToCursor = state.doc.textBetween(0, from, "")

        // Find the matching "{" before the cursor
        let openBraceIndex = -1
        let braceDepth = 0

        // Search backwards from cursor position (excluding the just-typed "}")
        const searchText = textUpToCursor.slice(0, -1) // Remove the "}"

        for (let i = searchText.length - 1; i >= 0; i--) {
          if (searchText[i] === "}") {
            braceDepth++
          } else if (searchText[i] === "{") {
            if (braceDepth === 0) {
              openBraceIndex = i
              break
            } else {
              braceDepth--
            }
          }
        }

        // If we found a matching "{", extract the variable name
        if (openBraceIndex !== -1) {
          const variableName = searchText.slice(openBraceIndex + 1).trim()

          // Only proceed if there's actual text between the braces
          if (variableName.length > 0) {
            // Use setTimeout to handle after current transaction completes
            setTimeout(() => {
              const currentState = editor.state
              // Delete the text between {zand } (including both braces)
              // openBraceIndex is the position of "{", currentFrom - 1 is the position of "}"
              editor
                .chain()
                .focus()
                .deleteRange({ from: from - 2 - variableName.length, to: from })
                .insertVariable({
                  id: variableName,
                  label: variableName,
                  source: "custom",
                  fallback: { strategy: "default", value: "" },
                })
                .run()
            }, 0)
            setTimeout(() => {
              const currentState = editor.state
              // Delete the text between {zand } (including both braces)
              // openBraceIndex is the position of "{", currentFrom - 1 is the position of "}"
              editor
                .chain()
                .focus()
                .deleteRange({ from: openBraceIndex + 3, to: from })
            }, 0)
          }
        }
      }

      // Update previous text reference
      const currentText = state.doc.textBetween(0, from, "")
      previousTextRef.current = currentText
    }

    editor.on("update", handleUpdate)

    return () => {
      editor.off("update", handleUpdate)
    }
  }, [editor, open])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false)
        editor.commands.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, editor])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button ref={triggerRef} className="sr-only absolute top-0 left-0 h-0 w-0" aria-hidden="true" tabIndex={-1} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="bottom" onOpenAutoFocus={(e) => e.preventDefault()}>
        <TooltipProvider delayDuration={300}>
          <Command shouldFilter={false}>
            <CommandInput ref={inputRef} placeholder="Search variables..." value={search} onValueChange={setSearch} />
            <CommandList>
              {linkedinVars.length === 0 &&
                campaignVars.length === 0 &&
                senderVars.length === 0 &&
                customVars.length === 0 &&
                !(search.trim() &&
                  !linkedinVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  !campaignVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  !senderVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  !customVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  campaignId) && (
                  <CommandEmpty>
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      <p>No variables found.</p>
                    </div>
                  </CommandEmpty>
                )}
              {/* Variables from List (Combined CSV and API variables) */}
              {(customVars.length > 0 ||
                (search.trim() &&
                  !linkedinVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  !campaignVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  !senderVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  !customVars.some(
                    (v) =>
                      v.id.toLowerCase().includes(search.toLowerCase()) ||
                      v.name?.toLowerCase().includes(search.toLowerCase())
                  ) &&
                  campaignId)) && (
                  <CommandGroup>
                    <TooltipInfo
                      trigger={
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between w-full cursor-pointer">
                          <span>Variables from List</span>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </div>
                      }
                      content="Use these variables to personalize your message with details from the recipient's data in your CSV file. You can click any inserted variable to configure fallback behavior if that value is missing."
                      side="top"
                      align="end"
                    />
                    {/* Show "Add" button if search doesn't match any existing variables */}
                    {search.trim() &&
                      !linkedinVars.some(
                        (v) =>
                          v.id.toLowerCase().includes(search.toLowerCase()) ||
                          v.name?.toLowerCase().includes(search.toLowerCase())
                      ) &&
                      !campaignVars.some(
                        (v) =>
                          v.id.toLowerCase().includes(search.toLowerCase()) ||
                          v.name?.toLowerCase().includes(search.toLowerCase())
                      ) &&
                      !senderVars.some(
                        (v) =>
                          v.id.toLowerCase().includes(search.toLowerCase()) ||
                          v.name?.toLowerCase().includes(search.toLowerCase())
                      ) &&
                      !customVars.some(
                        (v) =>
                          v.id.toLowerCase().includes(search.toLowerCase()) ||
                          v.name?.toLowerCase().includes(search.toLowerCase())
                      )}
                    {customVars.map((variable) => {
                      // const tooltipText = getTooltipText(variable)
                      return (
                        <TooltipInfo
                          key={variable.id}
                          trigger={
                            <div
                              onClick={() => handleSelect(variable)}
                              className="px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-sm text-gray-800 font-medium">{variable.name || variable.id}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{variable.id}</span>
                                </div>
                              </div>
                            </div>
                          }
                          content={variable.description || ""}
                          side="right"
                        />
                      )
                    })}

                    <TooltipInfo
                      trigger={
                        <div
                          onClick={() => handleCreateCustomVariable(search.trim())}
                          className="px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"
                        >
                          <div className="flex items-center justify-between w-full text-purple-800 text-xs">
                            <div className="flex items-center">
                              <Plus className="w-4 h-4 mr-1" />
                              <span className="font-medium">
                                {isCreating ? "Creating..." : "Add"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{search.trim()}</span>
                              <Info className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      }
                      content="Create a new API variable to fetch dynamic data from external integrations."
                      side="right"
                    />

                  </CommandGroup>
                )}
              {linkedinVars.length > 0 && (
                <CommandGroup>
                  <TooltipInfo
                    trigger={
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between w-full cursor-pointer">
                        <span>LinkedIn</span>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </div>
                    }
                    content="Use these variables to personalize your message with details from the recipient's LinkedIn profile. You can click any inserted variable to configure fallback behavior if that value is missing."
                    side="top"
                    align="end"
                  />
                  {linkedinVars.map((variable) => {

                    return (

                      <TooltipInfo
                        key={variable.id}
                        trigger={
                          <div
                            onClick={() => handleSelect(variable)}
                            className="px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"

                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm text-gray-800 font-medium">{variable.name || variable.id}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{variable.id}</span>
                              </div>
                            </div>
                          </div>
                        }
                        content={variable.description || ""}
                        side="right"
                      />
                    )
                  })}
                </CommandGroup>
              )}
              {campaignVars.length > 0 && (
                <CommandGroup heading="Campaign">
                  {campaignVars.map((variable) => {

                    return (
                      <TooltipInfo
                        key={variable.id}
                        trigger={
                          <div
                            onClick={() => handleSelect(variable)}
                            className="px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm text-gray-800 font-medium">{variable.name || variable.id}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{variable.id}</span>
                              </div>
                            </div>
                          </div>
                        }
                        content={variable.description || ""}
                        side="right"
                      />
                    )
                  })}
                </CommandGroup>
              )}
              {senderVars.length > 0 && (
                <CommandGroup>
                  <TooltipInfo
                    trigger={
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between w-full cursor-pointer">
                        <span>Sender</span>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </div>
                    }
                    content="Use these variables to personalize your message with details from the sender's LinkedIn profile. If multiple sender accounts are connected, the values will automatically adjust based on the account assigned to each lead."
                    side="top"
                    align="end"
                  />
                  {senderVars.map((variable) => {
                    return (
                      <TooltipInfo
                        key={variable.id}
                        trigger={
                          <div
                            onClick={() => handleSelect(variable)}
                            className="px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm text-gray-800 font-medium">{variable.name || variable.id}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{variable.id}</span>
                              </div>
                            </div>
                          </div>
                        }
                        content={variable.description || ""}
                        side="right"
                      />
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  )
}
