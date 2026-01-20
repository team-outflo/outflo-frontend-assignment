/**
 * VariableMention Extension - TipTap Architecture Guide
 * 
 * This extension demonstrates the correct TipTap pattern for handling dynamic data
 * that needs to update reactively without recreating the editor.
 * 
 * ## Why Extension Options Don't Update
 * 
 * TipTap extension options are evaluated ONCE when the editor is created via `useEditor()`.
 * When React props change, the extension's `options` object remains frozen at initialization.
 * This is by design - options are meant for static configuration, not reactive data.
 * 
 * ## Solution: Using Storage for Reactive Data
 * 
 * TipTap provides `addStorage()` for data that needs to change after initialization.
 * Storage is mutable and can be updated from React components via `useEffect`.
 * 
 * ## When to Use Options vs Storage vs Node Attributes
 * 
 * ### Options (Static Configuration)
 * - Use for: Callbacks, configuration functions, static settings
 * - Set: Once at extension initialization
 * - Access: `this.options` or `extension.options`
 * - Example: `onLinkedInVariableClick`, `getCsvColumnFix`
 * 
 * ### Storage (Reactive Data)
 * - Use for: Editor-specific state that changes after initialization
 * - Set: Initially from options, then updated via `editor.storage.extensionName.field = value`
 * - Access: `this.storage` in extension, `editor.storage.extensionName` in React
 * - Example: `disabled` state (editor-specific)
 * - Note: For shared data like variables, use a global store (e.g., campaignStore) instead
 * 
 * ### Node Attributes (Per-Node Data)
 * - Use for: Data specific to each node instance in the document
 * - Set: When creating/updating nodes via commands
 * - Access: `node.attrs` in extension, `node.attrs` in NodeView
 * - Example: `id`, `label`, `source`, `fallback` for each variable node
 * 
 * ## Implementation Pattern
 * 
 * 1. Define storage interface: `VariableMentionStorage`
 * 2. Add storage via `addStorage()`: Returns initial values
 * 3. Initialize in `onCreate()`: Copy from options to storage
 * 4. Sync from React: Update `editor.storage.variableMention` in `useEffect` (for editor-specific state)
 * 5. Access in extension/NodeView: Read from `this.storage` or `editor.storage.variableMention`
 * 
 * For shared data (like variables), use a global store (campaignStore) instead of extension storage.
 * 
 * This pattern preserves cursor position, avoids editor re-creation, and follows
 * TipTap best practices for scalable editors with dynamic data.
 */

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import type { VariableFallback } from "./types"
import VariableNodeView from "./VariableNodeView"

import type { Lead } from "@/types/campaigns"

export interface VariableMentionOptions {
  HTMLAttributes: Record<string, unknown>
  onLinkedInVariableClick?: (variableId: string, variableName: string, position: { x: number; y: number }) => void
  onCsvVariableClick?: (variableId: string, variableName: string) => void
  onApiVariableClick?: (variableId: string, variableName: string) => void
  getCsvColumnFix?: (columnName: string) => any
  csvVariablesWithMissingData?: string[]
  csvConfigForViewMode?: any
  csvData?: Lead[]
  // Note: variables and disabled are now stored in editor.storage.variableMention
  // They are kept here for backward compatibility during initialization only
  variables?: Array<{
    id: string
    placeholder: string
    description?: string
    inputBoxHoverInfo?: string
    name?: string
    missingRows?: number | number[]
    totalRows?: number
    allLeadsPresentInfo?: string
  }>
  disabled?: boolean
}

export interface VariableMentionStorage {
  // Variables are now stored in campaignStore as single source of truth
  // Only editor-specific state (like disabled) is kept in storage
  disabled: boolean
}

declare module "@tiptap/core" {
  interface Storage {
    variableMention: VariableMentionStorage
  }

  interface Commands<ReturnType> {
    variableMention: {
      insertVariable: (attrs: {
        id: string
        label: string
        source: string
        fallback: VariableFallback
      }) => ReturnType
    }
  }
}

export const VariableMention = Node.create<VariableMentionOptions>({
  name: "variableMention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      // Static callbacks and configuration (set once at initialization)
      onLinkedInVariableClick: undefined,
      onCsvVariableClick: undefined,
      onApiVariableClick: undefined,
      getCsvColumnFix: undefined,
      csvVariablesWithMissingData: [],
      csvConfigForViewMode: undefined,
      // DEPRECATED: These are only used for initial setup
      // Use editor.storage.variableMention.variables and .disabled for reactive updates
      // They are kept here for backward compatibility during extension initialization
      variables: [],
      disabled: false,
    }
  },

  addStorage() {
    return {
      disabled: false,
    }
  },

  onCreate() {
    // Initialize storage from options on extension creation
    // Variables are now stored in campaignStore, not in extension storage
    this.storage.disabled = this.options.disabled ?? false
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      source: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-source"),
        renderHTML: (attributes) => ({
          "data-source": attributes.source,
        }),
      },
      fallback: {
        default: { strategy: "default", value: "" },
        parseHTML: (element) => {
          const fallbackStr = element.getAttribute("data-fallback")
          if (fallbackStr) {
            try {
              return JSON.parse(fallbackStr) as VariableFallback
            } catch {
              return { strategy: "default", value: "" }
            }
          }
          return { strategy: "default", value: "" }
        },
        renderHTML: (attributes) => ({
          "data-fallback": JSON.stringify(attributes.fallback),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView, {
      contentDOMElementTag: "span",
    })
  },

  addCommands() {
    return {
      insertVariable:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})
