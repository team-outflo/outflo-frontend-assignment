// Chrome Extension Message Types
export interface ExtensionMessage {
  action: string;
  data?: any;
  timestamp?: number;
}

export interface ExtensionResponse {
  success: boolean;
  result?: any;
  error?: string;
  action?: string; // For ping/pong responses
}

// Window postMessage types for extension availability check
export interface ExtensionPingMessage {
  type: 'OUTFLO_EXTENSION_PING';
  timestamp: number;
}

export interface ExtensionPongMessage {
  type: 'OUTFLO_EXTENSION_PONG';
  extensionId: string;
  timestamp: number;
  success: true;
}

// Specific message types for OutFlo extension
export interface GetLinkedInProfileMessage extends ExtensionMessage {
  action: 'getLinkedInProfile';
}

export interface LinkedInProfileData {
  memberId: string;
  firstName: string;
  lastName: string;
  headline?: string;
  profileImage?: string;
  urn: string;
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  headers?: Record<string, string>;
  // Legacy fields for backward compatibility
  profileUrl?: string;
  name?: string;
  location?: string;
  connections?: number;
}

export interface GetLinkedInProfileResponse extends ExtensionResponse {
  result?: LinkedInProfileData;
}

// OutFlo Authentication Message Types
export interface GetOutFloAuthTokenMessage extends ExtensionMessage {
  action: 'getAccessToken';
}

export interface GetOutFloAuthTokenResponse extends ExtensionResponse {
  result?: string;
}

export interface GetTenantIdentityMessage extends ExtensionMessage {
  action: 'getTenantIdentity';
}

export interface TenantIdentityData {
  token: string;
  email: string;
}

export interface GetTenantIdentityResponse extends ExtensionResponse {
  result?: TenantIdentityData;
}

export interface IsTenantAuthenticatedMessage extends ExtensionMessage {
  action: 'isTenantAuthenticated';
}

export interface IsTenantAuthenticatedResponse extends ExtensionResponse {
  result?: boolean;
}

export interface LoginToOutFloMessage extends ExtensionMessage {
  action: 'loginToOutFlo';
  data: {
    domain: string;
    username: string;
    password: string;
  };
}

export interface LoginToOutFloResponse extends ExtensionResponse {
  result?: {
    token: string;
    [key: string]: any;
  };
}

export interface SetupOutFloWorkspaceMessage extends ExtensionMessage {
  action: 'setupOutFloWorkspace';
  data: {
    domain: string;
    name: string;
    username: string;
    password: string;
  };
}

export interface SetupOutFloWorkspaceResponse extends ExtensionResponse {
  result?: any;
}

export interface GetOutFloOrgIdMessage extends ExtensionMessage {
  action: 'getOrgId';
}

export interface GetOutFloOrgIdResponse extends ExtensionResponse {
  result?: string;
}

export interface GetOutFloUserIdMessage extends ExtensionMessage {
  action: 'getUserId';
}

export interface GetOutFloUserIdResponse extends ExtensionResponse {
  result?: string;
}

export interface GetOutFloAuthDataMessage extends ExtensionMessage {
  action: 'getAuthStorage';
}

export interface GetOutFloAuthDataResponse extends ExtensionResponse {
  result?: any;
}

export interface IsAuthenticatedOnOutFloPageMessage extends ExtensionMessage {
  action: 'isAuthenticated';
}

export interface IsAuthenticatedOnOutFloPageResponse extends ExtensionResponse {
  result?: boolean;
}

export interface LogoutFromOutFloMessage extends ExtensionMessage {
  action: 'logoutFromOutFlo';
}

export interface LogoutFromOutFloResponse extends ExtensionResponse {
  result?: boolean;
}

// LinkedIn URN and Cookies Message Types
export interface SendLinkedInDataMessage extends ExtensionMessage {
  action: 'sendLinkedInData';
  data: {
    urn: string;
    cookies: Array<{
      name: string;
      value: string;
      domain?: string;
      path?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
    }>;
  };
}

export interface SendLinkedInDataResponse extends ExtensionResponse {
  result?: {
    success: boolean;
    message: string;
    urn: string;
    cookiesCount: number;
  };
}

// Message handler function type
export type ExtensionMessageHandler = (message: ExtensionMessage) => Promise<ExtensionResponse> | ExtensionResponse;

// Extension configuration
export interface ExtensionConfig {
  extensionId: string;
  timeout?: number;
  retryAttempts?: number;
}
