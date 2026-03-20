import { PositionScreen } from "@/features/checklist/components/position-screen";

export default async function PositionPage({ params }: { params: Promise<{ positionId: string }> }) {
  const { positionId } = await params;

  return <PositionScreen positionId={positionId} />;
}
