// The drawer's items: the catalog (written to catalog.json in the cache for the TUI to list)
// and what each one shows. None touches `$`, so tests can call them.

import type { Background, CacheInfo, GitInfo, Limit, ModelInfo, Modes, PlanInfo, PlanMode, PlanTask, ServiceStatus, SessionInfo, SkillsInfo, TokenInfo, Usage, VersionInfo } from '../types'
import { compact, countdown, directoryName, duration, effortColor, filesText, isNewer, modeLabel, percentText, PLAN_MARKS, syncText, tasksText, usageColor } from './format'

// Catppuccin Mocha: keys in blue, values in text.
// The pane's background is not drawn here: it is the theme's composerSidebarBackground.
export const C = {
  text: '#cdd6f4',
  blue: '#89b4fa',
  lavender: '#b4befe',
  flamingo: '#f2cdcd',
  surface: '#45475a',
  green: '#a6e3a1',
  red: '#f38ba8',
  peach: '#fab387',
}

export type Item = {
  id: string
  label: string // the key column in the pane: 9 characters at most, and 8 for all but Directory
  short: string // the label in the statusline when its format is short: 4 characters at most
  name: string // what the TUI lists
  group: string // the TUI lists the items under these, in catalog order
  description: string
  dock: boolean // on by default beside the transcript
  inline: boolean // on by default above the prompt
  statusline: boolean // on by default in `ccdrawu statusline`
}

// The order here is the order on screen
export const ITEMS: readonly Item[] = [
  // Drawn by the pane itself (pets.ts), over the rows beside the transcript and left of the columns above the prompt
  { id: 'pet', label: '宠物', short: '宠物', name: '像素宠物', group: '宠物', description: '像素小宠物：Claude 干活时走动，干完坐下，闲时睡觉；`/ccdrawu pat` 可以摸摸它', dock: true, inline: true, statusline: false },
  { id: 'model', label: '模型', short: '模型', name: '模型', group: '模型', description: '本次会话使用的模型', dock: true, inline: true, statusline: true },
  { id: 'effort', label: '思考', short: '思考', name: '思考强度', group: '模型', description: '最近一次请求的思考强度，从低到高依次为绿、黄、橙、红', dock: true, inline: true, statusline: false },
  { id: 'mode', label: '模式', short: '模式', name: '权限模式', group: '模型', description: 'auto、plan、接受编辑等；按 shift+tab 切换后会在下一步工具完成后显示', dock: true, inline: true, statusline: false },
  { id: 'style', label: '风格', short: '风格', name: '输出风格', group: '模型', description: '在 /config 里设置的输出风格', dock: false, inline: false, statusline: false },
  { id: 'id', label: '会话', short: 'ID', name: '会话 ID', group: '会话', description: '本次会话 ID 的开头部分', dock: false, inline: false, statusline: false },
  { id: 'context', label: '上下文', short: '上下文', name: '上下文', group: '用量', description: '上下文窗口的使用情况', dock: true, inline: true, statusline: true },
  { id: 'window', label: '窗口', short: '窗口', name: '窗口大小', group: '用量', description: '上下文窗口已用的 token 数与窗口上限', dock: false, inline: false, statusline: false },
  { id: 'session', label: '5小时', short: '5时', name: '5小时限额', group: '用量', description: '5 小时用量限额，以及重置时间', dock: true, inline: true, statusline: true },
  { id: 'weekly', label: '7天', short: '7天', name: '7天限额', group: '用量', description: '7 天用量限额，以及重置时间', dock: true, inline: true, statusline: true },
  { id: 'spend', label: '花费上限', short: '上限', name: '花费上限', group: '用量', description: '网关的花费上限（如果有）', dock: false, inline: false, statusline: false },
  { id: 'cost', label: '花费', short: '花费', name: '会话花费', group: '用量', description: '本次会话到目前为止的花费，与 /cost 统计一致', dock: true, inline: true, statusline: true },
  { id: 'rate', label: '时速', short: '时速', name: '花费速率', group: '用量', description: '本次会话平均每小时花费', dock: false, inline: false, statusline: false },
  { id: 'tokens', label: '令牌', short: '令牌', name: '令牌数', group: '用量', description: '抽屉加载以来主对话的输入、输出与缓存 token 数', dock: false, inline: false, statusline: false },
  { id: 'speed', label: '速度', short: '速度', name: '生成速度', group: '用量', description: '最近一次回复每秒输出的 token 数', dock: false, inline: false, statusline: false },
  { id: 'uptime', label: '运行时长', short: '时长', name: '时长与轮数', group: '活动', description: '会话已运行的时长，以及轮数', dock: true, inline: true, statusline: false },
  { id: 'cache', label: '缓存', short: '缓存', name: '缓存命中率', group: '活动', description: '最近一次请求中由提示缓存提供的比例', dock: true, inline: true, statusline: false },
  { id: 'compact', label: '压缩', short: '压缩', name: '压缩次数', group: '活动', description: '上下文被压缩的次数', dock: true, inline: true, statusline: false },
  { id: 'tasks', label: '任务', short: '任务', name: '后台任务', group: '活动', description: '当前运行的 subagent，以及 Claude 上次回复时后台的 shell、monitor 和 workflow', dock: true, inline: true, statusline: false },
  { id: 'plan', label: '计划', short: '计划', name: '任务计划', group: '活动', description: '本会话的任务计划：已完成数与总数，以及正在做的那一条', dock: true, inline: true, statusline: false },
  { id: 'skills', label: '技能', short: '技能', name: '技能', group: '活动', description: '本次会话运行过的技能，以及最近一个', dock: false, inline: false, statusline: false },
  { id: 'git', label: 'Git', short: 'Git', name: 'Git 分支与改动', group: '工作区', description: '当前分支，以及相对 HEAD 新增和删除的行数', dock: true, inline: true, statusline: true },
  { id: 'sync', label: '同步', short: '同步', name: '领先与落后', group: '工作区', description: '相对 upstream 领先和落后的提交数', dock: false, inline: false, statusline: false },
  { id: 'files', label: '文件', short: '文件', name: '改动文件', group: '工作区', description: '已暂存、已修改和新增的文件', dock: false, inline: false, statusline: false },
  { id: 'commit', label: '提交', short: '提交', name: '提交哈希', group: '工作区', description: 'HEAD 的短哈希', dock: false, inline: false, statusline: false },
  { id: 'repo', label: '仓库', short: '仓库', name: '仓库', group: '工作区', description: 'origin 的 owner/repo，worktree 会话下还有 worktree 名', dock: false, inline: false, statusline: false },
  { id: 'path', label: '路径', short: '路径', name: '工作目录', group: '工作区', description: '本次会话的工作目录', dock: true, inline: true, statusline: false },
  { id: 'directory', label: '目录', short: '目录', name: '目录名', group: '工作区', description: '工作目录的名字，不含完整路径', dock: false, inline: false, statusline: false },
  { id: 'version', label: '版本', short: '版本', name: 'Claude Code 版本', group: '关于', description: '当前版本，有新版时会提示', dock: true, inline: true, statusline: false },
  { id: 'ccdrawu', label: 'ccdrawu', short: 'ccdrawu', name: 'ccdrawu 版本', group: '关于', description: '抽屉自身的版本', dock: true, inline: true, statusline: false },
  { id: 'status', label: '服务状态', short: '状态', name: 'Claude 服务状态', group: '关于', description: 'status.claude.com：正常显示绿色，异常显示橙色或红色', dock: false, inline: false, statusline: false },
]

// Everything an item may show, as the drawer holds it
export type Snapshot = {
  usage: Usage | null
  model: ModelInfo | null
  git: GitInfo | null
  path: string
  turns: number
  cache: CacheInfo | null
  tokens: TokenInfo
  session: SessionInfo
  status: ServiceStatus | null
  skills: SkillsInfo
  plan: PlanInfo | null
  planMode: PlanMode
  compacts: number
  agents: number
  background: Background // by type, as of Claude's last reply
  version: VersionInfo | null
  drawer: string | null // ccdrawu's own version, from its plugin.json
  modes: Modes
  now: number
}

export type Seg = { text: string; color: string; bold?: boolean }

// What an item shows. Beside the transcript a meter draws a bar, `resets` and `below` take a row of
// their own (so a long value wraps whole) and `cutStart` keeps the end of a value too long for the row;
// `rows` are rows of their own under it, for an item that lists things; above the prompt all is text
// on one row
export type View = { value: Seg[]; meter?: number; resets?: string; below?: Seg[]; rows?: Seg[][]; cutStart?: boolean }

// What an item shows before it has a value, or where it has none: its row is there all the same, so the
// rows after it do not move when the value comes
export const NO_VALUE = '-'

// A limit's bar and countdown; its resets row is there before them too
function limitView(limit: Limit | undefined, now: number): View {
  if (limit === undefined) return { value: [{ text: NO_VALUE, color: C.text }], resets: NO_VALUE }
  return {
    value: [{ text: percentText(limit.percentUsed), color: usageColor(limit.percentUsed) }],
    meter: limit.percentUsed,
    resets: limit.resetsAt === undefined ? NO_VALUE : countdown(Date.parse(limit.resetsAt) - now),
  }
}

// An item's view; undefined only for the pet, which the pane draws itself, and an id the catalog does not have
export function view(id: string, s: Snapshot): View | undefined {
  if (id === 'pet' || !ITEMS.some(item => item.id === id)) return undefined
  return held(id, s) ?? { value: [{ text: NO_VALUE, color: C.text }] }
}

// How many tasks the plan row lists, so it does not fill the pane past what fits
const PLAN_MAX_ROWS = 12

// A task's row: its number, then its mark, then what it says while it is in progress, else its subject.
// A task that is done or skipped is dimmed; one in progress says what it is doing.
function planRow(t: PlanTask): Seg[] {
  const mark = PLAN_MARKS[t.status] ?? PLAN_MARKS.pending
  const dim = t.status === 'completed' || t.status === 'skipped'
  const markColor =
    t.status === 'completed' ? C.green : t.status === 'in_progress' ? C.blue : t.status === 'blocked' ? C.peach : C.surface
  const text = t.status === 'in_progress' ? (t.activeForm ?? t.subject) : t.subject
  return [
    { text: `§${t.id} `, color: C.surface },
    { text: `${mark} `, color: markColor },
    { text, color: dim ? C.surface : C.text },
  ]
}

// What an item holds, or undefined while it holds nothing
function held(id: string, s: Snapshot): View | undefined {
  const text = (value: string, color: string = C.text): View => ({ value: [{ text: value, color }] })
  const limit = (kind: string) => limitView(s.usage?.limits.find(l => l.kind === kind), s.now)

  switch (id) {
    case 'model':
      return s.model === null ? undefined : { value: [{ text: s.model.name, color: C.lavender, bold: true }] }
    case 'effort':
      return s.model?.effort === undefined ? undefined : text(s.model.effort, effortColor(s.model.effort))
    case 'mode':
      return s.modes.permission === undefined ? undefined : text(modeLabel(s.modes.permission))
    case 'context': {
      const percent = s.usage?.contextPercent ?? 0
      return { value: [{ text: percentText(percent), color: usageColor(percent) }], meter: percent }
    }
    case 'session':
      return limit('five_hour')
    case 'weekly':
      return limit('seven_day')
    case 'spend':
      return limit('spend_limit')
    case 'cost':
      return s.usage?.costUsd === undefined ? undefined : text('$' + s.usage.costUsd.toFixed(2))
    case 'uptime':
      return text((s.usage ? duration(s.now - s.usage.startedAt) : NO_VALUE) + ` · ${s.turns} turns`)
    case 'cache':
      return s.cache && s.cache.total > 0 ? text(percentText((s.cache.read / s.cache.total) * 100)) : undefined
    case 'compact':
      return text(String(s.compacts))
    case 'tasks':
      return text(tasksText(s.agents, s.background))
    case 'plan': {
      const p = s.plan
      if (p === null) return undefined
      const percent = p.total === 0 ? 0 : (p.done / p.total) * 100
      // Only the ones not done yet, or all of them; unfolded when the mode says so
      const todo = p.tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped')
      const listed = s.planMode === 'remaining' ? todo : p.tasks
      const shown = s.planMode === 'full' ? listed : listed.slice(0, PLAN_MAX_ROWS)
      const rows = shown.map(planRow)
      if (listed.length > shown.length) {
        rows.push([
          { text: `…还有 ${listed.length - shown.length} 条 · /ccdrawu plan more`, color: C.surface },
        ])
      }
      return {
        value: [{ text: `${p.done}/${p.total}`, color: usageColor(percent) }],
        meter: percent,
        below: p.current === undefined ? undefined : [{ text: p.current, color: C.text }],
        rows,
      }
    }
    case 'git':
      if (!s.git) return text('not a repo')
      return {
        value: [{ text: s.git.branch, color: C.text }],
        below: [
          { text: '+' + s.git.added, color: C.green },
          { text: ' -' + s.git.removed, color: C.red },
        ],
      }
    case 'path':
      return { ...text(s.path), cutStart: true }
    case 'directory':
      return text(directoryName(s.path))
    case 'version': {
      const v = s.version
      if (!v) return undefined
      const newer = v.latest !== undefined && isNewer(v.latest, v.current)
      return { value: [{ text: v.current, color: C.text }, ...(newer ? [{ text: '  ↑ ' + v.latest, color: C.peach }] : [])] }
    }
    case 'ccdrawu':
      return s.drawer ? text(s.drawer) : undefined
    case 'style':
      return s.session.outputStyle ? text(s.session.outputStyle) : undefined
    case 'id':
      return s.session.id ? text(s.session.id.slice(0, 8)) : undefined
    case 'window': {
      const u = s.usage
      if (u?.contextWindow === undefined) return undefined
      return text(`${compact(u.contextTokens ?? 0)} / ${compact(u.contextWindow)}`)
    }
    case 'rate': {
      // From a minute on: before that one request makes the hourly figure jump about
      const hours = s.usage ? (s.now - s.usage.startedAt) / 3_600_000 : 0
      if (s.usage?.costUsd === undefined || hours < 1 / 60) return undefined
      return text(`$${(s.usage.costUsd / hours).toFixed(2)}/h`)
    }
    case 'tokens': {
      const t = s.tokens
      if (t.input + t.output + t.cacheRead + t.cacheWrite === 0) return undefined
      return text(`in ${compact(t.input)} · out ${compact(t.output)} · cache ${compact(t.cacheRead + t.cacheWrite)}`)
    }
    case 'speed':
      return s.tokens.speed === undefined ? undefined : text(`${Math.round(s.tokens.speed)} tok/s`)
    case 'skills':
      return text(s.skills.count === 0 ? 'none' : `${s.skills.count}` + (s.skills.last ? ` · last ${s.skills.last}` : ''))
    case 'sync':
      if (!s.git) return text('not a repo')
      return text(s.git.ahead === undefined ? 'no upstream' : syncText(s.git.ahead, s.git.behind ?? 0))
    case 'files':
      if (!s.git) return text('not a repo')
      return s.git.staged === undefined ? undefined : text(filesText(s.git.staged, s.git.unstaged ?? 0, s.git.untracked ?? 0))
    case 'commit':
      if (!s.git) return text('not a repo')
      return text(s.git.sha ?? 'no commits')
    case 'repo': {
      const g = s.git
      if (!g) return text('not a repo')
      if (!g.repo && !g.worktree) return text('no origin')
      return text([g.repo, g.worktree].filter(Boolean).join(' · '))
    }
    case 'status': {
      if (!s.status) return undefined
      const color = s.status.indicator === 'none' ? C.green : s.status.indicator === 'minor' ? C.peach : C.red
      return text(s.status.description, color)
    }
  }
  return undefined
}
