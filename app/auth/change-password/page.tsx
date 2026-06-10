import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-heading mb-2">Set Your Password</h1>
        <p className="text-sm text-secondary mb-6">
          Please set a new password for your account before continuing.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
