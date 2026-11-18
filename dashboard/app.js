// Token Radar dashboard, radar-2. It reads window.RADAR (written beside dashboard/
// by main.ts) and renders the ranked board, a filterable table, a per-protocol
// detail view with the model's own inputs and the protocol's farm plan, and a
// live-token view that shows the market the model calibrates against. No network:
// every byte it shows is in data.js. The page recomputes a row from the snapshot
// figures and checks the number board.json carries, so the page's code and the
// board's data are visibly the same arithmetic.
(function () {
  'use strict';
  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var model = DATA.model;
  var cal = DATA.calibration;
  var state = { q: '', category: 'all', chain: 'all', tab: 'board', sort: 'implied', dir: -1, selected: null };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function usd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) { if (n === null || n === undefined || !isFinite(n)) return 'n/a'; return (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
  function age(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function catMultiple(category) {
    var row = null;
    for (var i = 0; i < cal.rows.length; i++) if (cal.rows[i].category === (category || 'Uncategorized')) row = cal.rows[i];
    if (row && row.source === 'category') return { multiple: row.multiple, source: 'category', n: row.live_count };
    return { multiple: cal.overall_multiple, source: 'market', n: 0 };
  }
  // The model in one function: the same arithmetic lib/model.ts runs, so the
  // page can show its working beside the board's number.
  function impliedOf(row) {
    var cm = catMultiple(row.category);
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var a = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(a, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var chainMult = 1 + model.chain_step * Math.min(Math.max((row.chains || []).length - 1, 0), model.chain_max);
    return { implied: Math.max(1, Math.round(row.tvl_usd * cm.multiple * growthMult * maturity * chainMult)), multiple: cm.multiple, source: cm.source, n: cm.n, growth: growth, growthMult: growthMult, maturity: maturity, chainMult: chainMult };
  }
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(a) { if (a === null || a === undefined) return 30; if (a < 180) return 60; if (a < 365) return 45; return 30; }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase(); var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function secondActionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase(); var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow a small amount against the supply on ' + name + ', then repay it once to show both sides of the market.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Swap a small amount through ' + name + "'s pool on " + chain + ' so the position is not a deposit alone.';
    if (c.indexOf('bridge') >= 0) return 'Bridge a second, smaller amount back the other way through ' + name + ' so both directions are used.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Restake the receipt ' + name + ' gives you through its restaking option, if it offers one, and keep the new receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Close the hedge after a week and open a fresh one, so the account shows repeated trading.';
    if (c.indexOf('prediction') >= 0) return 'Settle the first market position on ' + name + ', then place a second small position in another market.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Move a share of the deposit between two vaults ' + name + ' offers, and keep the larger share where it started.';
    if (c.indexOf('stable') >= 0) return 'Redeem a small amount of the stable asset through ' + name + ' and re-mint it, so the account shows both directions.';
    if (c.indexOf('rwa') >= 0) return 'Claim the yield the ' + name + ' asset accrues and re-mint it into the same position.';
    if (c.indexOf('insurance') >= 0) return 'Top up the cover from ' + name + ' before it lapses, rather than letting it run out.';
    return 'Use a second feature of ' + name + ', such as its swap or rewards page, with a small amount.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold the position and check the protocol\'s own page.';
    return s;
  }
  // The farm plan is the same derivation main.ts writes to board.json: category,
  // chains, TVL and age decide the action, the capital, the hold and every cost
  // and time. No name is special-cased.
  function farmSteps(p) {
    var chain = chainOf(p); var capital = capitalFor(p); var hold = holdDaysFor(p.age_days);
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: secondActionFor(p, capital, chain), cost: 'about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log, then unwind the position in the reverse order you opened it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }
  function readHash() {
    var h = window.location.hash.replace(/^#/, ''); if (!h) return;
    var params = new URLSearchParams(h);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('sort')) state.sort = params.get('sort');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.selected) params.set('p', state.selected);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.tab !== 'board') params.set('tab', state.tab);
    if (state.sort !== 'implied') params.set('sort', state.sort);
    var s = params.toString();
    history.replaceState(null, '', s ? '#' + s : '#');
  }
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var rows = DATA.rows.filter(function (r) {
      if (state.tab === 'watchlist' && !r.watchlist) return false;
      if (state.tab === 'early' && r.watchlist) return false;
      if (state.category !== 'all' && (r.category || 'Uncategorized') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort;
    rows.sort(function (a, b) {
      var d = 0;
      if (key === 'tvl') d = a.tvl_usd - b.tvl_usd;
      else if (key === 'growth') d = (a.change_7d || 0) - (b.change_7d || 0);
      else if (key === 'age') d = (a.age_days || 0) - (b.age_days || 0);
      else if (key === 'name') d = a.name < b.name ? -1 : 1;
      else d = a.implied_value_usd - b.implied_value_usd;
      return d * state.dir;
    });
    return rows;
  }
  function options(list, current, allLabel) {
    var h = '<option value="all"' + (current === 'all' ? ' selected' : '') + '>' + allLabel + '</option>';
    list.forEach(function (v) { h += '<option value="' + esc(v) + '"' + (current === v ? ' selected' : '') + '>' + esc(v) + '</option>'; });
    return h;
  }
  function render() {
    writeHash();
    var cats = [], chains = [];
    DATA.rows.forEach(function (r) {
      var c = r.category || 'Uncategorized'; if (cats.indexOf(c) < 0) cats.push(c);
      (r.chains || []).forEach(function (ch) { if (chains.indexOf(ch) < 0) chains.push(ch); });
    });
    cats.sort(); chains.sort();
    var top = DATA.rows.slice(0, 5);
    var sel = null;
    if (state.selected) DATA.rows.forEach(function (r) { if (r.slug === state.selected) sel = r; });
    var rows = state.tab === 'live' ? [] : filteredRows();
    var h = '<div class="wrap">';
    h += '<header><h1>Token Radar: <span>which pre-token protocol is worth farming next?</span></h1>';
    h += '<p class="lede">Every protocol below records no token yet. Each is ranked by an implied value the model computes from its own TVL, seven-day growth and age with no token, calibrated against the live tokens that already trade. Click any row for its model breakdown and its seven-step farm plan.</p></header>';
    h += '<div class="stats">'
      + '<div class="stat"><b>' + DATA.board_size + '</b><span>protocols ranked</span></div>'
      + '<div class="stat"><b>' + DATA.watchlist_size + '</b><span>on the watchlist</span></div>'
      + '<div class="stat"><b>' + DATA.early_size + '</b><span>early finds below the floor</span></div>'
      + '<div class="stat"><b>' + usd(DATA.rows[0].implied_value_usd) + '</b><span>top implied value</span></div>'
      + '<div class="stat"><b>' + esc(DATA.as_of) + '</b><span>snapshot date</span></div></div>';
    if (!sel) h += '<div class="spot">' + top.map(function (r) {
      return '<div class="card" data-slug="' + esc(r.slug) + '"><div class="r">#' + r.rank + ' &middot; ' + esc(r.category || 'Uncategorized') + '</div><h3>' + esc(r.name) + '</h3><p>Implied value <b>' + usd(r.implied_value_usd) + '</b></p><p>TVL ' + usd(r.tvl_usd) + ' &middot; 7d ' + pct(r.change_7d) + ' &middot; age ' + age(r.age_days) + '</p></div>';
    }).join('') + '</div>';
    if (sel) {
      var v = impliedOf(sel);
      var comps = DATA.live.filter(function (l) { return l.category === sel.category; }).slice(0, 3);
      h += '<section class="detail"><h2>#' + sel.rank + ' ' + esc(sel.name) + ' ' + (sel.watchlist ? '<span class="tag watch">watchlist</span>' : '<span class="tag early">early find</span>') + '</h2>'
        + '<p class="note">' + esc(sel.category || 'Uncategorized') + ' &middot; ' + sel.chains.map(esc).join(', ') + ' &middot; listed ' + esc(sel.listed_at || 'unknown') + ' &middot; records no token (no market cap, no CoinGecko id, no symbol).</p>'
        + '<div class="grid">'
        + '<div class="cell"><b>' + usd(sel.implied_value_usd) + '</b><span>implied value, board.json</span></div>'
        + '<div class="cell"><b>' + usd(v.implied) + '</b><span>recomputed here in the page</span></div>'
        + '<div class="cell"><b>' + usd(sel.tvl_usd) + '</b><span>TVL</span></div>'
        + '<div class="cell"><b>&times;' + v.multiple.toFixed(3) + '</b><span>category multiple (' + v.source + (v.source === 'category' ? ', ' + v.n + ' live' : '') + ')</span></div>'
        + '<div class="cell"><b>&times;' + v.growthMult.toFixed(3) + '</b><span>growth, ' + pct(v.growth) + ' over 7d</span></div>'
        + '<div class="cell"><b>&times;' + v.maturity.toFixed(3) + '</b><span>maturity, age ' + age(sel.age_days) + '</span></div>'
        + '<div class="cell"><b>&times;' + v.chainMult.toFixed(2) + '</b><span>chain reach, ' + sel.chains.length + ' chain' + (sel.chains.length === 1 ? '' : 's') + '</span></div></div>'
        + '<p class="note">Implied value = TVL &times; category multiple &times; growth &times; maturity &times; chain reach. The category multiple is the median market-cap / TVL of live protocols in the same category (at least 3 live comparables, else the market median ' + cal.overall_multiple.toFixed(3) + '), clamped to 0.08&ndash;0.55. The page recomputes ' + usd(v.implied) + ' and the board carries ' + usd(sel.implied_value_usd) + ': ' + (v.implied === sel.implied_value_usd ? 'they agree.' : 'they differ &mdash; the board is the entry&rsquo;s claim.') + '</p>';
      if (comps.length) {
        h += '<p class="note">Live comparables in ' + esc(sel.category || 'this category') + ': ' + comps.map(function (l) { return esc(l.name) + ' (' + (l.mcap_tvl === null ? 'n/a' : l.mcap_tvl.toFixed(2)) + '&times; TVL)'; }).join(', ') + '.</p>';
      }
      h += '<h2>How to farm it</h2><ol>' + farmSteps(sel).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>'
        + '<div class="warn">Never pay to claim an airdrop, and never follow a claim link from a chat or a search ad: claim only from the protocol&rsquo;s own points or rewards page. A token is not promised &mdash; the implied value is this radar&rsquo;s own claim, not a prediction that a token is issued.</div>'
        + '<button class="tab" data-close="1">Close detail</button></section>';
    }
    h += '<div class="tabs" role="group">'
      + [['board', 'Full board'], ['watchlist', 'Watchlist'], ['early', 'Early finds'], ['live', 'Live tokens']].map(function (t) { return '<button class="tab" data-tab="' + t[0] + '" aria-pressed="' + (state.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (state.tab !== 'live') {
      h += '<div class="controls"><input id="q" type="search" placeholder="Search name, slug or category" value="' + esc(state.q) + '" aria-label="Search">'
        + '<select id="category" aria-label="Category">' + options(cats, state.category, 'All categories') + '</select>'
        + '<select id="chain" aria-label="Chain">' + options(chains, state.chain, 'All chains') + '</select>'
        + '<select id="sort" aria-label="Sort by"><option value="implied"' + (state.sort === 'implied' ? ' selected' : '') + '>Sort: implied value</option><option value="tvl"' + (state.sort === 'tvl' ? ' selected' : '') + '>Sort: TVL</option><option value="growth"' + (state.sort === 'growth' ? ' selected' : '') + '>Sort: 7d growth</option><option value="age"' + (state.sort === 'age' ? ' selected' : '') + '>Sort: age</option><option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Sort: name</option></select>'
        + '<label>' + rows.length + ' shown of ' + DATA.board_size + '</label></div>';
      h += '<table class="board"><thead><tr><th>#</th><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Age</th><th class="num">Implied value</th></tr></thead><tbody>'
        + rows.map(function (r) {
          return '<tr data-slug="' + esc(r.slug) + '"' + (sel && sel.slug === r.slug ? ' class="sel"' : '') + '><td>' + r.rank + '</td><td><button class="link" data-slug="' + esc(r.slug) + '">' + esc(r.name) + '</button><br><span class="note">' + esc(r.slug) + '</span> ' + (r.watchlist ? '<span class="tag watch">watchlist</span>' : '<span class="tag early">early</span>') + '</td><td>' + esc(r.category || 'Uncategorized') + '</td><td>' + r.chains.map(esc).join(', ') + '</td><td class="num">' + usd(r.tvl_usd) + '</td><td class="num ' + ((r.change_7d || 0) >= 0 ? 'pos' : 'neg') + '">' + pct(r.change_7d) + '</td><td class="num">' + age(r.age_days) + '</td><td class="num"><b>' + usd(r.implied_value_usd) + '</b></td></tr>';
        }).join('') + '</tbody></table>';
    } else {
      h += '<p class="note">Live tokens already trade, so the board shows the market&rsquo;s own value for them &mdash; market cap, not a model. They are the comparables the category multiples are calibrated from.</p>'
        + '<table class="board"><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Mcap / TVL</th><th class="num">7d</th></tr></thead><tbody>'
        + DATA.live.map(function (l) {
          return '<tr><td><b>' + esc(l.name) + '</b><br><span class="note">' + esc(l.slug) + '</span></td><td>' + esc(l.category || 'Uncategorized') + '</td><td>' + l.chains.map(esc).join(', ') + '</td><td class="num">' + usd(l.tvl_usd) + '</td><td class="num">' + usd(l.mcap_usd) + '</td><td class="num">' + (l.mcap_tvl === null ? 'n/a' : l.mcap_tvl.toFixed(2) + '&times;') + '</td><td class="num ' + ((l.change_7d || 0) >= 0 ? 'pos' : 'neg') + '">' + pct(l.change_7d) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    h += '<div class="model"><h2>How the value is worked out (model ' + esc(DATA.model_version) + ')</h2>'
      + '<p>Implied value = TVL &times; category multiple &times; growth &times; maturity &times; chain reach. Growth clamps the seven-day TVL change to &minus;50&hellip;+100% and weighs it 0.75. Maturity runs 0.65 for a brand-new protocol to 1.15 after three years with no token (unknown age counts as one year). Chain reach adds 0.03 per extra chain, up to 10. The multiples below are computed from this snapshot&rsquo;s live protocols on every run &mdash; a fresh snapshot recalibrates the model, so the radar finds future launches early instead of reading a hand-kept list.</p>'
      + '<table><tr><th>Category</th><th>Live comparables</th><th>Median mcap / TVL</th><th>Multiple used</th></tr>'
      + cal.rows.slice(0, 8).map(function (r) { return '<tr><td>' + esc(r.category) + '</td><td>' + r.live_count + '</td><td>' + (r.median === null ? 'n/a' : r.median.toFixed(3)) + '</td><td>' + r.multiple.toFixed(3) + ' (' + r.source + ')</td></tr>'; }).join('')
      + '</table><p>Market median over all live protocols: ' + cal.overall_median.toFixed(3) + '. Source: DefiLlama protocols snapshot, ' + esc(DATA.source) + '.</p></div>';
    h += '<footer>Token Radar, model ' + esc(DATA.model_version) + ' &middot; snapshot ' + esc(DATA.as_of) + ' &middot; ' + DATA.board_size + ' rows, watchlist ' + DATA.watchlist_size + ' &middot; Implied values are this radar&rsquo;s own claim, never a promise that a token is issued. A protocol &ldquo;records no token&rdquo; when DefiLlama records none for it.</footer></div>';
    app.innerHTML = h;
    app.setAttribute('aria-busy', 'false');
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; render(); var nq = document.getElementById('q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } });
    var cat = document.getElementById('category');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; render(); });
    var ch = document.getElementById('chain');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; render(); });
    var so = document.getElementById('sort');
    if (so) so.addEventListener('change', function () { state.sort = so.value; render(); });
    app.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); state.selected = null; render(); }); });
    app.querySelectorAll('[data-slug]').forEach(function (el) { el.addEventListener('click', function () { state.selected = el.getAttribute('data-slug'); render(); window.scrollTo(0, 0); }); });
    app.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { state.selected = null; render(); }); });
  }
  readHash();
  render();
})();
