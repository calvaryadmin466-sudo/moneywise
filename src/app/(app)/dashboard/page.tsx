import dynamic from "next/dynamic";
import { Suspense } from "react";

const DashboardContent = dynamic(() => import("./dashboard-content"));

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
