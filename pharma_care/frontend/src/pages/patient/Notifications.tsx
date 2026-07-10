import NotificationCenter, {
  type NotificationsAdapter,
} from "../../components/notifications/NotificationCenter";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/patientPortal";

const adapter: NotificationsAdapter = {
  list: getNotifications,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
};

export default function Notifications() {
  return (
    <NotificationCenter
      title="Notifications"
      adapter={adapter}
      emptyHint="Les mises à jour de vos commandes, messages et résultats apparaîtront ici."
    />
  );
}
