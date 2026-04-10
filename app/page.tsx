'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, CreditCard, ArrowUpDown, RefreshCw, Loader2, Trash2, Search, Zap, Clock, Activity
} from 'lucide-react'

type Row = Record<string, unknown>
type Tab = 'census' | 'contributions' | 'reconciliation'

const TAB_CONFIG: { id: Tab; label: string; icon: typeof Users; endpoint: string }[] = [
  { id: 'census', label: 'Census', icon: Users, endpoint: '/api/census' },
  { id: 'contributions', label: 'Contributions', icon: CreditCard, endpoint: '/api/contributions' },
  { id: 'reconciliation', label: 'Reconciliation', icon: ArrowUpDown, endpoint: '/api/reconciliation' },
]

const TAB_TITLES: Record<Tab, string> = {
  census: 'Census Management',
  contributions: 'Contribution Records',
  reconciliation: 'Reconciliation',
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('census')
  const [data, setData] = useState<Record<Tab, Row[]>>({ census: [], contributions: [], reconciliation: [] })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [lastFetch, setLastFetch] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.all(
        TAB_CONFIG.map(t => fetch(t.endpoint).then(r => r.json()))
      )
      setData({
        census: results[0] || [],
        contributions: results[1] || [],
        reconciliation: results[2] || [],
      })
      setLastFetch(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to fetch:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    intervalRef.current = setInterval(fetchData, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  const handleTrigger = async () => {
    setSyncing(true)
    try {
      await fetch('/api/trigger', { method: 'POST' })
    } catch (e) {
      console.error('Trigger failed:', e)
    } finally {
      setTimeout(() => setSyncing(false), 5000)
    }
  }

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'POST' })
    setShowReset(false)
    setData({ census: [], contributions: [], reconciliation: [] })
  }

  const rows = data[tab]
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  const filteredRows = rows.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return columns.some(col => String(r[col] ?? '').toLowerCase().includes(s))
  })

  const formatHeader = (key: string) => key.replace(/_/g, ' ')

  const totalRecords = data.census.length + data.contributions.length + data.reconciliation.length
  const isEmpty = totalRecords === 0

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen py-6 bg-[#1a1a2e] w-64 border-r border-white/[0.06] sticky top-0">
        <div className="px-6 mb-10">
          <h1 className="font-black text-[#e2e0fc] text-xl tracking-tight">Acme BenefitsSync</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#e6bdbb] mt-1 font-bold">Payroll-to-Benefits Pipeline</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {TAB_CONFIG.map(item => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSearch('') }}
              className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-all rounded ${
                tab === item.id
                  ? 'bg-[#28283d] text-[#ffb3b1] border-l-4 border-[#e31937]'
                  : 'text-[#e6bdbb] hover:bg-[#1e1e32] border-l-4 border-transparent'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-bold">{item.label}</span>
              {data[item.id].length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{data[item.id].length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-3 pt-6 border-t border-white/[0.06] mx-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded bg-[#28283d] flex items-center justify-center text-[#e31937] font-black text-sm">AC</div>
            <div>
              <p className="text-xs font-bold">Admin Portal</p>
              <p className="text-[10px] text-[#e6bdbb]">v2.4.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center px-6 py-3 h-16 bg-[#111125] sticky top-0 z-50 border-b border-white/[0.06]">
          <div>
            <span className="text-xl font-bold tracking-tight">{TAB_TITLES[tab]}</span>
            <span className="block text-[10px] uppercase font-bold text-[#e6bdbb] tracking-widest">Powered by Refold</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-[#e6bdbb]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto-refreshing
            </div>
            <button onClick={() => fetchData()}
              className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-[#28283d] text-[#e6bdbb] hover:bg-[#333348] transition text-xs font-bold rounded">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleTrigger} disabled={syncing}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#e31937] text-white transition text-xs font-bold rounded shadow-lg shadow-[#e31937]/20 hover:bg-[#c41530] disabled:opacity-70">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {syncing ? 'Syncing from Workday...' : 'Trigger Sync'}
            </button>
            <button onClick={() => setShowReset(true)}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-red-400/60 hover:text-red-400 transition text-xs font-bold rounded">
              <Trash2 size={12} /> Reset
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Stats bar */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-[#1a1a2e] p-4 rounded-lg relative overflow-hidden flex-1 min-w-[200px]">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffb3b1]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb] block mb-1">Records</span>
              <span className="text-3xl font-bold font-mono">{rows.length}</span>
            </div>
            <div className="bg-[#1a1a2e] p-4 rounded-lg flex-1 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb] block mb-1">Columns</span>
              <span className="text-3xl font-bold font-mono">{columns.length}</span>
            </div>
            <div className="bg-[#1a1a2e] p-4 rounded-lg flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#e6bdbb]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb]">Last Poll</span>
              </div>
              <span className="text-sm font-bold mt-1 block">{lastFetch || 'Never'}</span>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#e31937]" />
            </div>
          )}

          {!loading && isEmpty && !syncing && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity size={48} className="text-[#e6bdbb] mb-4" />
              <h2 className="text-xl font-bold mb-2">No data yet</h2>
              <p className="text-[#e6bdbb] text-sm mb-6">Trigger a sync to pull data from Workday</p>
              <button onClick={handleTrigger} disabled={syncing}
                className="flex items-center gap-2 px-6 py-2 bg-[#e31937] text-white font-bold rounded shadow-lg shadow-[#e31937]/20">
                <Zap size={16} /> Trigger Sync
              </button>
            </div>
          )}

          {!loading && isEmpty && syncing && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 size={48} className="animate-spin text-[#e31937] mb-4" />
              <h2 className="text-xl font-bold mb-2">Syncing from Workday...</h2>
              <p className="text-[#e6bdbb] text-sm">Waiting for data to arrive. Polling every 3 seconds.</p>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-full md:w-96">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e6bdbb]" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#333348] border-none rounded-lg pl-10 pr-4 py-2 text-sm text-[#e2e0fc] focus:ring-1 focus:ring-[#75d5dd]/40 placeholder:text-[#e6bdbb]/50"
                    placeholder="Search across all columns..." />
                </div>
                <span className="text-[10px] font-bold text-[#e6bdbb] uppercase">
                  {filteredRows.length} of {rows.length} records
                </span>
              </div>

              <div className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#28283d]/50">
                        {columns.map(col => (
                          <th key={col} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#e6bdbb] whitespace-nowrap">
                            {formatHeader(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredRows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#333348] transition-all">
                          {columns.map(col => (
                            <td key={col} className="px-5 py-3 text-sm whitespace-nowrap">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#28283d]/30 px-6 py-3 text-[10px] font-bold text-[#e6bdbb] uppercase">
                  {columns.length} columns · {filteredRows.length} rows
                </div>
              </div>
            </section>
          )}

          {!loading && !isEmpty && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity size={48} className="text-[#e6bdbb] mb-4" />
              <h2 className="text-lg font-bold mb-2">No {tab} data yet</h2>
              <p className="text-[#e6bdbb] text-sm">Data will appear here when synced</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1a1a2e] flex justify-around items-center z-50 border-t border-white/[0.06]">
        {TAB_CONFIG.map(item => (
          <button key={item.id} onClick={() => { setTab(item.id); setSearch('') }}
            className={`flex flex-col items-center gap-1 ${tab === item.id ? 'text-[#ffb3b1]' : 'text-[#e6bdbb]'}`}>
            <item.icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Reset Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={() => setShowReset(false)}>
          <div className="bg-[#1e1e32] rounded-lg p-6 max-w-sm w-full mx-4 border border-white/[0.06]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Clear all synced data?</h3>
            <p className="text-sm text-[#e6bdbb] mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReset(false)} className="px-4 py-2 text-sm font-bold text-[#e6bdbb] hover:text-white transition rounded">Cancel</button>
              <button onClick={handleReset} className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded hover:bg-red-700 transition">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
