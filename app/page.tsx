'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, CreditCard, RefreshCw, Loader2, Trash2, Search,
  CheckCircle2, XCircle, AlertCircle, ArrowUpDown, Zap,
  Clock, ChevronDown, Activity
} from 'lucide-react'
import { CensusRecord, ContributionRecord, ReconciliationRecord, StatsData } from './lib/types'

type Tab = 'census' | 'contributions' | 'reconciliation'

function fmt$(n: number | undefined | null) {
  return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Active' || status === 'Matched') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {status === 'Matched' && '✓ '}{status}
      </span>
    )
  }
  if (status === 'Terminated' || status === 'Mismatch') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        {status === 'Mismatch' && '✗ '}{status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      {status}
    </span>
  )
}

function AccountBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    HSA: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
    FSA: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    DCFSA: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  }
  return (
    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${styles[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>
      {type}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30 text-[10px] font-bold">
      {source}
    </span>
  )
}

function FilterPill({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
          value !== 'All' ? 'bg-[#e31937]/20 text-[#ffb3b1] border border-[#e31937]/40' : 'bg-[#28283d] text-[#e2e0fc]'
        }`}
      >
        {label}{value !== 'All' ? `: ${value}` : ''} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 bg-[#28283d] border border-white/10 rounded-lg py-1 z-50 min-w-[120px] shadow-xl">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`block w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/5 transition ${
                  value === opt ? 'text-[#ffb3b1]' : 'text-[#e2e0fc]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('census')
  const [census, setCensus] = useState<CensusRecord[]>([])
  const [contributions, setContributions] = useState<ContributionRecord[]>([])
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [tierFilter, setTierFilter] = useState('All')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [dataRes, statsRes] = await Promise.all([
        fetch('/api/data'),
        fetch('/api/stats'),
      ])
      const data = await dataRes.json()
      const s = await statsRes.json()
      setCensus(data.census || [])
      setContributions(data.contributions || [])
      setReconciliation(data.reconciliation || [])
      setStats(s)
    } catch (e) {
      console.error('Failed to fetch:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 3000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchData])

  const handleTrigger = async () => {
    setSyncing(true)
    try {
      await fetch('/api/trigger', { method: 'POST' })
      setTimeout(fetchData, 5000)
    } catch (e) {
      console.error('Trigger failed:', e)
    } finally {
      setTimeout(() => setSyncing(false), 5000)
    }
  }

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'POST' })
    setShowReset(false)
    fetchData()
  }

  const filteredCensus = census.filter(r => {
    if (statusFilter !== 'All' && r.employment_status !== statusFilter) return false
    if (accountFilter !== 'All' && r.benefits_account_type !== accountFilter) return false
    if (tierFilter !== 'All' && r.coverage_tier !== tierFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return r.employee_id.toLowerCase().includes(s) || r.first_name.toLowerCase().includes(s) || r.last_name.toLowerCase().includes(s) || r.work_email.toLowerCase().includes(s)
    }
    return true
  })

  const filteredContributions = contributions.filter(r => {
    if (accountFilter !== 'All' && r.benefits_account_type !== accountFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return r.employee_id.toLowerCase().includes(s) || r.payroll_run_id.toLowerCase().includes(s)
    }
    return true
  })

  const filteredReconciliation = reconciliation.filter(r => {
    if (search) return r.payroll_run_id.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const newCount = tab === 'census' ? filteredCensus.filter(r => r._is_new).length
    : tab === 'contributions' ? filteredContributions.filter(r => r._is_new).length
    : filteredReconciliation.filter(r => r._is_new).length

  const updatedCount = tab === 'census' ? filteredCensus.filter(r => r._is_updated).length
    : tab === 'contributions' ? filteredContributions.filter(r => r._is_updated).length
    : filteredReconciliation.filter(r => r._is_updated).length

  const tabTitles: Record<Tab, string> = {
    census: 'Census Management',
    contributions: 'Contribution Records',
    reconciliation: 'Reconciliation',
  }

  const isEmpty = census.length === 0 && contributions.length === 0 && reconciliation.length === 0

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen py-6 bg-[#1a1a2e] w-64 border-r border-white/[0.06] sticky top-0">
        <div className="px-6 mb-10">
          <h1 className="font-black text-[#e2e0fc] text-xl tracking-tight">InComm BenefitsSync</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#e6bdbb] mt-1 font-bold">Payroll-to-Benefits Pipeline</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {([
            { id: 'census' as Tab, label: 'Census', icon: Users, count: census.length },
            { id: 'contributions' as Tab, label: 'Contributions', icon: CreditCard, count: contributions.length },
            { id: 'reconciliation' as Tab, label: 'Reconciliation', icon: ArrowUpDown, count: reconciliation.length },
          ]).map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-all rounded ${
                tab === item.id
                  ? 'bg-[#28283d] text-[#ffb3b1] border-l-4 border-[#e31937]'
                  : 'text-[#e6bdbb] hover:bg-[#1e1e32] border-l-4 border-transparent'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-bold">{item.label}</span>
              {item.count > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{item.count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-3 pt-6 border-t border-white/[0.06] mx-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded bg-[#28283d] flex items-center justify-center text-[#e31937] font-black text-sm">IC</div>
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
            <span className="text-xl font-bold tracking-tight">{tabTitles[tab]}</span>
            <span className="block text-[10px] uppercase font-bold text-[#e6bdbb] tracking-widest">Powered by Refold</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-[#e6bdbb] cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded border-white/20 bg-transparent text-[#e31937] focus:ring-0 w-3.5 h-3.5" />
              Auto-refresh
              {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </label>
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2 bg-[#1a1a2e] p-5 rounded-lg relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffb3b1]" />
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb]">Total Employees</span>
                  <Users size={16} className="text-[#e6bdbb]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tighter font-mono">{stats.total_employees.toLocaleString()}</span>
                  <span className="text-xs font-medium text-[#75d5dd]">Live Data</span>
                </div>
                <div className="mt-3 flex gap-4 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#75d5dd]" />
                    <span>{stats.active} ACTIVE</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]" />
                    <span className="text-[#e6bdbb]">{stats.terminated} TERM</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e1e32] p-5 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb] block mb-1">Contributions</span>
                <div className="text-2xl font-bold font-mono">{stats.total_contributions.toLocaleString()}</div>
                <div className="mt-2 text-[10px] text-[#75d5dd] font-bold flex items-center gap-1">
                  <CreditCard size={12} /> Records synced
                </div>
              </div>

              <div className="bg-[#1e1e32] p-5 rounded-lg flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb]">Reconciliation</span>
                <div className="flex items-center gap-2 mt-2">
                  {stats.recon_status === 'Matched' ? <CheckCircle2 size={20} className="text-emerald-400" /> :
                   stats.recon_status === 'Mismatch' ? <XCircle size={20} className="text-red-400" /> :
                   <AlertCircle size={20} className="text-[#e6bdbb]" />}
                  <span className={`text-lg font-bold ${
                    stats.recon_status === 'Matched' ? 'text-emerald-400' : stats.recon_status === 'Mismatch' ? 'text-red-400' : 'text-[#e6bdbb]'
                  }`}>{stats.recon_status}</span>
                </div>
              </div>

              <div className="bg-[#1e1e32] p-5 rounded-lg relative">
                {(stats.new_census + stats.new_contributions) > 0 && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb] block mb-1">New Records</span>
                <div className="text-3xl font-black text-emerald-400 font-mono">{stats.new_census + stats.new_contributions}</div>
                <p className="text-[10px] text-[#e6bdbb] mt-1">This sync cycle</p>
              </div>

              <div className="bg-[#1e1e32] p-5 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb] block mb-1">Updated</span>
                <div className="text-3xl font-black text-amber-400 font-mono">{stats.updated_census}</div>
                <p className="text-[10px] text-[#e6bdbb] mt-1">Changes detected</p>
              </div>

              <div className="md:col-span-4 lg:col-span-6 bg-[#0c0c1f] p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 border border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="bg-[#28283d] p-2 rounded"><Clock size={18} className="text-[#ffb3b1]" /></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#e6bdbb]">System Status</p>
                    <p className="text-sm font-bold">Last Sync: {stats.last_sync ? new Date(stats.last_sync).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#e6bdbb] uppercase">Total EE</p>
                    <p className="text-sm font-bold font-mono text-[#75d5dd]">{fmt$(stats.total_ee)}</p>
                  </div>
                  <div className="w-px bg-white/10 h-8" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#e6bdbb] uppercase">Total ER</p>
                    <p className="text-sm font-bold font-mono text-[#75d5dd]">{fmt$(stats.total_er)}</p>
                  </div>
                  <div className="w-px bg-white/10 h-8" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#e6bdbb] uppercase">Source</p>
                    <p className="text-sm font-bold">Workday HCM</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#e31937]" />
            </div>
          )}

          {!loading && isEmpty && (
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

          {!loading && !isEmpty && (
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e6bdbb]" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#333348] border-none rounded-lg pl-10 pr-4 py-2 text-sm text-[#e2e0fc] focus:ring-1 focus:ring-[#75d5dd]/40 placeholder:text-[#e6bdbb]/50"
                    placeholder="Search by ID, name, or email..." />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(newCount > 0 || updatedCount > 0) && (
                    <div className="flex items-center gap-3 text-[10px] font-bold mr-2">
                      {newCount > 0 && <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />{newCount} new</span>}
                      {updatedCount > 0 && <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" />{updatedCount} updated</span>}
                    </div>
                  )}
                  {tab === 'census' && (
                    <>
                      <FilterPill label="Status" value={statusFilter} options={['All', 'Active', 'Terminated']} onChange={setStatusFilter} />
                      <FilterPill label="Account" value={accountFilter} options={['All', 'HSA', 'FSA', 'DCFSA']} onChange={setAccountFilter} />
                      <FilterPill label="Tier" value={tierFilter} options={['All', 'EE only', 'EE+Spouse', 'EE+Family']} onChange={setTierFilter} />
                    </>
                  )}
                  {tab === 'contributions' && (
                    <FilterPill label="Account" value={accountFilter} options={['All', 'HSA', 'FSA', 'DCFSA']} onChange={setAccountFilter} />
                  )}
                  {(statusFilter !== 'All' || accountFilter !== 'All' || tierFilter !== 'All') && (
                    <button onClick={() => { setStatusFilter('All'); setAccountFilter('All'); setTierFilter('All') }}
                      className="text-[10px] font-bold uppercase tracking-wider text-[#ffb3b1] ml-2">Clear All</button>
                  )}
                </div>
              </div>

              {/* Census Table */}
              {tab === 'census' && (
                <div className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#28283d]/50">
                          {['Employee ID', 'Employee Name', 'DOB / SSN', 'Account / Tier', 'Status', 'Contribution', 'Source'].map(h => (
                            <th key={h} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#e6bdbb] ${h === 'Contribution' ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredCensus.map(r => (
                          <tr key={r.employee_id}
                            className={`hover:bg-[#333348] transition-all ${
                              r._is_new ? 'border-l-4 border-emerald-400/80 bg-emerald-500/[0.06]' :
                              r._is_updated ? 'border-l-4 border-amber-400/80 bg-amber-500/[0.04]' :
                              'border-l-4 border-transparent'
                            }`}>
                            <td className="px-6 py-4 text-sm font-bold font-mono text-[#75d5dd]">{r.employee_id}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold">{r.first_name} {r.last_name}</div>
                              <div className="text-[10px] text-[#e6bdbb]">{r.work_email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs">{r.dob}</div>
                              <div className="text-xs font-mono text-[#e6bdbb]">{r.ssn}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                <AccountBadge type={r.benefits_account_type} />
                                <span className="px-2 py-0.5 rounded bg-[#28283d] text-[#e6bdbb] text-[10px] font-bold uppercase">{r.coverage_tier}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><StatusBadge status={r.employment_status} /></td>
                            <td className="px-6 py-4 text-right font-mono text-sm">{fmt$(r.benefits_amount)}</td>
                            <td className="px-6 py-4"><SourceBadge source={r.source} /></td>
                          </tr>
                        ))}
                        {filteredCensus.length === 0 && (
                          <tr><td colSpan={7} className="px-6 py-12 text-center text-[#e6bdbb]">No records match your filters</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-[#28283d]/30 px-6 py-3 text-[10px] font-bold text-[#e6bdbb] uppercase">
                    Showing {filteredCensus.length} of {census.length} records
                  </div>
                </div>
              )}

              {/* Contributions Table */}
              {tab === 'contributions' && (
                <div className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#28283d]/50">
                          {['Employee ID', 'Tax Year', 'Account Type', 'EE Contribution', 'ER Contribution', 'Payroll Date', 'Run ID', 'Source'].map(h => (
                            <th key={h} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#e6bdbb] ${h.includes('Contribution') ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredContributions.map((r, i) => (
                          <tr key={`${r.employee_id}-${r.benefits_account_type}-${r.payroll_run_id}-${i}`}
                            className={`hover:bg-[#333348] transition-all ${
                              r._is_new ? 'border-l-4 border-emerald-400/80 bg-emerald-500/[0.06]' :
                              r._is_updated ? 'border-l-4 border-amber-400/80 bg-amber-500/[0.04]' :
                              'border-l-4 border-transparent'
                            }`}>
                            <td className="px-6 py-4 text-sm font-bold font-mono text-[#75d5dd]">{r.employee_id}</td>
                            <td className="px-6 py-4 text-sm">{r.tax_year}</td>
                            <td className="px-6 py-4"><AccountBadge type={r.benefits_account_type} /></td>
                            <td className="px-6 py-4 text-right font-mono text-sm">{fmt$(r.employee_contribution)}</td>
                            <td className="px-6 py-4 text-right font-mono text-sm">{fmt$(r.employer_contribution)}</td>
                            <td className="px-6 py-4 text-sm">{r.payroll_date}</td>
                            <td className="px-6 py-4 text-sm font-mono text-[#75d5dd]">{r.payroll_run_id}</td>
                            <td className="px-6 py-4"><SourceBadge source={r.source} /></td>
                          </tr>
                        ))}
                        {filteredContributions.length === 0 && (
                          <tr><td colSpan={8} className="px-6 py-12 text-center text-[#e6bdbb]">No records match your filters</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-[#28283d]/30 px-6 py-3 text-[10px] font-bold text-[#e6bdbb] uppercase">
                    Showing {filteredContributions.length} of {contributions.length} records
                  </div>
                </div>
              )}

              {/* Reconciliation Table */}
              {tab === 'reconciliation' && (
                <div className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#28283d]/50">
                          {['Run ID', 'Payroll Date', 'Source', 'Total EE', 'Total ER', 'Grand Total', 'Expected', 'Actual', 'Status'].map(h => (
                            <th key={h} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#e6bdbb] ${['Total EE', 'Total ER', 'Grand Total'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredReconciliation.map(r => (
                          <tr key={r.payroll_run_id}
                            className={`hover:bg-[#333348] transition-all ${
                              r._is_new ? 'border-l-4 border-emerald-400/80 bg-emerald-500/[0.06]' :
                              r._is_updated ? 'border-l-4 border-amber-400/80 bg-amber-500/[0.04]' :
                              'border-l-4 border-transparent'
                            }`}>
                            <td className="px-6 py-6 text-base font-bold font-mono text-[#75d5dd]">{r.payroll_run_id}</td>
                            <td className="px-6 py-6 text-base">{r.payroll_date}</td>
                            <td className="px-6 py-6"><SourceBadge source={r.source} /></td>
                            <td className="px-6 py-6 text-right font-mono text-base">{fmt$(r.total_ee_contributions)}</td>
                            <td className="px-6 py-6 text-right font-mono text-base">{fmt$(r.total_er_contributions)}</td>
                            <td className="px-6 py-6 text-right font-mono text-base font-bold">{fmt$(r.total_contributions)}</td>
                            <td className="px-6 py-6 text-base text-center">{r.expected_employee_count}</td>
                            <td className="px-6 py-6 text-base text-center">{r.actual_employee_count}</td>
                            <td className="px-6 py-6"><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                        {filteredReconciliation.length === 0 && (
                          <tr><td colSpan={9} className="px-6 py-12 text-center text-[#e6bdbb]">No reconciliation records yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-[#28283d]/30 px-6 py-3 text-[10px] font-bold text-[#e6bdbb] uppercase">
                    {reconciliation.length} reconciliation run{reconciliation.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1a1a2e] flex justify-around items-center z-50 border-t border-white/[0.06]">
        {([
          { id: 'census' as Tab, label: 'Census', icon: Users },
          { id: 'contributions' as Tab, label: 'Contrib', icon: CreditCard },
          { id: 'reconciliation' as Tab, label: 'Recon', icon: ArrowUpDown },
        ]).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
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
            <p className="text-sm text-[#e6bdbb] mb-6">This cannot be undone. All census, contribution, and reconciliation data will be permanently removed.</p>
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
