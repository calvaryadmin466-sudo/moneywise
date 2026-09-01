import { Suspense } from "react";
import AssetsContent from "./assets-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AssetsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AssetsContent />
    </Suspense>
  );
}
