import PageHeader from "../../components/PageHeader";
import MessagingPanel, {
  type MessagingAdapter,
} from "../../components/messaging/MessagingPanel";
import { useAuth } from "../../contexts/AuthContext";
import {
  getConversations,
  getMessages,
  sendMessage,
} from "../../services/pharmacyAdmin";

const adapter: MessagingAdapter = {
  listConversations: getConversations,
  getMessages,
  sendMessage,
};

// Pharmacy-side secure messaging: patients initiate the conversations,
// the pharmacy replies from here.
export default function Messages() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Messages"
        subtitle="Répondez aux questions de vos patients en toute sécurité."
      />
      <MessagingPanel
        adapter={adapter}
        currentUserId={user?.id || ""}
        emptyTitle="Aucune conversation"
        emptyHint="Les conversations démarrées par vos patients apparaîtront ici."
      />
    </div>
  );
}
