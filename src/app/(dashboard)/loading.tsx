// src/app/(dashboard)/loading.tsx
import SkeletonWidget from "@/components/dashboard/SkeletonWidget";
export default function LoadingDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({length:5}).map((_,i)=><SkeletonWidget key={i} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonWidget /><SkeletonWidget />
      </div>
    </div>
  );
}
