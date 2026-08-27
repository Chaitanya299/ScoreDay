import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
          ScoreDay
        </Link>
        <nav className="flex space-x-6 text-sm font-medium">
          <Link href="/" className="text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
            Today
          </Link>
          <Link href="/tasks" className="text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
            Tasks
          </Link>
          <Link href="/settings" className="text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  )
}
