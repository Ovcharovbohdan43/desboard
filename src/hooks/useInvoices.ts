import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "@/api/invoices";
import type { InvoiceInsert, InvoiceUpdate } from "@/api/invoices";

export const invoicesQueryKey = (projectId: string) => ["invoices", projectId] as const;

export function useInvoices(projectId: string | null) {
  return useQuery({
    queryKey: invoicesQueryKey(projectId ?? ""),
    queryFn: () => fetchInvoices(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateInvoice(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insert: InvoiceInsert) => createInvoice(insert),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: invoicesQueryKey(projectId) });
    },
  });
}

export function useUpdateInvoice(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: InvoiceUpdate }) =>
      updateInvoice(id, update),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: invoicesQueryKey(projectId) });
    },
  });
}

export function useDeleteInvoice(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: invoicesQueryKey(projectId) });
    },
  });
}
