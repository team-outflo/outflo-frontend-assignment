export interface EventType {
  value: string;
  label: string;
  type: "campaign" | "account";
}

// Allowed webhook event types (limited to these actions only)
export const WEBHOOK_EVENT_TYPES: EventType[] = [
  {
    value: "FIRST_REPLY_FROM_A_LEAD_IN_OUTFLO_CAMPAIGN",
    label: "First Reply from a Lead in OutFlo Campaign",
    type: "campaign"
  },
  {
    value: "EVERY_MESSAGE_OR_INMAIL_RECEIVED",
    label: "Every Message or InMail Received",
    type: "account"
  }
];

export const getEventTypeLabel = (value: string): string => {
  const eventType = WEBHOOK_EVENT_TYPES.find((type) => type.value === value);
  return eventType?.label || value;
};

