import { Suspense } from "react";
import SettingsContent from "./settings-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
