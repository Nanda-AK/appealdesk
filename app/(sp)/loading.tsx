export default function SpLoading() {
  return (
    <div className="p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-7 bg-[#E5E7EB] rounded-lg w-48" />
        <div className="h-4 bg-[#E5E7EB] rounded w-36" />
        <div className="mt-6 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-[#E5E7EB] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
