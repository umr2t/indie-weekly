import { useState, useMemo, useCallback } from 'react'
import posts from './data/posts.json'

const GITHUB_REPO = 'umr2t/indie-weekly'
const allTags = [...new Set(posts.flatMap(p => p.tags))]

function App() {
  const [activeTag, setActiveTag] = useState(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')

  const triggerRefresh = useCallback(async () => {
    const token = prompt('Enter your GitHub Personal Access Token to trigger refresh:')
    if (!token) return

    setRefreshing(true)
    setRefreshMsg('')
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/fetch.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      )
      if (res.status === 204) {
        setRefreshMsg('Triggered! Site will update in ~2 minutes.')
      } else {
        setRefreshMsg('Failed: ' + res.status)
      }
    } catch (e) {
      setRefreshMsg('Error: ' + e.message)
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshMsg(''), 5000)
    }
  }, [])

  const filtered = useMemo(() => {
    return posts.filter(p => {
      const matchTag = !activeTag || p.tags.includes(activeTag)
      const s = search.toLowerCase()
      const matchSearch = !search ||
        p.title.toLowerCase().includes(s) ||
        p.summary.toLowerCase().includes(s) ||
        (p.title_en || '').toLowerCase().includes(s) ||
        (p.summary_en || '').toLowerCase().includes(s)
      return matchTag && matchSearch
    })
  }, [activeTag, search])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Indie Weekly
            </span>
            <span className="text-xs text-gray-500 border border-gray-700 rounded-full px-2 py-0.5">
              vol.01
            </span>
          </div>
          <div className="flex items-center gap-3">
            {refreshMsg && (
              <span className="text-xs text-amber-400">{refreshMsg}</span>
            )}
            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-400 transition-colors disabled:opacity-50"
              title="Manually trigger data refresh"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <a
              href="https://github.com/umr2t/indie-weekly"
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent leading-tight">
          独立开发者搞钱周刊
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          每日自动聚合独立开发、副业变现、SaaS 增长的最新资讯。
          <br />
          发现赚钱灵感，追踪热门产品，助你打造下一个 Side Project。
        </p>
      </section>

      {/* Search & Filter */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索项目、工具、文章..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !activeTag
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600'
              }`}
            >
              ALL
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTag === tag
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-gray-800 to-transparent" />

          <div className="space-y-6">
            {filtered.map((post, i) => (
              <article key={post.id} className="relative pl-12 md:pl-16 group">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 md:left-4.5 top-6 w-3 h-3 rounded-full border-2 transition-colors ${
                  post.hot
                    ? 'bg-violet-500 border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]'
                    : 'bg-gray-800 border-gray-600 group-hover:border-violet-500'
                }`} />

                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-violet-500/50 hover:bg-gray-900 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">{post.date}</span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-500">{post.source}</span>
                      {post.hot && (
                        <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5">
                          HOT
                        </span>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>

                  <h3 className="text-base font-semibold text-gray-100 mb-1 group-hover:text-violet-300 transition-colors">
                    {post.title}
                  </h3>
                  {post.title_en && (
                    <p className="text-xs text-gray-600 mb-2">{post.title_en}</p>
                  )}

                  <p className="text-sm text-gray-400 leading-relaxed mb-3">
                    {post.summary}
                  </p>

                  <div className="flex gap-2">
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-800 text-gray-400 rounded-md px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </a>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No results found</p>
              <p className="text-sm mt-1">Try different keywords or filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        <p>
          Indie Weekly - Data auto-updated daily via GitHub Actions
        </p>
        <p className="mt-1">
          Sources: Hacker News, Product Hunt, GitHub Trending, Indie Hackers, DEV.to & more
        </p>
      </footer>
    </div>
  )
}

export default App
