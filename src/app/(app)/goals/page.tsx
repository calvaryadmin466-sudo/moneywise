import { Suspense } from "react";
import GoalsContent from "./goals-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <GoalsContent />
    </Suspense>
  );
}
