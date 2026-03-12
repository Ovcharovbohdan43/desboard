import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Invoice = Tables<"invoices">;
export type InvoiceInsert = TablesInsert<"invoices">;
export type InvoiceUpdate = TablesUpdate<"invoices">;

export async function fetchInvoices(projectId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data as Invoice[];
}

export async function createInvoice(insert: InvoiceInsert) {
  const { data, error } = await supabase
    .from("invoices")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoice(id: string, update: InvoiceUpdate) {
  const { data, error } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}
