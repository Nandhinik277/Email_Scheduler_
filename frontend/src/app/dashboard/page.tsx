import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      user={{
        name: session.user.name || "User",
        email: session.user.email || "",
        image: session.user.image || "",
      }}
    />
  );
}