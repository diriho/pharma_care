import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import ErrorBanner from "../ui/ErrorBanner";
import EmptyState from "../ui/EmptyState";
import { SkeletonLines } from "../ui/Skeleton";
import { useRealtimeTable } from "../../hooks/useRealtimeTable";
import type { Conversation, Message } from "../../types/patient";
import { formatDate } from "../../lib/format";

// Backend adapter so the same panel serves the patient portal (/patient/…)
// and the pharmacy dashboard (/data/…) without duplicating UI or state logic.
export type MessagingAdapter = {
  listConversations: () => Promise<Conversation[]>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (conversationId: string, body: string) => Promise<Message>;
};

export default function MessagingPanel({
  adapter,
  currentUserId,
  emptyTitle,
  emptyHint,
  initialConversationId,
}: {
  adapter: MessagingAdapter;
  currentUserId: string;
  emptyTitle: string;
  emptyHint: string;
  initialConversationId?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Conversation | null>(null);
  selectedRef.current = selected;

  const loadConversations = useCallback(async () => {
    try {
      const list = await adapter.listConversations();
      setConversations(list);
      setError(null);
      return list;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  const openConversation = useCallback(
    async (convo: Conversation) => {
      setSelected(convo);
      setThreadLoading(true);
      try {
        // fetching the thread marks the counterpart's messages read server-side
        setMessages(await adapter.getMessages(convo.id));
        setConversations((list) =>
          list.map((c) => (c.id === convo.id ? { ...c, unread: 0 } : c))
        );
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setThreadLoading(false);
      }
    },
    [adapter]
  );

  useEffect(() => {
    loadConversations().then((list) => {
      if (initialConversationId) {
        const initial = list.find((c) => c.id === initialConversationId);
        if (initial) openConversation(initial);
      }
    });
  }, [loadConversations, openConversation, initialConversationId]);

  // Realtime: new messages appear instantly; RLS only delivers rows from
  // conversations this user participates in.
  useRealtimeTable<Message>({
    table: "messages",
    onChange: (row) => {
      const open = selectedRef.current;
      if (open && row.conversation_id === open.id) {
        if (row.sender_user_id === currentUserId) return; // already appended on send
        // refetch instead of appending: dedupes and marks the message read
        adapter.getMessages(open.id).then(setMessages).catch(() => {});
      } else {
        loadConversations();
      }
    },
    onResync: () => {
      loadConversations();
      const open = selectedRef.current;
      if (open) adapter.getMessages(open.id).then(setMessages).catch(() => {});
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      const sent = await adapter.sendMessage(selected.id, draft.trim());
      setMessages((m) => [...m, sent]);
      setDraft("");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {error && <ErrorBanner message={error} onRetry={loadConversations} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Conversation list */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col md:max-h-[70vh]">
          {loading ? (
            <SkeletonLines lines={4} />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-6 w-6" />}
              title={emptyTitle}
              hint={emptyHint}
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openConversation(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selected?.id === c.id ? "bg-emerald-50/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {c.counterpart_name}
                      </p>
                      {c.unread > 0 && (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {c.last_message?.body || c.subject || "Nouvelle conversation"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Thread */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col md:max-h-[70vh]">
          {!selected ? (
            <EmptyState
              icon={<MessageSquare className="h-6 w-6" />}
              title="Sélectionnez une conversation"
              hint="Choisissez un fil de discussion pour afficher les messages."
            />
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900">{selected.counterpart_name}</p>
                {/* Typing indicator placeholder — needs presence broadcasts */}
                <p className="text-xs text-slate-400 italic h-4"></p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {threadLoading ? (
                  <SkeletonLines lines={4} />
                ) : messages.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Démarrez la conversation en envoyant un message.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_user_id === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                            mine
                              ? "bg-[#063b1e] text-white rounded-br-md"
                              : "bg-slate-100 text-slate-800 rounded-bl-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              mine ? "text-emerald-200/70" : "text-slate-400"
                            }`}
                          >
                            {formatDate(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-slate-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Écrire un message…"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="p-2.5 rounded-xl bg-[#063b1e] text-[#6eff8a] hover:bg-black disabled:opacity-50 transition-colors"
                  aria-label="Envoyer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
