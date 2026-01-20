"use client"

import React, { useImperativeHandle, forwardRef, useState, useEffect, useRef } from "react"
import { LinkedInMessageEditor } from "./LinkedInMessageEditor"
import { stringToMessage, messageToString } from "./utils"
import { createEmptyMessage } from "./types"
import type { EditorMessage } from "./types"
import type { CsvColumnFix } from "@/types/campaigns"

interface LinkedInMessageEditorAdapterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  variables: Array<{
    id: string
    placeholder: string
    description?: string
    inputBoxHoverInfo?: string
    allLeadsPresentInfo?: string
    name?: string
    missingRows?: number | number[]
    totalRows?: number
  }>
  onLinkedInVariableClick?: (variableId: string, variableName: string, position: { x: number; y: number }) => void
  onCsvVariableClick?: (variableId: string, variableName: string) => void
  onApiVariableClick?: (variableId: string, variableName: string) => void
  csvVariablesWithMissingData?: string[]
  getCsvColumnFix?: (columnName: string) => any
  addCsvColumnFix?: (fix: CsvColumnFix) => void
  onFocus?: () => void
  csvConfigForViewMode?: any
  csvData?: any[]
  showDebugBar?: boolean
  campaignId?: string
  onVariableCreated?: () => void | Promise<void>
}

export interface LinkedInMessageEditorAdapterRef {
  insertVariable: (variableId: string) => void
}

export const LinkedInMessageEditorAdapter = forwardRef<
  LinkedInMessageEditorAdapterRef,
  LinkedInMessageEditorAdapterProps
>((props, ref) => {
  const {
    value,
    onChange,
    placeholder,
    className,
    disabled,
    variables,
    onLinkedInVariableClick,
    onCsvVariableClick,
    onApiVariableClick,
    csvVariablesWithMissingData,
    getCsvColumnFix,
    addCsvColumnFix,
    onFocus,
    csvConfigForViewMode,
    csvData,
    showDebugBar = false,
    campaignId,
    onVariableCreated,
  } = props

  // Convert string value to EditorMessage
  const [message, setMessage] = useState<EditorMessage>(() => {
    return value ? stringToMessage(value) : createEmptyMessage()
  })

  const editorRef = useRef<{ insertVariable: (variableId: string) => void } | null>(null)

  // Update message when value prop changes externally
  useEffect(() => {
    if (value !== undefined) {
      const newMessage = value ? stringToMessage(value) : createEmptyMessage()
      // Only update if the enrichment text is different to avoid loops
      const currentString = messageToString(message)
      if (currentString !== value) {
        setMessage(newMessage)
      }
    }
  }, [value])

  // Handle message changes from editor
  const handleMessageChange = (newMessage: EditorMessage) => {
    setMessage(newMessage)
    // Convert back to string format for onChange
    const stringValue = messageToString(newMessage)
    onChange(stringValue)
  }

  // Expose insertVariable method via ref
  useImperativeHandle(ref, () => ({
    insertVariable: (variableId: string) => {
      if (editorRef.current) {
        editorRef.current.insertVariable(variableId)
      }
    },
  }))


  return (
    <LinkedInMessageEditor
      ref={editorRef}
      message={message}
      setMessage={handleMessageChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      showDebugBar={showDebugBar}
      onLinkedInVariableClick={onLinkedInVariableClick}
      onCsvVariableClick={onCsvVariableClick}
      onApiVariableClick={onApiVariableClick}
      getCsvColumnFix={getCsvColumnFix}
      addCsvColumnFix={addCsvColumnFix}
      csvVariablesWithMissingData={csvVariablesWithMissingData}
      csvConfigForViewMode={csvConfigForViewMode}
      csvData={csvData}
      variables={variables}
      onFocus={onFocus}
      campaignId={campaignId}
      onVariableCreated={onVariableCreated}
    />
    
  )
})

LinkedInMessageEditorAdapter.displayName = "LinkedInMessageEditorAdapter"

// Re-export for convenience
export { LinkedInMessageEditor } from "./LinkedInMessageEditor"
export type { EditorMessage, JSONContent, VariableAttrs, VariableFallback, VariableOption } from "./types"
