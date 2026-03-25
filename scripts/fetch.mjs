import RSSParser from 'rss-parser'
import translate from 'google-translate-api-x'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const POSTS_PATH = join(__dirname, '..', 'src', 'data', 'posts.json')
const MAX_ITEMS = 60

const parser = new RSSParser()

// Keywords to prioritize money-making / indie dev content
const MONEY_KEYWORDS = [
  'saas', 'mrr', 'arr', 'revenue', 'income', 'profit', 'monetize', 'pricing',
  'startup', 'bootstrap', 'indie', 'solo', 'side project', 'sideproject',
  'launch', 'shipped', 'maker', 'founder', 'solopreneur',
  'passive income', 'subscription', 'freemium', 'paywall',
  'open source', 'api', 'tool', 'template', 'marketplace',
  'show hn', 'i built', 'i made', 'my first',
]

function isMoneyRelated(text) {
  const lower = (text || '').toLowerCase()
  return MONEY_KEYWORDS.some(kw => lower.includes(kw))
}

// --- Data Sources ---

async function fetchHackerNews() {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const ids = await res.json()
    // Fetch more to filter for money-related content
    const top = ids.slice(0, 30)

    const items = await Promise.all(
      top.map(async id => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        return r.json()
      })
    )

    return items
      .filter(item => item && item.url && item.title)
      .filter(item => isMoneyRelated(item.title) || item.score > 300)
      .slice(0, 8)
      .map(item => ({
        title: item.title,
        summary: `${item.score} points | ${item.descendants || 0} comments on Hacker News`,
        source: 'Hacker News',
        url: item.url,
        date: new Date(item.time * 1000).toISOString().split('T')[0],
        tags: ['HN'],
        hot: item.score > 200,
      }))
  } catch (e) {
    console.error('Failed to fetch Hacker News:', e.message)
    return []
  }
}

async function fetchProductHunt() {
  try {
    const feed = await parser.parseURL('https://www.producthunt.com/feed')
    return feed.items.slice(0, 6).map(item => ({
      title: item.title || 'Untitled',
      summary: (item.contentSnippet || item.content || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      source: 'Product Hunt',
      url: item.link,
      date: item.isoDate ? item.isoDate.split('T')[0] : today(),
      tags: ['Product Launch'],
      hot: false,
    }))
  } catch (e) {
    console.error('Failed to fetch Product Hunt:', e.message)
    return []
  }
}

async function fetchGitHubTrending() {
  try {
    const res = await fetch('https://api.github.com/search/repositories?q=created:>' +
      daysAgo(7) + '&sort=stars&order=desc&per_page=6', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
    const data = await res.json()

    return (data.items || []).map(repo => ({
      title: `${repo.full_name} - ${(repo.description || 'No description').slice(0, 80)}`,
      summary: `${repo.stargazers_count} stars | ${repo.language || 'Unknown'} | ${repo.description || ''}`.slice(0, 200),
      source: 'GitHub Trending',
      url: repo.html_url,
      date: repo.created_at.split('T')[0],
      tags: ['GitHub', repo.language || 'Code'].filter(Boolean),
      hot: repo.stargazers_count > 500,
    }))
  } catch (e) {
    console.error('Failed to fetch GitHub Trending:', e.message)
    return []
  }
}

async function fetchIndieHackers() {
  try {
    const feed = await parser.parseURL('https://feeds.transistor.fm/the-indie-hackers-podcast')
    return feed.items.slice(0, 3).map(item => ({
      title: item.title || 'Untitled',
      summary: (item.contentSnippet || '').slice(0, 200),
      source: 'Indie Hackers Podcast',
      url: item.link,
      date: item.isoDate ? item.isoDate.split('T')[0] : today(),
      tags: ['Podcast', 'Indie Dev'],
      hot: false,
    }))
  } catch (e) {
    console.error('Failed to fetch Indie Hackers:', e.message)
    return []
  }
}

async function fetchDevTo() {
  try {
    const res = await fetch('https://dev.to/api/articles?tag=sideproject&top=7&per_page=5')
    const articles = await res.json()
    return articles.map(a => ({
      title: a.title,
      summary: (a.description || '').slice(0, 200),
      source: 'DEV.to',
      url: a.url,
      date: a.published_at.split('T')[0],
      tags: (a.tag_list || []).slice(0, 2),
      hot: a.positive_reactions_count > 50,
    }))
  } catch (e) {
    console.error('Failed to fetch DEV.to:', e.message)
    return []
  }
}

// Money-focused RSS feeds
async function fetchMoneyRSS() {
  const feeds = [
    { url: 'https://www.starterstory.com/feed', source: 'Starter Story', tags: ['Startup', 'Revenue'] },
    { url: 'https://blog.pragmaticengineer.com/rss/', source: 'Pragmatic Engineer', tags: ['Tech', 'Career'] },
  ]

  const results = []
  for (const f of feeds) {
    try {
      const feed = await parser.parseURL(f.url)
      const items = feed.items.slice(0, 3).map(item => ({
        title: item.title || 'Untitled',
        summary: (item.contentSnippet || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        source: f.source,
        url: item.link,
        date: item.isoDate ? item.isoDate.split('T')[0] : today(),
        tags: f.tags,
        hot: false,
      }))
      results.push(...items)
    } catch (e) {
      console.error(`Failed to fetch ${f.source}:`, e.message)
    }
  }
  return results
}

// --- Helpers ---

function today() {
  return new Date().toISOString().split('T')[0]
}

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text)
}

async function translateText(text) {
  if (!text || isChinese(text)) return text
  try {
    const res = await translate(text, { from: 'en', to: 'zh-CN' })
    return res.text
  } catch {
    return text
  }
}

async function translatePosts(posts) {
  const BATCH = 5
  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH)
    await Promise.all(batch.map(async p => {
      if (!isChinese(p.title)) {
        p.title_en = p.title
        p.title = await translateText(p.title)
      }
      if (!isChinese(p.summary)) {
        p.summary_en = p.summary
        p.summary = await translateText(p.summary)
      }
    }))
    // Small delay between batches to avoid rate limiting
    if (i + BATCH < posts.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return posts
}

function deduplicateByURL(posts) {
  const seen = new Set()
  return posts.filter(p => {
    const key = p.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// --- Main ---

async function main() {
  console.log('Fetching from all sources...')

  const [hn, ph, gh, ih, dev, money] = await Promise.all([
    fetchHackerNews(),
    fetchProductHunt(),
    fetchGitHubTrending(),
    fetchIndieHackers(),
    fetchDevTo(),
    fetchMoneyRSS(),
  ])

  console.log(`  Hacker News: ${hn.length}`)
  console.log(`  Product Hunt: ${ph.length}`)
  console.log(`  GitHub Trending: ${gh.length}`)
  console.log(`  Indie Hackers: ${ih.length}`)
  console.log(`  DEV.to: ${dev.length}`)
  console.log(`  Money RSS: ${money.length}`)

  let allNew = [...hn, ...ph, ...gh, ...ih, ...dev, ...money]

  // Translate new posts to Chinese
  console.log(`\nTranslating ${allNew.length} posts to Chinese...`)
  allNew = await translatePosts(allNew)
  console.log('Translation done.')

  // Load existing posts
  let existing = []
  try {
    existing = JSON.parse(readFileSync(POSTS_PATH, 'utf-8'))
  } catch {}

  // Merge: new on top, deduplicate by URL, keep max items
  const merged = deduplicateByURL([...allNew, ...existing]).slice(0, MAX_ITEMS)

  // Assign IDs
  merged.forEach((p, i) => { p.id = i + 1 })

  writeFileSync(POSTS_PATH, JSON.stringify(merged, null, 2) + '\n')
  console.log(`\nDone! Total: ${merged.length} posts saved.`)
}

main()
