import { useQuery } from "@tanstack/react-query";
import { fetchAutomationRules } from "@/api/automationRules";

export const automationRulesQueryKey = (teamId: string) =>
  ["automation_rules", teamId] as const;

export function useAutomationRules(teamId: string | null) {
  return useQuery({
    queryKey: automationRulesQueryKey(teamId ?? ""),
    queryFn: () => fetchAutomationRules(teamId!),
    enabled: !!teamId,
  });
}
