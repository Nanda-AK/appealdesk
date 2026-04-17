import { createServiceClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  let platformName = "AppealDesk";
  let logoUrl: string | null = null;
  let supportEmail: string | null = null;

  try {
    const supabase = await createServiceClient();
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("platform_name, logo_url, support_email")
      .single();

    if (settings) {
      platformName = settings.platform_name ?? "AppealDesk";
      logoUrl = settings.logo_url ?? null;
      supportEmail = settings.support_email ?? null;
    }
  } catch {
    // Fall back to defaults if platform_settings is unavailable
  }

  return (
    <LoginForm
      platformName={platformName}
      logoUrl={logoUrl}
      supportEmail={supportEmail}
    />
  );
}
