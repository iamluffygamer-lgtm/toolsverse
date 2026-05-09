export default function ToolCardSkeleton() {
  return (
    <div className="card overflow-hidden relative">
      <div className="absolute top-3 right-3 flex gap-1">
        <div className="w-8 h-4 rounded shimmer bg-[--ts-surface]" />
      </div>
      <div className="w-9 h-9 rounded-lg shimmer bg-[--ts-surface] mb-3" />
      <div className="h-5 w-2/3 shimmer bg-[--ts-surface] rounded mb-2" />
      <div className="h-3 w-full shimmer bg-[--ts-surface] rounded mb-1.5" />
      <div className="h-3 w-4/5 shimmer bg-[--ts-surface] rounded mb-4" />
      <div className="flex gap-1 mt-auto">
        <div className="w-12 h-5 rounded shimmer bg-[--ts-surface]" />
        <div className="w-16 h-5 rounded shimmer bg-[--ts-surface]" />
      </div>
    </div>
  )
}
