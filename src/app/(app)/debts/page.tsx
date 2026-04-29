import dynamic from "next/dynamic";
import { Suspense } from "react";

const DebtsContent = dynamic(() => import("./debts-content"));

export default function DebtsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DebtsContent />
    </Suspense>
  );
}
