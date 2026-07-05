const SUPPORT_PHONE_DISPLAY = "+91 89504 83393";
const SUPPORT_PHONE_TEL = "+918950483393";

/**
 * "Powered by Gati Growth Labs" + support contact credit line. Server-safe (no
 * hooks) so it can be dropped into any layout/shell footer.
 */
export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-gray-400 ${className}`}>
      Powered by <span className="font-medium text-gray-500">Gati Growth Labs</span>
      {" · "}
      Support:{" "}
      <a
        href={`tel:${SUPPORT_PHONE_TEL}`}
        className="font-medium text-gray-500 transition-colors hover:text-brand hover:underline"
      >
        {SUPPORT_PHONE_DISPLAY}
      </a>
    </p>
  );
}
