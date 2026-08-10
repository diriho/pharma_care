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
  sendMessage,
} from "../../services/pharmacyAdmin";

const adapter: MessagingAdapter = {
  listConversations: getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
};

// Pharmacy-side secure messaging: patients initiate the conversations,
// the pharmacy replies from here.
export default function Messages() {
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("messages.title")}
        subtitle={t("messages.subtitle")}
      />
      <MessagingPanel
        adapter={adapter}
        currentUserId={user?.id || ""}
        emptyTitle={t("messages.empty")}
        emptyHint={t("messages.emptyHint")}
      />
    </div>
  );
}
