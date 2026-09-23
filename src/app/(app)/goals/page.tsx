import { requireUser } from "@/lib/auth";
import { getAllGoals } from "@/lib/queries";
import { GoalsClient } from "@/components/goals/goals-client";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  await requireUser();
  const goals = await getAllGoals();
  return <GoalsClient goals={goals} />;
}
