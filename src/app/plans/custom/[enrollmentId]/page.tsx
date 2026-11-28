// ACTORVERSE — One custom plan, opened: its week-by-week timetable.
// Custom plans share the plan id "custom", so the enrolment row id
// picks which one to open.
import PlanDetailView from "@/components/PlanDetailView";

export default function CustomPlanDetailPage({
  params,
}: {
  params: { enrollmentId: string };
}) {
  return <PlanDetailView planId="custom" enrollmentId={params.enrollmentId} />;
}
