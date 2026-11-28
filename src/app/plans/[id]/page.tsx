// ACTORVERSE — One training plan, opened: its week-by-week timetable.
import PlanDetailView from "@/components/PlanDetailView";

export default function PlanDetailPage({ params }: { params: { id: string } }) {
  return <PlanDetailView planId={params.id} />;
}
