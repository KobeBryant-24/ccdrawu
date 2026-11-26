# ccdrawu-cn —— ccdrawu 的本地 fork

> 这是给仓库主人看的**说明文档**，不是给自动化工具执行的步骤。涉及 git 写操作的地方都只作描述，
> 具体怎么做由你决定。

上游：<https://github.com/vulcanshen/ccdrawu>（GPL-3.0，基线 v1.4.2 / commit `9e63761`）

这个仓库 = 上游 v1.4.2 + 本机三处改动。**Go 端（`cmd/`、`internal/`）完全没动。**

---

## 一、改了什么

### 1. 界面中文化（`hooks/items.ts`）

ITEMS 里 30 项的 `label` / `short` / `name` / `group` / `description` 全改成中文。
label 一律 ≤4 个汉字（8 显示列，正好塞进上游的 `LABEL = 9` 键列）。

### 2. CJK 宽度修正（`hooks/layout.ts` + `hooks/register.tsx`）

上游算列宽用的是**字符数**（`.length`），而 CJK 字符占 2 个显示列 —— 不改就会错位、重叠。

- `hooks/layout.ts`：新增 `padEndCells(text, width)`，按显示宽度补齐
- `hooks/register.tsx`：5 处换成 `cellWidth()` / `padEndCells()`

| 位置 | 原来 | 现在 |
|---|---|---|
| inline 列宽 | `c.label.length` | `cellWidth(c.label)` |
| inline 列宽 | `Math.max(...list.map(c => c.label.length))` | `Math.max(...list.map(c => cellWidth(c.label)))` |
| inline 标签 | `cell.label.padEnd(col.label)` | `padEndCells(cell.label, col.label)` |
| 键列宽 | `item.label.length + 1` | `cellWidth(item.label) + 1` |
| 键填充 | `text.padEnd(keyWidth)` | `padEndCells(text, keyWidth)` |

上游 `layout.ts` 本来就有 `cellWidth()`（处理 East Asian wide），只是这几处没用上。

### 3. MiniMax Coding Plan 配额（`hooks/register.tsx` + `.claude-plugin/plugin.json`）

上游的 `session`（5小时限额）和 `weekly`（7天限额）两格，在第三方 API 下是空的
（Claude 官方的限额只有 Anthropic 账号才有）。这个改动把 MiniMax 的配额填进那两格 ——
语义一致（一段窗口内已用多少、多久重置），**不用加新行、不用改 config.yaml**。

**数据来源**（全部自动，零配置）：

- 服务商地址与凭证，取自 settings 的 `env` 块里发请求时用的那两个值
- 读取方式是 `$.settings.read({ key: 'env' })` —— 读 Claude Code **已经加载并合并好的**那份
  settings，不是自己去开文件（上游 `refreshModelName` 取 effort level 也是这么读的）
- 地址：只看 **hostname** 里有没有 `minimax`（避免中转服务路径里带 minimax 的误判）；
  `new URL(base).origin` 自动丢掉路径部分
- 请求：GET `{origin}/v1/api/openplatform/coding_plan/remains`，带 Bearer 头
- 只取 `model_name === 'general'` 那一组（`video` 的次数配额不混进来）
- 换算：MiniMax 给**剩余**百分比，ccdrawu 要**已用**百分比 → `100 - remaining`
  - `current_interval_remaining_percent` → `five_hour`（5小时那格）
  - `current_weekly_remaining_percent` → `seven_day`（7天那格）
- 5 分钟缓存（`MM_TTL`）；请求失败保留上一次的值，不从数字跳回空白
- 只在地址是 minimax 时才发请求，其他服务商完全不受影响

**manifest 新增 `userConfig`（两项都可选）**：

| 键 | 类型 | 说明 |
|---|---|---|
| `minimax_api_key` | string, **sensitive** | 填了就用它，不填就用 settings 里那把 |
| `minimax_base_url` | string | 留空则从 settings 里的服务商地址推；国际站填 `https://api.minimax.io` |

`sensitive: true` → 存平台安全存储，不落 `settings.json` 明文。

### 4. fork 自己的几处（与上游不同的地方）

| 地方 | 改成 | 为什么 |
|---|---|---|
| `go.mod` 的 `module` | `github.com/KobeBryant-24/ccdrawu` | 否则 `go install github.com/vulcanshen/ccdrawu/cmd/ccdrawu@latest` 装的是上游的 |
| `internal/claude/claude.go` 的 `Repo` | `https://github.com/KobeBryant-24/ccdrawu.git` | 插件从哪儿来 |
| `cmd/ccdrawu/main.go` 的 `selfUpdate()` | `Owner` / `Tap` → `KobeBryant-24` | 否则 `ccdrawu update` 去查**上游**的 release，不是你的 fork |
| `.claude-plugin/plugin.json` 的 `version` | `1.4.3-cn.3` | 抽屉里 "ccdrawu" 那行显示的版本（mod 读的就是这个文件）|
| `install.ps1` / `install.sh` / `uninstall.*` / `.goreleaser.yaml` | 仓库地址 | 让发布与安装脚本指向 fork |

`plugin.json` 的 `author` 保留 `vulcanshen`（GPL 的归属权给原作者），`repository` 指向 fork。

**版本号方案**：`1.4.3-cn.3` = 上游 `1.4.3` + fork 后缀 `-cn.2`。
下次升上游版本时，fork 后缀也跟着加一（`-cn.3`），并打同名 tag。
Go 二进制的版本号由构建参数注入（源码里默认 `dev`，和上游一致）：

```
go build -trimpath -ldflags "-s -w -X github.com/KobeBryant-24/ccdrawu/internal/version.Version=1.4.3-cn.3" ...
```

`SourceFrom()` 会把市场源拼成 `Repo#v<版本>`，也就是 `...ccdrawu.git#v1.4.3-cn.3` ——
**所以 GitHub 上要有 `v1.4.3-cn.3` 这个 tag**，否则 `ccdrawu install claude` 会拉不到。

---

## 二、目录

```
ccdrawu-cn/
├── .claude-plugin/
│   ├── plugin.json        ← 改过（userConfig）
│   └── marketplace.json   ← 改过（市场名改成 ccdrawu-cn，避开和上游撞名）
├── hooks/                 ← 改过（items.ts / layout.ts / register.tsx）
├── types/                 ← 原样
├── cmd/  internal/        ← 原样（Go 端，没动）
└── SYNC.md                ← 本文件
```

## 三、它是怎么被装上的（不用复制文件）

这个目录**本身就是一个插件市场**，注册在 settings.json 的 `extraKnownMarketplaces` 里：

```json
"ccdrawu": { "source": { "source": "directory", "path": "E:\CodeHub\ccdrawu-cn" } }
```

Claude Code 的插件列表里会显示：

```
ccdrawu@ccdrawu   Read from: E:\CodeHub\ccdrawu-cn   ✔ enabled
```

**`Read from` 就是原地加载** —— Claude Code 直接跑这个目录里的 `hooks/register.tsx`，
不读 `plugins\cache\` 里的副本。所以：

- 改完这个目录里的代码 → Claude Code 里 `/reload-plugins` → **立刻生效**，没有复制步骤
- 不用 commit、不用 push、不用打 tag、不用重装插件

`CCDRAWU__MARKETPLACE` 要指到同一个目录（`E:\CodeHub\ccdrawu-cn`），否则
`ccdrawu install claude` 会发现市场指向别处而把它换掉。

README 里也写了另一种配法：把市场指到仓库的 `url#latest`（一个由 release workflow
移到最新 release 上的 tag），这样 `claude plugin marketplace update` +
`claude plugin update` 就跟着 release 走。两种配法不能同时用，市场只有一个 source。

---

## 四、上游更新后怎么同步（描述，具体操作你定）

1. 从 `upstream` remote 拉取上游的新 tag
2. 基于新 tag 开一个分支
3. 用 rebase（或 merge，你偏好哪个用哪个）把本 fork 的改动重放上去
4. 逐个解决可能冲突的四个文件：

| 文件 | 冲突时怎么办 |
|---|---|
| `hooks/items.ts` | 上游加了新项 → 把新项的 `label`/`short`/`name`/`group`/`description` 按同样规则翻成中文；上游改了某项的结构 → 保留上游的字段，把中文值套上去 |
| `hooks/layout.ts` | 上游若已修好 CJK 宽度（用 `cellWidth`/`padEndCells`）→ 删掉我们的 `padEndCells`，改成用上游的 |
| `hooks/register.tsx` | 三处独立：① CJK 宽度那 5 处 ② MiniMax 那段 ③ `register` 签名 `(on, options)`。上游若改了 `refreshUsage` 的结构，把 MiniMax 的合并逻辑跟着挪 |
| `.claude-plugin/plugin.json` | 上游若也加了 `userConfig`，把两项合并进去，别覆盖掉 |

5. 推到你自己的 fork（`origin`）
6. Claude Code 里 `/reload-plugins`

---

## 五、remote 现状

- `upstream` → `https://github.com/vulcanshen/ccdrawu.git` ✓
- `origin` → `https://github.com/KobeBryant-24/ccdrawu.git` ✓（你的 fork）

推送时的认证：Git 自带的 credential manager 已经配好了（`credential.helper = manager`，
`git-credential-manager.exe` 在 `D:\Git\mingw64\bin\`），首次推送会弹浏览器登录。
也可以用 TortoiseGit 的 Push 对话框。

**要打的 tag**：`v1.4.3-cn.3`（版本号去掉 v 就是 `1.4.3-cn.3`）。
`SourceFrom()` 拼的是 `Repo#v1.4.3-cn.3`，tag 不存在的话 `ccdrawu install claude` 会拉不到。

---

## 六、已知问题

**`go test ./...` 里 `TestDoctorSetsRightWhatDoesNotFit` 是失败的 —— 上游 v1.4.3 也一样失败**，
不是这个 fork 引入的。其余包（`internal/claude`、`internal/config`、`internal/statusline`、
`internal/ui`）全过。

---

## 七、注意

**别对已装的插件直接跑 `claude plugin update ccdrawu`**（上游那个 GitHub 版）——
它会从 git ref v1.4.3 重新拉取上游代码。**要更新 fork，走上面的「同步」流程**，
改完 `E:\CodeHub\ccdrawu-cn` 里的源码后，Claude Code 里 `/reload-plugins` 即可（原地加载）。

上游那个 GitHub 版插件已经**卸载**（`claude plugin uninstall ccdrawu`），但它的**市场保留着**
（`claude plugin marketplace list` 里还能看到 `ccdrawu`），想看上游源码或对比时可以用。
