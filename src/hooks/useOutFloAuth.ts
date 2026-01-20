import { useState, useCallback } from 'react';
import { useExtension } from './useExtension';
import type { 
  TenantIdentityData,
  LoginToOutFloMessage,
  SetupOutFloWorkspaceMessage
} from '../types/extension';

interface UseOutFloAuthOptions {
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

interface UseOutFloAuthReturn {
  // Extension availability
  isAvailable: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;

  // Authentication state
  isAuthenticated: boolean;
  authToken: string | null;
  tenantIdentity: TenantIdentityData | null;
  orgId: string | null;
  userId: string | null;
  authData: any;

  // Authentication methods
  getAuthToken: () => Promise<string | null>;
  getTenantIdentity: () => Promise<TenantIdentityData | null>;
  checkAuthentication: () => Promise<boolean>;
  login: (domain: string, username: string, password: string) => Promise<any>;
  setupWorkspace: (domain: string, name: string, username: string, password: string) => Promise<any>;
  getOrgId: () => Promise<string | null>;
  getUserId: () => Promise<string | null>;
  getAuthStorage: () => Promise<any>;
  logout: () => Promise<boolean>;
  refreshAuthData: () => Promise<void>;
}

/**
 * React hook for OutFlo authentication via Chrome extension
 */
export const useOutFloAuth = (options: UseOutFloAuthOptions = {}): UseOutFloAuthReturn => {
  const { onError, onSuccess } = options;
  const extension = useExtension();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tenantIdentity, setTenantIdentity] = useState<TenantIdentityData | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authData, setAuthData] = useState<any>(null);

  // Get authentication token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'getAccessToken',
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setAuthToken(response.result);
        return response.result;
      }
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get auth token');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Get tenant identity
  const getTenantIdentity = useCallback(async (): Promise<TenantIdentityData | null> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'getTenantIdentity',
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setTenantIdentity(response.result);
        return response.result;
      }
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get tenant identity');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Check authentication status
  const checkAuthentication = useCallback(async (): Promise<boolean> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'isTenantAuthenticated',
        timestamp: Date.now()
      });

      const authenticated = response.success && response.result === true;
      setIsAuthenticated(authenticated);
      return authenticated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to check authentication');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Login to OutFlo
  const login = useCallback(async (domain: string, username: string, password: string): Promise<any> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'loginToOutFlo',
        data: { domain, username, password },
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setAuthToken(response.result.token);
        setIsAuthenticated(true);
        onSuccess?.(response.result);
        return response.result;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Login failed');
      onError?.(err);
      throw err;
    }
  }, [extension, onError, onSuccess]);

  // Setup workspace
  const setupWorkspace = useCallback(async (domain: string, name: string, username: string, password: string): Promise<any> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'setupOutFloWorkspace',
        data: { domain, name, username, password },
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setAuthToken(response.result.token);
        setIsAuthenticated(true);
        onSuccess?.(response.result);
        return response.result;
      } else {
        throw new Error(response.error || 'Workspace setup failed');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Workspace setup failed');
      onError?.(err);
      throw err;
    }
  }, [extension, onError, onSuccess]);

  // Get organization ID
  const getOrgId = useCallback(async (): Promise<string | null> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'getOrgId',
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setOrgId(response.result);
        return response.result;
      }
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get organization ID');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Get user ID
  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'getUserId',
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setUserId(response.result);
        return response.result;
      }
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get user ID');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Get auth storage data
  const getAuthStorage = useCallback(async (): Promise<any> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'getAuthStorage',
        timestamp: Date.now()
      });

      if (response.success && response.result) {
        setAuthData(response.result);
        return response.result;
      }
      return null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get auth storage');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Logout
  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const response = await extension.sendMessageWithRetry({
        action: 'logoutFromOutFlo',
        timestamp: Date.now()
      });

      if (response.success) {
        // Clear local state
        setIsAuthenticated(false);
        setAuthToken(null);
        setTenantIdentity(null);
        setOrgId(null);
        setUserId(null);
        setAuthData(null);
        return true;
      }
      return false;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Logout failed');
      onError?.(err);
      throw err;
    }
  }, [extension, onError]);

  // Refresh all auth data
  const refreshAuthData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        checkAuthentication(),
        getAuthToken(),
        getTenantIdentity(),
        getOrgId(),
        getUserId(),
        getAuthStorage()
      ]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to refresh auth data');
      onError?.(err);
      throw err;
    }
  }, [checkAuthentication, getAuthToken, getTenantIdentity, getOrgId, getUserId, getAuthStorage, onError]);

  return {
    // Extension availability
    isAvailable: extension.isAvailable,
    isInitialized: extension.isInitialized,
    isLoading: extension.isLoading,
    error: extension.error,

    // Authentication state
    isAuthenticated,
    authToken,
    tenantIdentity,
    orgId,
    userId,
    authData,

    // Authentication methods
    getAuthToken,
    getTenantIdentity,
    checkAuthentication,
    login,
    setupWorkspace,
    getOrgId,
    getUserId,
    getAuthStorage,
    logout,
    refreshAuthData
  };
};
