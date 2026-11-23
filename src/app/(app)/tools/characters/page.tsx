import type { Metadata } from "next";

import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { CHARACTER_CONFIG, PersonaPanel } from "@/modules/personas";

export const metadata: Metadata = { title: "Characters" };

export default function CharactersPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <PageHeader
        title="Characters"
        description="How each character looks, dresses, speaks and moves — reused across every image and video you generate."
        breadcrumbs={
          <Breadcrumbs items={[{ label: "Tools", href: "/tools" }, { label: "Characters" }]} />
        }
      />
      <PersonaPanel config={CHARACTER_CONFIG} />
    </div>
  );
}
