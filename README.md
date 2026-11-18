# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/KangGalon26/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/KangGalon26/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks every pre-token protocol in a sealed DefiLlama snapshot by the implied value of the token it may one day issue, and shows a reader how to farm each one. The model (radar-2) calibrates itself from the snapshot on every run: each category's multiple is the median market-cap / TVL of the live protocols in that category, so a fresh snapshot recalibrates the radar and it finds future launches early instead of reading a hand-kept list. The board covers the whole 40-protocol watchlist plus 138 early protocols below the $50M floor that pass the watchlist's own rule, each with a seven-step farm plan, and the dashboard is a static page with a sortable, filterable board, a detail view for every protocol and a live-token view of the market the model calibrates against.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input token-radar-01-kit/input/snapshot.json
```

Node 22.18 or later, standard library only. `main.ts` reads the snapshot, writes `board.json`, `data.js`, `dashboard/` and `screenshots/` to the output directory, and writes `dossier.json` with the vendored make.fun library. Open `out/dashboard/index.html` in a browser: the board, a protocol's detail view (add `#p=<slug>` to the address) and a filtered view (add `#category=<name>` or `#tab=early`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=tcqak6kb&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
