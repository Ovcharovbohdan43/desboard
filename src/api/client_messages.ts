import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

const BUCKET = "project-files";

export type ClientMessageInsert = TablesInsert<"client_messages">;

export type ClientMessageAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  name: string;
  size_bytes: number;
  type: string;
  created_at: string;
};

export type ClientMessageWithAttachments = Awaited<ReturnType<typeof fetchClientMessages>>[number];

export async function fetchClientMessages(projectId: string) {
  const { data: messages, error } = await supabase
    .from("client_messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const msgIds = (messages ?? []).map((m) => m.id);
  if (msgIds.length === 0) return (messages ?? []) as Array<{ attachments?: ClientMessageAttachment[] }>;

  const { data: attachments } = await supabase
    .from("client_message_attachments")
    .select("*")
    .in("message_id", msgIds)
    .order("created_at", { ascending: true });

  const attByMsg = new Map<string, ClientMessageAttachment[]>();
  for (const a of (attachments ?? []) as ClientMessageAttachment[]) {
    const list = attByMsg.get(a.message_id) ?? [];
    list.push(a);
    attByMsg.set(a.message_id, list);
  }

  return (messages ?? []).map((m) => ({
    ...m,
    attachments: attByMsg.get(m.id) ?? [],
  }));
}

export async function createClientMessage(insert: ClientMessageInsert) {
  const { data, error } = await supabase
    .from("client_messages")
    .insert({ ...insert, text: insert.text ?? "" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createClientMessageWithAttachments(
  insert: ClientMessageInsert,
  files: File[],
  teamId: string,
  projectId: string
) {
  const msg = await createClientMessage(insert);
  if (!files.length) return msg;

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${crypto.randomUUID()}_${safeName}`;
    const storagePath = `${teamId}/chat/${projectId}/${msg.id}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const ext = file.name.split(".").pop() ?? "bin";
    await supabase.from("client_message_attachments").insert({
      message_id: msg.id,
      storage_path: storagePath,
      name: file.name,
      size_bytes: file.size,
      type: ext,
    });
  }

  return msg;
}
