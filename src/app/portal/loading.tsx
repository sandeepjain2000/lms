import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <Loader2 className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-slate-800 animate-pulse">Fetching your data...</h3>
        <p className="text-sm text-slate-500 max-w-[200px]">Connecting to the server. This will just take a moment.</p>
      </div>
      
      {/* Skeleton placeholders for a premium feel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-8">
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse col-span-2" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}
