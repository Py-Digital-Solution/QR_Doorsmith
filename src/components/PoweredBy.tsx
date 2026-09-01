const SUPPORT_PHONE_DISPLAY = "+91 89504 83393";
const SUPPORT_PHONE_TEL = "+918950483393";
const SUPPORT_EMAIL = "support@gatigrowthlabs.com";

/**
 * "Powered by Gati Growth Labs" + support contact credit line. Server-safe (no
 * hooks) so it can be dropped into any layout/shell footer.
 */
export function PoweredBy({
  className = "",
  companyName,
  supportPhone,
  supportEmail,
}: {
  className?: string;
  companyName?: string;
  supportPhone?: string;
  supportEmail?: string;
}) {
  const name = companyName || "GatiQ Rewards Platform";
  const phone = supportPhone;
  const email = supportEmail;

  return (
    <p className={`text-center text-xs text-gray-400 ${className}`}>
      Powered by <span className="font-medium text-gray-500">{name}</span>
      {phone && (
        <>
          {" · "}
          Support:{" "}
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="font-medium text-gray-500 transition-colors hover:text-brand hover:underline"
          >
            {phone}
          </a>
        </>
      )}
      {email && (
        <>
          {" · "}
          <a
            href={`mailto:${email}`}
            className="font-medium text-gray-500 transition-colors hover:text-brand hover:underline"
          >
            {email}
          </a>
        </>
      )}
    </p>
  );
}
