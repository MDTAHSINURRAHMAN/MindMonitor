interface PatientPageProps {
  params: { id: string };
}

export default function PatientDetailPage({ params }: PatientPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Patient #{params.id}</h1>
      <p className="text-muted-foreground mt-2">Detailed biosensor history and trend analysis.</p>
    </main>
  );
}
