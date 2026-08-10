import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import MessagingPanel, {
  type MessagingAdapter,
} from "../../components/messaging/MessagingPanel";
import { useAuth } from "../../contexts/AuthContext";
import {
  deleteMessage,
  getConversations,
  getMessages,
  getPharmacies,
  sendMessage,
  startConversation,
} from "../../services/patientPortal";
import type { PharmacySummary } from "../../types/patient";
import { translateApiError } from "../../i18n/apiError";

const adapter: MessagingAdapter = {
  listConversations: getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
};

export default function Messages() {
  const { user } = useAuth();
  const { t } = useTranslation(["patient", "common"]);
  const [showNew, setShowNew] = useState(false);
  // remounts the panel with the new thread selected after creation
  const [focusConversation, setFocusConversation] = useState<string | undefined>();
  const [panelKey, setPanelKey] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("patient:messages.title")}
        subtitle={t("patient:messages.subtitle")}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> {t("common:messaging.newConversation")}
          </button>
        }
      />

      <MessagingPanel
        key={panelKey}
        adapter={adapter}
        currentUserId={user?.id || ""}
        emptyTitle={t("patient:messages.emptyTitle")}
        emptyHint={t("patient:messages.emptyHint")}
        initialConversationId={focusConversation}
      />

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onCreated={(conversationId) => {
            setShowNew(false);
            setFocusConversation(conversationId);
            setPanelKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const { t } = useTranslation(["patient", "common"]);
  const [pharmacies, setPharmacies] = useState<PharmacySummary[]>([]);
  const [pharmacyId, setPharmacyId] = useState("");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPharmacies()
      .then(setPharmacies)
      .catch((err) => setError(translateApiError(err, t)));
  }, [t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pharmacyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const convo = await startConversation(pharmacyId, subject.trim() || undefined);
      onCreated(convo.id);
    } catch (err) {
      setError(translateApiError(err, t));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("common:messaging.newConversation")}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={t("common:buttons.close")}
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("patient:messages.pharmacyLabel")} <span className="text-red-500">*</span>
            </label>
            <select
              value={pharmacyId}
              onChange={(e) => setPharmacyId(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm"
            >
              <option value="">{t("patient:messages.choosePharmacyOption")}</option>
              {pharmacies.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.name} ({p.commune})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("patient:messages.subjectLabel")}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm"
              placeholder={t("patient:messages.subjectPlaceholder")}
            />
          </div>
          {error && (
            <p className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !pharmacyId}
            className="w-full py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
          >
            {submitting ? t("patient:messages.creating") : t("patient:messages.startButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
