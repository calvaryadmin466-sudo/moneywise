import { Suspense } from "react";
import DataContent from "./data-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DataPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DataContent />
    </Suspense>
  );
}
