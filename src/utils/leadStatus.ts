export type StatusDisplay = {
    label: string;
    className: string; // Tailwind CSS classes for background/text/border
};

// Known lead connection statuses for Outflo
export const KNOWN_CONNECTION_STATUSES = [
    'NOT_STARTED',
    'INITIATED',
    'CONNECTION_EXISTS',
    'CONNECTION_SENT',
    'CONNECTION_RECEIVED',
    'CONNECTION_ACCEPTED',
    'INVITATION_EXISTS',
    'SKIPPED',
] as const;

type KnownConnectionStatus = typeof KNOWN_CONNECTION_STATUSES[number];

// Title-case helper for unknown statuses (e.g., "SOME_STATUS" -> "Some Status")
function toTitleCase(input: string): string {
    if (!input) return '';
    return input
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// SaaS-friendly display mapping for connection statuses
const STATUS_TO_DISPLAY: Record<KnownConnectionStatus, StatusDisplay> = {
    NOT_STARTED: {
        label: 'Not Started',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    INITIATED: {
        label: 'Queued',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    CONNECTION_EXISTS: {
        label: 'Already Connected',
        className: 'bg-teal-100 text-teal-700 border-teal-200',
    },
    CONNECTION_SENT: {
        label: 'Connection Requested',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    CONNECTION_RECEIVED: {
        label: 'Request Received',
        className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    },
    CONNECTION_ACCEPTED: {
        label: 'Connected',
        className: 'bg-green-100 text-green-700 border-green-200',
    },
    INVITATION_EXISTS: {
        label: 'Invitation Already Sent',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    SKIPPED: {
        label: 'Skipped',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
    },
};

/**
 * Return a SaaS-friendly label and Tailwind color classes for a connection status.
 * Falls back to a title-cased label and neutral classes for unknown statuses.
 */
export function getConnectionStatusDisplay(status: string): StatusDisplay {
    const normalized = (status || '').toUpperCase() as KnownConnectionStatus;
    if (normalized in STATUS_TO_DISPLAY) {
        return STATUS_TO_DISPLAY[normalized as KnownConnectionStatus];
    }
    return {
        label: toTitleCase(status || 'Unknown'),
        className: 'bg-gray-100 text-gray-700 border-gray-200',
    };
}

export default getConnectionStatusDisplay;





// Count connection statuses across a list of leads
export function countConnectionStatuses(
    leads: Array<{ connectionStatus?: string | null }>
): Record<string, number> {
    const counts: Record<string, number> = { all: leads.length } as Record<string, number>;

    // Initialize all known statuses with 0
    (KNOWN_CONNECTION_STATUSES as readonly string[]).forEach((key) => {
        counts[key] = 0;
    });

    leads.forEach((lead) => {
        const raw = (lead.connectionStatus || '').toString().toUpperCase();
        if ((KNOWN_CONNECTION_STATUSES as readonly string[]).includes(raw)) {
            counts[raw] += 1;
        }
    });

    return counts;
}


// Engagement status display mapping (SaaS-friendly)
export function getEngagementStatusDisplay(status: string): StatusDisplay {
    switch ((status || '').toUpperCase()) {
        case 'NOT_STARTED':
            return { label: 'Not Started', className: 'bg-gray-100 text-gray-700 border-gray-200' };
        case 'IN_SEQUENCE':
            return { label: 'In Sequence', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        case 'ALREADY_ENGAGED':
            return { label: 'Already Engaged', className: 'bg-orange-100 text-orange-700 border-orange-200' };
        case 'SUCCESSFULLY_ENGAGED':
            return { label: 'Successfully Engaged', className: 'bg-green-100 text-green-700 border-green-200' };
        case 'COMPLETED':
            return { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        case 'FAILED':
            return { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' };
        default:
            return {
                label: toTitleCase(status || 'Unknown'),
                className: 'bg-gray-100 text-gray-700 border-gray-200',
            };
    }
}

