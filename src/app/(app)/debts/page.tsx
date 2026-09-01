import { Suspense } from "react";
import DebtsContent from "./debts-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DebtsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DebtsContent />
    </Suspense>
  );
}
