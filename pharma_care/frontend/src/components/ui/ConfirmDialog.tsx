// Styled confirmation dialog (replaces window.confirm), matching the app's
// modal pattern (overlay + white rounded-2xl card, destructive red action).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Suppression…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
