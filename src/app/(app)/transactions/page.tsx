import { Suspense } from "react";
import TransactionsContent from "./transactions-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
