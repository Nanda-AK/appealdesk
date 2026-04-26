import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createServiceClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createServiceClient();
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("platform_name, description")
      .single();

    const name = settings?.platform_name ?? "TaxVeteran";
    const description = settings?.description ?? "Your AI Tax Attorney";

    return {
      title: name,
      description,
      icons: {
        icon: "/api/favicon",
        apple: "/api/favicon",
      },
    };
  } catch {
    return {
      title: "TaxVeteran",
      description: "Your AI Tax Attorney",
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>{children}</body>
    </html>
  );
}
