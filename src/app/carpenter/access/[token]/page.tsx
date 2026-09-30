import { AccessClient } from "./AccessClient";

export default async function CarpenterAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AccessClient token={token} />;
}
