"use client";

// DoorSmith social links. Update FACEBOOK_URL with the real page URL.
const INSTAGRAM_URL = "https://www.instagram.com/door_smiths";
const FACEBOOK_URL = "https://www.facebook.com/door_smiths";

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

/**
 * "Follow us" links + a required consent checkbox (accept T&C + follow on
 * Instagram). Used on the karigar and counter KYC forms; the parent gates its
 * submit button on `checked`.
 */
export function SocialFollowConsent({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-700">Follow us</p>

      <div className="flex flex-wrap gap-2">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 px-3 py-2 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
        >
          <InstagramIcon />
          Instagram
        </a>
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
        >
          <FacebookIcon />
          Facebook
        </a>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-brand focus:ring-brand/40"
        />
        <span>
          I accept the <span className="font-medium">Terms &amp; Conditions</span> and follow DoorSmith on Instagram.
        </span>
      </label>
    </div>
  );
}
