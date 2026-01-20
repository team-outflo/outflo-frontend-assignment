import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';

interface UseNavigationBlockerOptions {
  onBlocked?: (targetPath: string) => void;
  enabled?: boolean;
}

/**
 * Hook to block navigation when there are unsaved changes
 * Works with BrowserRouter by intercepting navigation attempts
 * Uses browser beforeunload event for tab/window close
 */
export const useNavigationBlocker = (options: UseNavigationBlockerOptions = {}) => {
  const { onBlocked, enabled = true } = options;
  const { isEdited, mode } = useCampaignStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const previousLocationRef = useRef(location.pathname);
  const isNavigatingRef = useRef(false);

  // Only block in edit mode when isEdited is true
  const shouldBlockNavigation = enabled && mode === 'edit' && isEdited;

  // Intercept Link clicks by adding event listeners to all Links
  useEffect(() => {
    if (!shouldBlockNavigation) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's an internal route (starts with /)
      if (href.startsWith('/')) {
        const currentPath = window.location.pathname;
        
        // Check if we're leaving the campaign editor
        const isLeavingCampaign = currentPath.includes('/campaign/') && !href.includes('/campaign/');

        if (isLeavingCampaign) {
          e.preventDefault();
          e.stopPropagation();
          setPendingPath(href);
          setIsBlocked(true);
          onBlocked?.(href);
        }
      }
    };

    // Use capture phase to catch events early
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [shouldBlockNavigation, onBlocked]);

  // Also detect route changes via React Router (fallback)
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;

    // Check if we're leaving the campaign editor
    const isLeavingCampaign = previousPath.includes('/campaign/') && !currentPath.includes('/campaign/');

    // If leaving campaign editor and there are unsaved changes, block it
    if (shouldBlockNavigation && isLeavingCampaign && previousPath !== currentPath && !isNavigatingRef.current) {
      // Prevent navigation by going back
      window.history.pushState(null, '', previousPath);
      setPendingPath(currentPath);
      setIsBlocked(true);
      onBlocked?.(currentPath);
    }

    previousLocationRef.current = currentPath;
  }, [location.pathname, shouldBlockNavigation, onBlocked]);

  // Handle browser beforeunload event (tab/window close)
  useEffect(() => {
    if (!shouldBlockNavigation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      return ''; // Required for Safari
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldBlockNavigation]);

  // Intercept browser back/forward buttons
  useEffect(() => {
    if (!shouldBlockNavigation) return;

    const handlePopState = (e: PopStateEvent) => {
      const currentPath = window.location.pathname;
      const previousPath = previousLocationRef.current;

      // Check if we're leaving the campaign editor
      const isLeavingCampaign = previousPath.includes('/campaign/') && !currentPath.includes('/campaign/');

      if (isLeavingCampaign && !isNavigatingRef.current) {
        // Prevent navigation by pushing state back
        window.history.pushState(null, '', previousPath);
        setPendingPath(currentPath);
        setIsBlocked(true);
        onBlocked?.(currentPath);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldBlockNavigation, onBlocked]);

  const proceed = () => {
    setIsBlocked(false);
    isNavigatingRef.current = true;
    
    // Execute any pending navigation callback first (e.g., for back button)
    pendingNavigationRef.current?.();
    pendingNavigationRef.current = null;
    
    // Navigate to pending path if set
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }

    // Reset flag after a short delay to allow navigation to complete
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };

  const reset = () => {
    setIsBlocked(false);
    setPendingPath(null);
    pendingNavigationRef.current = null;
  };

  return {
    shouldBlock: isBlocked,
    blockerState: isBlocked ? 'blocked' : 'unblocked',
    proceed,
    reset,
    setPendingNavigation: (fn: () => void) => {
      pendingNavigationRef.current = fn;
    },
  };
};

