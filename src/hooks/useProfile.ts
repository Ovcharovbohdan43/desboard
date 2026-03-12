import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, updateProfile, type ProfileUpdate } from "@/api/profiles";
import { useAuthContext } from "@/contexts/AuthContext";

export const profileQueryKey = (userId: string) => ["profile", userId] as const;

export function useProfile() {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: profileQueryKey(user?.id ?? ""),
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
  });
}

export function useUpdateProfile() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: ProfileUpdate) => updateProfile(user!.id, update),
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: profileQueryKey(user.id) });
      }
    },
  });
}
