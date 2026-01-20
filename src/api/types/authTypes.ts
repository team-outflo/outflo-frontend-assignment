import { GenericApiResponse } from "../../common/api";

export type PostAccessTokenRequest = {
  username: string;
  password: string;
  domain: string;
};

export type PostAccessTokenResponse = GenericApiResponse<string> & {
  destinationUrl: string | null;
  popup: 'trialEndedNotice' | 'trialActiveReminder' | null;
};

export type PostSignupRequest = {
  domain: string;
  username: string;
  password: string;
};

export type PostSignupResponse = GenericApiResponse<string>;
