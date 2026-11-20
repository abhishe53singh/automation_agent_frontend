import type { Metadata } from "next";

import { CaptchaSitesPanel } from "@/modules/captcha/components/CaptchaSitesPanel";
import { Breadcrumbs, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Captcha" };

export default function CaptchaSitesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Captcha"
        description="Protect forms on any website with this app's own distorted-text captcha."
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Integrations", href: "/integrations" }, { label: "Captcha" }]}
          />
        }
      />
      <CaptchaSitesPanel />
    </div>
  );
}
