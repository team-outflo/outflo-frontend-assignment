export type FallbackStrategy = "default" | "empty" | "static" | "computed"

export interface VariableFallback {
  strategy: FallbackStrategy
  value: string | number | null
  dependsOn?: string[]
}

export interface VariableAttrs {
  id: string
  label: string
  source: "linkedin" | "campaign" | "sender" | "csv" | "api"
  fallback: VariableFallback
}

export interface VariableOption {
  id: string
  label: string
  source: "linkedin" | "campaign" | "sender" | "csv" | "api"
  fallback: VariableFallback
}

export interface EditorMessage {
  json: JSONContent
  enrichmentText: string
  plainText: string
  characterCount: number
}

export type JSONContent = {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}

/**
 * Fallback variable options (for when API variables are not available)
 * Note: The actual variables come from the API and use camelCase format (e.g., sender_firstName)
 * This is kept for backward compatibility and fallback scenarios
 */
export const VARIABLE_OPTIONS: VariableOption[] = [
  // LinkedIn variables (support both formats)
  {
    id: "linkedin_first_name",
    label: "First Name",
    source: "linkedin",
    fallback: { strategy: "default", value: "" },
  },
  {
    id: "linkedin_last_name",
    label: "Last Name",
    source: "linkedin",
    fallback: { strategy: "default", value: "" },
  },
  {
    id: "linkedin_headline",
    label: "Headline",
    source: "linkedin",
    fallback: { strategy: "empty", value: "" },
  },
  {
    id: "linkedin_company",
    label: "Company",
    source: "linkedin",
    fallback: { strategy: "default", value: "" },
  },
  {
    id: "linkedin_location",
    label: "Location",
    source: "linkedin",
    fallback: { strategy: "empty", value: "" },
  },
  // Campaign variables
  {
    id: "campaign_name",
    label: "Campaign Name",
    source: "campaign",
    fallback: { strategy: "static", value: "" },
  },
  {
    id: "campaign_subject",
    label: "Campaign Subject",
    source: "campaign",
    fallback: { strategy: "static", value: "" },
  },
  // Sender variables (matching API format with camelCase)
  {
    id: "sender_firstName",
    label: "Sender First Name",
    source: "sender",
    fallback: { strategy: "static", value: "" },
  },
  {
    id: "sender_lastName",
    label: "Sender Last Name",
    source: "sender",
    fallback: { strategy: "static", value: "" },
  },
  {
    id: "sender_headline",
    label: "Sender Headline",
    source: "sender",
    fallback: { strategy: "static", value: "" },
  },
  {
    id: "sender_location",
    label: "Sender Location",
    source: "sender",
    fallback: { strategy: "static", value: "" },
  },
]

export const createEmptyMessage = (): EditorMessage => ({
  json: {
    type: "doc",
    content: [{ type: "paragraph" }],
  },
  enrichmentText: "",
  plainText: "",
  characterCount: 0,
})
