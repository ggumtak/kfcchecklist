import { Card } from "@/shared/components/card";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <Card className="text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-2 text-sm text-ink/60">{description}</p>
    </Card>
  );
}
