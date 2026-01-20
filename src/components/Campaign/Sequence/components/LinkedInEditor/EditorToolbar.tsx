import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Undo2, Redo2, Trash2, Plus, Copy } from "lucide-react"
import type { Editor } from "@tiptap/react"
import { useState, useMemo } from "react"
import { getVariableSource, getVariableLabel } from "./utils"
import { useToast } from "@/hooks/use-toast"

interface EditorToolbarProps {
  editor: Editor
  characterCount: number
  characterLimit?: number
  variables?: Array<{
    id: string
    name?: string
    placeholder?: string
    description?: string
    inputBoxHoverInfo?: string
    type?: string
  
  }>
  onCopy?: () => void
  disabled?: boolean
}

export default function EditorToolbar({ editor, characterCount, characterLimit = 1900, variables = [] ,onCopy, disabled = false }: EditorToolbarProps) {
  const [variableOpen, setVariableOpen] = useState(false)
  const [variableSearch, setVariableSearch] = useState("")


  // Convert variables to grouped format - only linkedin, sender, and custom
  const { linkedinVars, senderVars, customVars } = useMemo(() => {
    const linkedin: typeof variables = []
    const sender: typeof variables = []
    const custom: typeof variables = []

    variables.forEach((variable) => {
      const source = getVariableSource(variable.id)
      if (source === "linkedin") {
        linkedin.push(variable)
      } else if (source === "sender") {
        sender.push(variable)
      } else {
        // Custom variables: anything that's not linkedin or sender
        custom.push(variable)
      }
    })

    return { linkedinVars: linkedin, senderVars: sender, customVars: custom }
  }, [variables])

  const handleInsertVariable = (variable: { id: string; name?: string } | string) => {
    // Handle both variable objects and custom string IDs
    const variableId = typeof variable === "string" ? variable : variable.id
    const variableName = typeof variable === "string" ? undefined : variable.name

    const source = getVariableSource(variableId)
    const label = variableName || getVariableLabel(variableId)
    
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
    setVariableOpen(false)
    setVariableSearch("")
  }

  const isOverLimit = characterCount > characterLimit
  const isNearLimit = characterCount > characterLimit * 0.9

  return (
    <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
      <div className={`flex items-center gap-1 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
        <Popover open={variableOpen} onOpenChange={setVariableOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
              <Plus className="h-4 w-4" />
              Add Variable
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search variables or type custom ID..." 
                value={variableSearch}
                onValueChange={setVariableSearch}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    <p>No variables found.</p>
                    {variableSearch.trim() && (
                      <button
                        onClick={() => {
                          const customId = variableSearch.trim()
                          if (customId) {
                            handleInsertVariable(customId)
                          }
                        }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Use "{variableSearch.trim()}" as custom variable
                      </button>
                    )}
                  </div>
                </CommandEmpty>
                {/* Show custom variable option if search doesn't match any existing variables */}
                {variableSearch.trim() && 
                 !linkedinVars.some(v => v.id.toLowerCase().includes(variableSearch.toLowerCase()) || v.name?.toLowerCase().includes(variableSearch.toLowerCase())) &&
                 !senderVars.some(v => v.id.toLowerCase().includes(variableSearch.toLowerCase()) || v.name?.toLowerCase().includes(variableSearch.toLowerCase())) &&
                 !customVars.some(v => v.id.toLowerCase().includes(variableSearch.toLowerCase()) || v.name?.toLowerCase().includes(variableSearch.toLowerCase())) && (
                  <CommandGroup heading="Custom Variable">
                    <CommandItem
                      value={variableSearch.trim()}
                      onSelect={() => handleInsertVariable(variableSearch.trim())}
                      className="w-full"
                    >
                      <span className="font-medium italic">Custom: {variableSearch.trim()}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{variableSearch.trim()}</span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {linkedinVars.length > 0 && (
                  <CommandGroup heading="LinkedIn">
                    {linkedinVars.map((variable) => (
                      <TooltipProvider key={variable.id} delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CommandItem
                              value={`${variable.name || variable.id} ${variable.id}`}
                              onSelect={() => handleInsertVariable(variable)}
                              className="w-full"
                            >
                              <span className="font-medium">{variable.name || variable.id}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{variable.id}</span>
                            </CommandItem>
                          </TooltipTrigger>
                          {variable.description && (
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="text-sm whitespace-pre-wrap">{variable.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </CommandGroup>
                )}
                {senderVars.length > 0 && (
                  <CommandGroup heading="Sender">
                    {senderVars.map((variable) => (
                      <CommandItem
                        key={variable.id}
                        value={`${variable.name || variable.id} ${variable.id}`}
                        onSelect={() => handleInsertVariable(variable)}
                      >
                        <span className="font-medium">{variable.name || variable.id}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{variable.id}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {customVars.length > 0 && (
                  <CommandGroup heading="Custom">
                    {customVars.map((variable) => (
                      <TooltipProvider key={variable.id} delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CommandItem
                              value={`${variable.name || variable.id} ${variable.id}`}
                              onSelect={() => handleInsertVariable(variable)}
                              className="w-full"
                            >
                              <span className="font-medium">{variable.name || variable.id}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{variable.id}</span>
                            </CommandItem>
                          </TooltipTrigger>
                          {variable.description && (
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="text-sm whitespace-pre-wrap">{variable.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onCopy}
          title="Copy message"
        >
          <Copy className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().clearContent().run()}
          title="Clear content"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div
        className={`text-sm font-medium tabular-nums ${
          isOverLimit ? "text-destructive" : isNearLimit ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {characterCount} / {characterLimit}
      </div>
    </div>
  )
}
