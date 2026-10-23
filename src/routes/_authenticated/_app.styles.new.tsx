import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { pageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/app/config-notice";
import { PageContainer, PageHeader } from "@/components/app/page";
import { StyleCreateForm } from "@/components/styles/style-create-form";

export const Route = createFileRoute("/_authenticated/_app/styles/new")({
  head: () => pageMeta("New writing style", "Create a writing style from your own posts."),
  component: NewStylePage,
});

function NewStylePage() {
  const navigate = useNavigate();
  return (
    <PageContainer className="max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to="/styles">
          <ArrowLeft /> Writing styles
        </Link>
      </Button>
      <PageHeader
        title="New writing style"
        description="Paste posts you wrote yourself. We'll analyze tone, vocabulary, sentence length, emoji use, formatting and favorite expressions."
      />
      <ConfigNotice className="mb-6" />
      <div className="surface p-6 sm:p-8">
        <StyleCreateForm
          defaultName=""
          onCreated={(id) => navigate({ to: "/styles/$id", params: { id } })}
        />
      </div>
    </PageContainer>
  );
}
