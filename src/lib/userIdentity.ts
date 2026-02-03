import { getUserId } from "@/lib/api";

export const getOrCreateUserId = () => {
  return getUserId() ?? "anonymous";
};
