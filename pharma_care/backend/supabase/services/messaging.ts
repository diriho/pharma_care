import { admin } from "../client";
import { createNotification } from "./notifications";

export type ConversationRow = {
  id: string;
  patient_user_id: string;
  pharmacy_user_id: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

type Party = "patient" | "pharmacy";

// Fetch conversations for one side of the thread, enriched with the counterpart
// display name, the last message, and the unread count for the caller.
export async function listConversations(userId: string, party: Party) {
  const column = party === "patient" ? "patient_user_id" : "pharmacy_user_id";
  const { data: convos, error } = await admin
    .from("conversations")
    .select("*")
    .eq(column, userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const list = (convos || []) as ConversationRow[];
  if (list.length === 0) return [];

  const counterpartIds = list.map((c) =>
    party === "patient" ? c.pharmacy_user_id : c.patient_user_id
  );
  const namesById = new Map<string, string>();
  if (party === "patient") {
    const { data } = await admin
      .from("pharmacy_settings")
      .select("user_id,name")
      .in("user_id", counterpartIds);
    for (const p of data || []) namesById.set(p.user_id, p.name);
  } else {
    const { data } = await admin
      .from("patient_profiles")
      .select("user_id,full_name")
      .in("user_id", counterpartIds);
    for (const p of data || []) namesById.set(p.user_id, p.full_name);
  }

  const { data: msgs } = await admin
    .from("messages")
    .select("*")
    .in("conversation_id", list.map((c) => c.id))
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return list.map((c) => {
    const related = ((msgs || []) as MessageRow[]).filter(
      (m) => m.conversation_id === c.id
    );
    const counterpartId =
      party === "patient" ? c.pharmacy_user_id : c.patient_user_id;
    return {
      ...c,
      counterpart_name: namesById.get(counterpartId) || "Inconnu",
      last_message: related[0] || null,
      unread: related.filter((m) => m.sender_user_id !== userId && !m.read_at)
        .length,
    };
  });
}

export async function getConversationForUser(
  conversationId: string,
  userId: string
): Promise<ConversationRow | null> {
  const { data, error } = await admin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();
  if (error || !data) return null;
  const c = data as ConversationRow;
  if (c.patient_user_id !== userId && c.pharmacy_user_id !== userId) return null;
  return c;
}

// Return the thread and mark the counterpart's messages as read for the caller.
export async function getMessages(conversationId: string, userId: string) {
  const { data, error } = await admin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  await admin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", userId)
    .is("read_at", null)
    .is("deleted_at", null);

  return (data || []) as MessageRow[];
}

// Soft-delete a message the caller sent. The resulting UPDATE event propagates
// through Realtime (RLS-checked) so every participant's UI drops the message.
export async function deleteMessage(
  conversation: ConversationRow,
  userId: string,
  messageId: string
): Promise<void> {
  const { data: message } = await admin
    .from("messages")
    .select("id,sender_user_id,conversation_id,deleted_at")
    .eq("id", messageId)
    .single();
  if (
    !message ||
    message.conversation_id !== conversation.id ||
    message.deleted_at
  ) {
    throw new Error("Message introuvable");
  }
  if (message.sender_user_id !== userId) {
    throw new Error("Vous ne pouvez supprimer que vos propres messages");
  }
  const { error } = await admin
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw new Error(error.message);
}

export async function sendMessage(
  conversation: ConversationRow,
  senderUserId: string,
  body: string
) {
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_user_id: senderUserId,
      body,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  const recipient =
    senderUserId === conversation.patient_user_id
      ? conversation.pharmacy_user_id
      : conversation.patient_user_id;
  await createNotification(recipient, "new_message", "Nouveau message reçu", {
    conversation_id: conversation.id,
  });

  return data as MessageRow;
}
