import { Suspense } from "react";
import BillsContent from "./bills-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BillsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <BillsContent />
    </Suspense>
  );
}
