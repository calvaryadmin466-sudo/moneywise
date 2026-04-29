import dynamic from "next/dynamic";
import { Suspense } from "react";

const ReportsContent = dynamic(() => import("./reports-content"));

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
