import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-white to-amber-100 p-6"><LoginForm /></main>;
}
