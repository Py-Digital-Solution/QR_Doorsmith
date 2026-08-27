function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

/**
 * "Follow us" links + consent checkbox (accept T&C + follow on social media).
 * Dynamically uses tenant company name and configured social media links.
 */
export function SocialFollowConsent({
  checked,
  onChange,
  companyName,
  instagramUrl,
  facebookUrl,
  youtubeUrl,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  companyName?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
}) {
  const hasSocial = Boolean(instagramUrl || facebookUrl || youtubeUrl);
  const name = companyName?.trim();

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      {hasSocial && (
        <>
          <p className="text-sm font-medium text-gray-700">Follow us</p>
          <div className="flex flex-wrap gap-2">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 px-3 py-2 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
              >
                <InstagramIcon />
                Instagram
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
              >
                <FacebookIcon />
                Facebook
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF0000] px-3 py-2 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
              >
                <YoutubeIcon />
                YouTube
              </a>
            )}
          </div>
        </>
      )}

      <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-brand focus:ring-brand/40"
        />
        <span>
          I accept the <span className="font-medium">Terms &amp; Conditions</span>
          {instagramUrl ? (
            <> and follow {name ? <strong>{name}</strong> : "us"} on Instagram.</>
          ) : hasSocial ? (
            <> and follow {name ? <strong>{name}</strong> : "us"} on social media.</>
          ) : (
            "."
          )}
        </span>
      </label>
    </div>
  );
}
