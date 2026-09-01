import { Suspense } from "react";
import BudgetsContent from "./budgets-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BudgetsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <BudgetsContent />
    </Suspense>
  );
}
