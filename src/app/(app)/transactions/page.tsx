import dynamic from "next/dynamic";
import { Suspense } from "react";

const TransactionsContent = dynamic(() => import("./transactions-content"));

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
