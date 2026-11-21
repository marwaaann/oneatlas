import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState title="Page not found">
        <p className="mb-4">That model, lab or provider doesn&apos;t exist (or was renamed).</p>
        <ButtonLink href="/models">Browse models</ButtonLink>
      </EmptyState>
    </div>
  );
}
