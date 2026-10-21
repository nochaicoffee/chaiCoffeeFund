#!/bin/zsh
# usage: audit.sh [Name[@pick] ...] — reports uneven cards in rows and empty space inside cards, per board.
# With no names, it checks every main board (not States, Forms, Charts or Readme) with All, HDFC, the stale and the closed account picked.
G=${0:A:h}
D=${G:h}
mkdir -p $G/out/measure
names=("$@")
if [ ${#names} -eq 0 ]; then for n in $(cd $D && ls Accounts*.dc.html | sed 's/.dc.html//' | grep -v -E 'States|Forms|Readme|Charts'); do for p in all hdfc sbi yes; do names+=("$n@$p"); done; done; fi
python3 - "$G" "$D" "${names[@]}" <<'PY'
import json, sys
G, D, *names = sys.argv[1:]
h = json.load(open(f"{G}/heights.json"))
js = open(f"{G}/audit.js").read()
jobs = []
for spec in names:
    n, _, pick = spec.partition("@")
    pre = f"(() => {{ const r = [...document.querySelectorAll('input.pk-in')].find((i) => i.id.endsWith('-sel-{pick}')); if (r) r.checked = true; }})();" if pick else ""
    jobs.append({"url": f"file://{D}/{n}.dc.html#{pick}", "w": 390 if n.endswith("Phone") else 1600, "h": h.get(f"{n}.dc.html", 1500), "wait": 900, "eval": pre or "1", "collect": js})
json.dump(jobs, open(f"{G}/out/measure/audit.json", "w"))
PY
node $G/cdp.mjs $G/out/measure/audit.json | python3 -c "
import json,sys
for r in json.loads(sys.stdin.read().strip().split('\n')[-1]):
  n=r['url'].split('/')[-1].replace('.dc.html','').replace('#','@')
  v=r.get('value') or []
  print(('OK   ' if not v else 'FIX  ')+n)
  for x in (v if isinstance(v,list) else [v]): print('      '+x)
"
