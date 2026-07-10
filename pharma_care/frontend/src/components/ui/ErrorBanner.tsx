// Standard inline error banner with optional retry, matching the app's styling
export default function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-3">
      <span>Erreur de chargement : {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto underline font-semibold">
          Réessayer
        </button>
      )}
    </div>
  );
}
