import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("patient");
  return (
    <NotificationCenter
      title={t("patient:notifications.title")}
      adapter={adapter}
      emptyHint={t("patient:notifications.emptyHint")}
    />
  );
}
