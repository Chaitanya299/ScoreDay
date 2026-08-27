import Header from '@/components/ui/Header'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold mb-4">Profile</h2>
            <p className="text-sm text-slate-500 italic">User profile settings are coming in a future update.</p>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold mb-4">Scoring Preferences</h2>
            <p className="text-sm text-slate-500 italic">Configure how your scores are calculated in a future update.</p>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold mb-4">Notifications</h2>
            <p className="text-sm text-slate-500 italic">Notification settings are coming in a future update.</p>
          </section>

          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400">ScoreDay Scaffold v1.0.0</p>
          </div>
        </div>
      </main>
    </div>
  )
}
