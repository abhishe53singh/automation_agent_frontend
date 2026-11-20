import { ReactNode } from "react";
import { EmailNavTabs } from "@/modules/email/components/EmailNavTabs";

export default function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <EmailNavTabs />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
