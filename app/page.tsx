import Header from '@/components/ui/Header'
import DashboardView from '@/components/dashboard/DashboardView'
import { getDashboardData } from '@/lib/scoring'

export const revalidate = 0

export default async function HomePage() {
  const data = await getDashboardData()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DashboardView initialData={data} />
      </main>
    </div>
  )
}
