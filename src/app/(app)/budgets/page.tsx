import dynamic from "next/dynamic";
import { Suspense } from "react";

const BudgetsContent = dynamic(() => import("./budgets-content"));

export default function BudgetsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <BudgetsContent />
    </Suspense>
  );
}
