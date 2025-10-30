// src/components/dashboard/SkeletonWidget.tsx
export default function SkeletonWidget() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-full bg-gray-100 rounded mb-2" />
      <div className="h-3 w-5/6 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-4/6 bg-gray-100 rounded" />
    </div>
  );
}
