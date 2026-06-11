function initialsOf(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const ini = parts.slice(0, 2).map((p) => p[0]).join("");
  return ini.toUpperCase() || "?";
}

export function Avatar({
  name,
  photoUrl,
  size = 40,
}: {
  name?: string;
  photoUrl?: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name || "avatar"}
        className="shrink-0 rounded-full object-cover ring-1 ring-gray-200"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-light font-medium text-brand-dark ring-1 ring-brand/15"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initialsOf(name)}
    </div>
  );
}
