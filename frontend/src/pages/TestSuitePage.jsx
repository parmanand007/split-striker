import { useState, useMemo } from 'react'
import { api } from '../api/client'

function StatusBadge({ status }) {
  const map = {
    PASS: 'bg-green-100 text-green-700',
    FAIL: 'bg-red-100 text-red-600',
    COMPUTATION_ERROR: 'bg-orange-100 text-orange-700',
  }
  const label = { PASS: 'PASS', FAIL: 'FAIL', COMPUTATION_ERROR: 'ERROR' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.FAIL}`}>
      {label[status] || status}
    </span>
  )
}

function CheckList({ checks }) {
  if (!checks || checks.length === 0) return null
  return (
    <div className="space-y-1">
      {checks.map((c, i) => (
        <div key={i} className={`flex items-start gap-2 text-xs px-3 py-1.5 rounded-lg ${c.passed ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className={`mt-0.5 shrink-0 font-bold ${c.passed ? 'text-green-600' : 'text-red-500'}`}>
            {c.passed ? '✓' : '✗'}
          </span>
          <div className="flex-1 min-w-0">
            <span className={`font-medium ${c.passed ? 'text-green-700' : 'text-red-700'}`}>{c.name}</span>
            {!c.passed && c.detail && (
              <span className="ml-2 text-red-500">— {c.detail}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TestRow({ test }) {
  const [expanded, setExpanded] = useState(test.status !== 'PASS')

  return (
    <div className={`border rounded-lg overflow-hidden ${
      test.status === 'PASS' ? 'border-slate-200' :
      test.status === 'COMPUTATION_ERROR' ? 'border-orange-200 bg-orange-50/30' :
      'border-red-200 bg-red-50/30'
    }`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50/80"
      >
        <div className="mt-0.5 shrink-0">
          <StatusBadge status={test.status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{test.description}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{test.plain_language_result}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {test.checks && test.checks.length > 0 && (
            <span className="text-xs text-slate-400">
              {test.checks.filter(c => c.passed).length}/{test.checks.length} checks
            </span>
          )}
          <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3 bg-white space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-600">What this tests: </span>
            {test.plain_language_description}
          </p>

          {/* Computation error */}
          {test.computation_error && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ Computation Error (engine threw an exception)</p>
              <pre className="text-xs text-orange-800 whitespace-pre-wrap font-mono">{test.computation_error}</pre>
            </div>
          )}

          {/* Multi-layer checks */}
          {test.checks && test.checks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Checks ({test.checks.filter(c => c.passed).length}/{test.checks.length} passed)</p>
              <CheckList checks={test.checks} />
            </div>
          )}

          {/* Input */}
          <div>
            <p className="font-semibold text-xs text-slate-500 mb-1">Input</p>
            <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap text-slate-700">
              {JSON.stringify(test.input, null, 2)}
            </pre>
          </div>

          {/* Actual output */}
          {!test.computation_error && (
            <div>
              <p className="font-semibold text-xs text-slate-500 mb-1">Actual output</p>
              <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap text-slate-700">
                {JSON.stringify(test.actual, null, 2)}
              </pre>
            </div>
          )}

          <p className="text-xs text-slate-400 font-mono">id: {test.id}</p>
        </div>
      )}
    </div>
  )
}

function CategoryGroup({ meta, tests }) {
  const passCount = tests.filter(t => t.passed).length
  const errorCount = tests.filter(t => t.status === 'COMPUTATION_ERROR').length
  const total = tests.length
  const allPass = passCount === total

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{meta.label}</h2>
          <p className="text-xs text-slate-400 mt-0.5 italic">{meta.why}</p>
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          allPass ? 'bg-green-100 text-green-700' :
          errorCount > 0 ? 'bg-orange-100 text-orange-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {passCount}/{total}{errorCount > 0 ? ` (${errorCount} error${errorCount > 1 ? 's' : ''})` : ''}
        </div>
      </div>
      <div className="space-y-2 pl-1">
        {tests.map(t => <TestRow key={t.id} test={t} />)}
      </div>
    </div>
  )
}

export default function TestSuitePage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  async function runTests() {
    setLoading(true)
    setError('')
    try {
      const data = await api.runTestSuite()
      setResults(data)
    } catch (err) {
      setError(err.message || 'Failed to run test suite')
    } finally {
      setLoading(false)
    }
  }

  const categories = useMemo(() => {
    if (!results) return []
    return [...new Set(results.results.map(r => r.category))]
  }, [results])

  const filtered = useMemo(() => {
    if (!results) return []
    return results.results.filter(r => {
      if (filterCat !== 'all' && r.category !== filterCat) return false
      if (filterStatus === 'pass' && !r.passed) return false
      if (filterStatus === 'fail' && (r.passed || r.status === 'COMPUTATION_ERROR')) return false
      if (filterStatus === 'error' && r.status !== 'COMPUTATION_ERROR') return false
      if (search && !r.description.toLowerCase().includes(search.toLowerCase()) &&
          !r.plain_language_description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [results, filterCat, filterStatus, search])

  const groupedFiltered = useMemo(() => {
    const groups = {}
    for (const t of filtered) {
      if (!groups[t.category]) groups[t.category] = []
      groups[t.category].push(t)
    }
    return groups
  }, [filtered])

  const { total, passed, failed, errors } = results?.summary || {}
  const allPass = results && failed === 0

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Engine Test Suite</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-layer checks against the real production engine — no mocks.</p>
        </div>
        <button
          onClick={runTests}
          disabled={loading}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 shadow-sm"
        >
          {loading ? 'Running…' : results ? 'Re-run suite' : 'Run Test Suite'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          Running test suite…
        </div>
      )}

      {/* Summary banner */}
      {results && !loading && (
        <div className={`rounded-xl p-5 ${allPass ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-5">
            <div className={`text-4xl font-black ${allPass ? 'text-green-600' : 'text-amber-600'}`}>
              {allPass ? '✓' : failed}
            </div>
            <div className="flex-1">
              <p className={`text-base font-bold ${allPass ? 'text-green-700' : 'text-amber-700'}`}>
                {allPass ? 'All tests passed!' : `${failed} test${failed !== 1 ? 's' : ''} failed`}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {passed}/{total} passing across {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
                {errors > 0 && <span className="ml-2 text-orange-600 font-medium">· {errors} computation error{errors > 1 ? 's' : ''}</span>}
              </p>
            </div>
            {!allPass && (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => { setFilterStatus('fail'); setFilterCat('all') }}
                  className="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100"
                >
                  Failures only
                </button>
                {errors > 0 && (
                  <button
                    onClick={() => { setFilterStatus('error'); setFilterCat('all') }}
                    className="text-xs px-3 py-1.5 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100"
                  >
                    Errors only
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {results && (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            placeholder="Search tests…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input max-w-xs"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
            <option value="all">All results</option>
            <option value="pass">Pass only</option>
            <option value="fail">Fail only</option>
            <option value="error">Errors only</option>
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input w-auto">
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{results.category_meta[c]?.label || c}</option>
            ))}
          </select>
          {(filterCat !== 'all' || filterStatus !== 'all' || search) && (
            <button
              onClick={() => { setFilterCat('all'); setFilterStatus('all'); setSearch('') }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">
            Showing {filtered.length} of {total} tests
          </span>
        </div>
      )}

      {/* Results grouped by category */}
      {results && !loading && (
        <div className="space-y-8">
          {Object.entries(groupedFiltered).map(([cat, tests]) => (
            <CategoryGroup
              key={cat}
              meta={results.category_meta[cat] || { label: cat, why: '' }}
              tests={tests}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No tests match the current filters.</div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-sm font-medium text-slate-500">Press "Run Test Suite" to execute all engine tests.</p>
          <p className="text-xs text-slate-400 mt-1">Multi-layer checks — each test has 2-5 independent assertions.</p>
        </div>
      )}
    </div>
  )
}
