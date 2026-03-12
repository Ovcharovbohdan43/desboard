import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClients, createClient, updateClient, deleteClient } from "@/api/clients";
import type { ClientInsert, ClientUpdate } from "@/api/clients";

export const clientsQueryKey = (teamId: string) => ["clients", teamId] as const;

export function useClients(teamId: string | null) {
  return useQuery({
    queryKey: clientsQueryKey(teamId ?? ""),
    queryFn: () => fetchClients(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateClient(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: ClientInsert) => createClient(insert),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: clientsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["projects", teamId] });
      }
    },
  });
}

export function useUpdateClient(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: ClientUpdate }) =>
      updateClient(id, update),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: clientsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["projects", teamId] });
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "handoff" });
      }
    },
  });
}

export function useDeleteClient(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      if (teamId) {
        qc.invalidateQueries({ queryKey: clientsQueryKey(teamId) });
        qc.invalidateQueries({ queryKey: ["projects", teamId] });
      }
    },
  });
}
