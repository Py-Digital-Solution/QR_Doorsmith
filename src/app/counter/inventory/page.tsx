import { redirect } from "next/navigation";

export default async function CounterInventoryPage() {
  redirect("/counter/dashboard");
}
