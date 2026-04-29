import dynamic from "next/dynamic";
import { Suspense } from "react";

const SettingsContent = dynamic(() => import("./settings-content"), {
  ssr: false,
});

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
