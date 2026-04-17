import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("platform_name, logo_url, support_email")
    .single();

  return (
    <LoginForm
      platformName={settings?.platform_name ?? "AppealDesk"}
      logoUrl={settings?.logo_url ?? null}
      supportEmail={settings?.support_email ?? null}
    />
  );
}
