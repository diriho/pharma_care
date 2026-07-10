import NotificationCenter, {
  type NotificationsAdapter,
} from "../../components/notifications/NotificationCenter";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/patientPortal";

const adapter: NotificationsAdapter = {
  list: getNotifications,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
  remove: deleteNotification,
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
