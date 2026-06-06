export default function Loading() {
  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center">
      <div className="flex gap-1.5">
        {[0, 150, 300].map(d => (
          <div key={d} className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${d}ms` }}/>
        ))}
      </div>
    </div>
  )
}
