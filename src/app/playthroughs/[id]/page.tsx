// Phase 2: Team Builder — playthrough detail
export const dynamic = 'force-dynamic';

export default async function PlaythroughPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Playthrough #{id}</h1>
      <p className="text-muted-foreground">Team view coming in Phase 2.</p>
    </div>
  );
}
