import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/rbac";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login/khati");
  redirect(ROLE_HOME[session.user.role]);
}
