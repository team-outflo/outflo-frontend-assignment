import { checkUnauthorized, get } from "@/common/api";
import { useQuery } from "@tanstack/react-query";

export default function useSequenceConfig() {
  return useQuery({
    queryKey: ["sequence-config"],
    queryFn: async () => {
      const data = await get("/campaigns/sequences/config").then(response => checkUnauthorized(response, false));
      return data?.data?.config ?? {};
    },
    staleTime: Infinity,
  });
}
