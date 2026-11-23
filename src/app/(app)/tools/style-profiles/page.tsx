import type { Metadata } from "next";

import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { PersonaPanel, STYLE_PROFILE_CONFIG } from "@/modules/personas";

export const metadata: Metadata = { title: "Style Profiles" };

export default function StyleProfilesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <PageHeader
        title="User Style Profiles"
        description="How a person thinks, writes and responds — reused across every post, email and reply you generate."
        breadcrumbs={
          <Breadcrumbs items={[{ label: "Tools", href: "/tools" }, { label: "Style Profiles" }]} />
        }
      />
      <PersonaPanel config={STYLE_PROFILE_CONFIG} />
    </div>
  );
}
