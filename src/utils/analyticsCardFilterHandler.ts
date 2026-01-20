// Shared ref to store the analytics card filter handler
// This allows CampaignEditorPage to trigger filters in CampaignAnalytics

type CardFilterType = 'connectionRequests' | 'requestsAccepted' | 'messagesSent' | 'responses';
type FilterHandler = (filterType: CardFilterType) => void;

let filterHandlerRef: FilterHandler | null = null;
let pendingFilter: CardFilterType | null = null;

export const setAnalyticsCardFilterHandler = (handler: FilterHandler | null) => {
  filterHandlerRef = handler;
  
  // If there's a pending filter and handler is now available, apply it
  if (handler && pendingFilter) {
    handler(pendingFilter);
    pendingFilter = null;
  }
};

export const getAnalyticsCardFilterHandler = (): FilterHandler | null => {
  return filterHandlerRef;
};

export const setPendingFilter = (filterType: CardFilterType | null) => {
  pendingFilter = filterType;
  
  // If handler is already available, apply immediately
  if (filterHandlerRef && filterType) {
    filterHandlerRef(filterType);
    pendingFilter = null;
  }
};

export const getPendingFilter = (): CardFilterType | null => {
  return pendingFilter;
};

export type { CardFilterType };

