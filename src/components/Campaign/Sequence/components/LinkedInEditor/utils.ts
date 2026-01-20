import type { JSONContent, EditorMessage } from "./types"
import { isApiVariable } from "@/utils/variableUtils"

/**
 * Convert JSON content to enrichment text format ({variableId} for storage)
 */
export function serializeToEnrichmentText(json: JSONContent): string {
  if (!json.content) return ""

  const processNode = (node: JSONContent): string => {
    if (node.type === "variableMention") {
      const id = node.attrs?.id as string | undefined
      return `{${id ?? ""}}`
    }

    if (node.type === "text") {
      return node.text ?? ""
    }

    // Handle hardBreak (Shift+Enter) - convert to newline
    if (node.type === "hardBreak") {
      return "\n"
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(processNode).join("")
    }

    if (node.type === "paragraph") {
      const content = node.content ? node.content.map(processNode).join("") : ""
      return content
    }

    return ""
  }

  // IMPORTANT: Don't filter out empty strings - preserve blank lines for newlines
  // Empty paragraphs (from Enter key) should be preserved as empty strings
  return json.content.map(processNode).join("\n")
}

/**
 * Convert JSON content to plain text (variables shown as {{variableId}})
 */
export function serializeToPlainText(json: JSONContent): string {
  return serializeToEnrichmentText(json)
}

/**
 * Convert string with {variableId} format to JSON format
 * Storage format uses single curly brackets {variableId}
 */
export function parseFromString(text: string): JSONContent {
  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    }
  }

  // Parse text directly - storage format uses {variableId}
  // IMPORTANT: Don't filter out empty lines - preserve them for newlines
  const paragraphs = text.split("\n")

  if (paragraphs.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    }
  }

  const content = paragraphs.map((para) => {
    // Handle empty paragraphs (blank lines from Enter key)
    if (para === "") {
      return {
        type: "paragraph",
        content: [],
      }
    }

    const parts: JSONContent[] = []
    let currentIndex = 0

    // Match {variableId} patterns (single curly brackets for storage)
    const variableRegex = /\{([^}]+)\}/g
    let match: RegExpExecArray | null

    while ((match = variableRegex.exec(para)) !== null) {
      // Add text before the variable
      if (match.index > currentIndex) {
        const textBefore = para.substring(currentIndex, match.index)
        if (textBefore) {
          parts.push({
            type: "text",
            text: textBefore,
          })
        }
      }

      // Add the variable
      const variableId = match[1]
      // Try to find label from variable ID
      const label = getVariableLabel(variableId)
      parts.push({
        type: "variableMention",
        attrs: {
          id: variableId,
          label: label,
          source: getVariableSource(variableId),
          fallback: { strategy: "default", value: "" },
        },
      })

      currentIndex = match.index + match[0].length
    }

    // Add remaining text
    if (currentIndex < para.length) {
      const textAfter = para.substring(currentIndex)
      if (textAfter) {
        parts.push({
          type: "text",
          text: textAfter,
        })
      }
    }

    // If no parts (but not empty paragraph), add empty text node
    if (parts.length === 0) {
      return {
        type: "paragraph",
        content: [],
      }
    }

    return {
      type: "paragraph",
      content: parts,
    }
  })

  return {
    type: "doc",
    content,
  }
}

/**
 * Convert {variableId} format to {{variableId}} format (for display in editor)
 * Note: Storage format uses single curly brackets, but editor displays with double
 */
export function convertToEnrichmentFormat(text: string): string {
  // Convert single braces to double braces for editor display
  // Storage format is {variableId}, but editor shows {{variableId}}
  return text.replace(/\{([^}]+)\}/g, (match, variableId) => {
    return `{{${variableId}}}`
  })
}

/**
 * Convert {{variableId}} format back to {variableId} format (for storage)
 * Note: Editor uses {{variableId}} for display, but storage uses {variableId}
 */
export function convertFromEnrichmentFormat(text: string): string {
  // Convert double braces back to single braces for storage
  return text.replace(/\{\{([^}]+)\}\}/g, (match, variableId) => {
    return `{${variableId}}`
  })
}

/**
 * Get variable label from variable ID
 */
export function getVariableLabel(variableId: string): string {
  // Try to extract a readable label from the ID
  if (variableId.includes(".")) {
    const parts = variableId.split(".")
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]
      // Handle camelCase (e.g., firstName -> First Name)
      return lastPart
        .replace(/([A-Z])/g, " $1")
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .filter(Boolean)
        .join(" ")
    }
  }

  // Handle underscore-separated IDs (e.g., sender_firstName -> First Name)
  const withoutPrefix = variableId.replace(/^(linkedin_|csv_|api_|sender_|campaign_)/, "")
  
  // Handle camelCase within underscore-separated IDs
  return withoutPrefix
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .split(/[_\s]+/) // Split on underscores or spaces
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .filter(Boolean)
    .join(" ")
}

/**
 * Get variable source from variable ID
 */
export function getVariableSource(variableId: string): "linkedin" | "campaign" | "sender" | "csv" | "api" {
  // Handle both dot notation and underscore notation
  if (variableId.startsWith("linkedin.") || variableId.startsWith("linkedin_")) {
    return "linkedin"
  }
  if (variableId.startsWith("csv_")) {
    return "csv"
  }
  if (isApiVariable(variableId)) {
    return "api"
  }
  if (variableId.startsWith("sender.") || variableId.startsWith("sender_")) {
    return "sender"
  }
  if (variableId.startsWith("campaign.") || variableId.startsWith("campaign_")) {
    return "campaign"
  }
  // Default fallback - try to infer from type if available
  return "linkedin" // default
}

/**
 * Convert EditorMessage to plain string format (for storage)
 * Storage format uses single curly brackets {variableId}
 */
export function messageToString(message: EditorMessage): string {
  // enrichmentText already uses single curly brackets {variableId} for storage
  return message.enrichmentText
}

/**
 * Convert string to EditorMessage
 */
export function stringToMessage(text: string): EditorMessage {
  const json = parseFromString(text)
  const enrichmentText = serializeToEnrichmentText(json)
  const plainText = json.content
    ?.map((node) => {
      if (node.type === "paragraph") {
        return node.content
          ?.map((child) => {
            if (child.type === "text") return child.text ?? ""
            if (child.type === "variableMention") return child.attrs?.label as string ?? ""
            if (child.type === "hardBreak") return "\n" // Handle Shift+Enter
            return ""
          })
          .join("") ?? ""
      }
      return ""
    })
    .join("\n") ?? ""

  const characterCount = plainText.length

  return {
    json,
    enrichmentText,
    plainText,
    characterCount,
  }
}
