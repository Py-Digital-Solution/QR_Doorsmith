/**
 * "Powered by Gati Growth Labs" credit line. Server-safe (no hooks) so it can be
 * dropped into any layout/shell footer.
 */
export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-gray-400 ${className}`}>
      Powered by{" "}
      <a
        href="https://gatigrowthlabs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-gray-500 transition-colors hover:text-brand hover:underline"
      >
        Gati Growth Labs
      </a>
    </p>
  );
}
