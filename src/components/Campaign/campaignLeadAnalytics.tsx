import { LeadConnectionStatus, LeadEngagementStatus } from "@/constants/leadEnums";

export function fiterleadsbasedoncampaignAnlytic<TLead extends {
  connectionStatus?: string | null;
  engagementStatus?: string | null;
}>(
  status: "all" | "CONNECTION_SENT" | "CONNECTION_ACCEPTED" | "MESSAGES_SENT" | "RESPONSES",
  leads: TLead[]
): TLead[] {
  if (!Array.isArray(leads)) return [] as TLead[];

  const normalize = (v?: string | null) => (v ? String(v).toUpperCase() : "");
  const s = String(status || "all").toUpperCase();

  switch (s) {
    // all -> return everything unchanged
    case "ALL":
      return leads;

    // CONNECTION_SENT -> connectionStatus === CONNECTION_ACCEPTED OR REQUEST_SENT
    case "CONNECTION_SENT":
      return leads.filter((lead) => {
        const c = normalize(lead.connectionStatus);
        return c === LeadConnectionStatus.CONNECTION_ACCEPTED || c === LeadConnectionStatus.CONNECTION_SENT;
      });

    // CONNECTION_ACCEPTED -> connectionStatus === CONNECTION_ACCEPTED
    case "CONNECTION_ACCEPTED":
      return leads.filter((lead) => normalize(lead.connectionStatus) === "CONNECTION_ACCEPTED");

    // MESSAGES_SENT -> engagementStatus IN { IN_SEQUENCE, SUCCESSFULLY_ENGAGED, COMPLETED }
    case "MESSAGES_SENT":
      return leads.filter((lead) => {
        const e = normalize(lead.engagementStatus);
        return e === LeadEngagementStatus.IN_SEQUENCE || e === LeadEngagementStatus.SUCCESSFULLY_ENGAGED || e === LeadEngagementStatus.COMPLETED;
      });

    // RESPONSES -> engagementStatus IN { SUCCESSFULLY_ENGAGED, ALREADY_ENGAGED }
    case "RESPONSES":
      return leads.filter((lead) => {
        const e = normalize(lead.engagementStatus);
        return e === LeadEngagementStatus.SUCCESSFULLY_ENGAGED || e === LeadEngagementStatus.ALREADY_ENGAGED;
      });

    default:
      return leads;
  }
}

export default fiterleadsbasedoncampaignAnlytic;


