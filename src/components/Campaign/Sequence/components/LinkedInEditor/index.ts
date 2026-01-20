// Main components
export { LinkedInMessageEditor, type LinkedInMessageEditorRef } from "./LinkedInMessageEditor"
export { LinkedInMessageEditorAdapter, type LinkedInMessageEditorAdapterRef } from "./LinkedInMessageEditorAdapter"

// Supporting components
export { default as EditorToolbar } from "./EditorToolbar"
export { default as VariableDropdown } from "./VariableDropdown"
export { default as VariableDialog } from "./VariableDialog"
export { default as VariableNodeView } from "./VariableNodeView"
export { default as DebugMessageBar } from "./DebugMessageBar"

// Extensions
export { VariableMention } from "./VariableMention"

// Types
export type {
  VariableAttrs,
  VariableFallback,
  VariableOption,
  EditorMessage,
  JSONContent,
  FallbackStrategy,
} from "./types"

export { VARIABLE_OPTIONS, createEmptyMessage } from "./types"

// Utilities
export {
  serializeToEnrichmentText,
  serializeToPlainText,
  parseFromString,
  convertToEnrichmentFormat,
  convertFromEnrichmentFormat,
  messageToString,
  stringToMessage,
  getVariableLabel,
  getVariableSource,
} from "./utils"
