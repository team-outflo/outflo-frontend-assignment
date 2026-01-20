import { useMutation } from "../common/api";
import { useAuthStore } from "../api/store/authStore";
import { postUserAccessTokens, postSignup } from "../api/authentication/authentication";
import { PostAccessTokenRequest, PostAccessTokenResponse } from "../api/types/authTypes";

export const useUserAccessTokens = () => {
  const { setState } = useAuthStore();

  return useMutation<PostAccessTokenResponse, PostAccessTokenRequest>({
    mutationKey: ["userAccessTokens"],
    mutationFn: async ({ domain, username, password }) => await postUserAccessTokens(domain, username, password),
    options: {
      onSuccess: async (res) => {
        setState({ isAuthenticated: true, accessToken: res.data, user: res.user });
      },
    },
  });
};

export const useSignup = () => {
  const { setState } = useAuthStore();

  return useMutation({
    mutationKey: ["signup"],
    mutationFn: async ({  email, password }: { email: string; password: string }) => {
      
      // Perform the signup
      return await postSignup(email, password);
    },
    options: {
      onSuccess: async (res, { email, password }) => {
        // Automatically log in the user after signup
        const domain = `${email}_domain`;
        const loginResponse = await postUserAccessTokens(domain, email, password);
        setState({ isAuthenticated: true, accessToken: loginResponse.data });
      },
    },
  });
};
