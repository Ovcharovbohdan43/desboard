import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserSettings, upsertUserSettings, type UserSettingsUpdate } from "@/api/userSettings";
import { useAuthContext } from "@/contexts/AuthContext";

export const userSettingsQueryKey = (userId: string) => ["user_settings", userId] as const;

export function useUserSettings() {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: userSettingsQueryKey(user?.id ?? ""),
    queryFn: () => fetchUserSettings(user!.id),
    enabled: !!user?.id,
  });
}

export function useUpdateUserSettings() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: UserSettingsUpdate) => upsertUserSettings(user!.id, update),
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: userSettingsQueryKey(user.id) });
      }
    },
  });
}
