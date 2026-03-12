import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type ClientUpdate = TablesUpdate<"clients">;

export async function fetchClients(teamId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Client[];
}

export async function createClient(insert: ClientInsert) {
  const { data, error } = await supabase
    .from("clients")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, update: ClientUpdate) {
  const { data, error } = await supabase
    .from("clients")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
