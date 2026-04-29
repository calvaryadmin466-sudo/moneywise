import dynamic from "next/dynamic";
import { Suspense } from "react";

const GoalsContent = dynamic(() => import("./goals-content"));

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <GoalsContent />
    </Suspense>
  );
}
