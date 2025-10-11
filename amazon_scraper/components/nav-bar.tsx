"use client"

export function NavBar() {
  return (
    <header className="border-b bg-card">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div aria-hidden className="size-6 rounded-sm bg-primary" />
          <span className="text-balance text-sm font-semibold tracking-tight">Amazon Price Tracker</span>
        </div>
        <div className="text-xs text-muted-foreground">Dashboard</div>
      </nav>
    </header>
  )
}
