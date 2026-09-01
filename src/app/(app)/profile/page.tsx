import { Suspense } from "react";
import ProfileContent from "./profile-content";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
