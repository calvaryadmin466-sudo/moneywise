import { Suspense } from "react";
import ReportsContent from "./reports-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
