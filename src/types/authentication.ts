// Updated User type to match actual localStorage data structure
export type User = {
  id: string;
  orgId: string;
  username: string;
  passwordHash: string;
  fullName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  roleIds: string[];
  designation?: string;
  phoneNumber?: string;
  company?: string;
};
