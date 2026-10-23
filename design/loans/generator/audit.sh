#!/bin/zsh
# usage: audit.sh [Name ...] — reports cards side by side that don't end level, and empty space inside cards, per board.
G=${0:A:h}
D=${G:h}
mkdir -p $G/out/measure
names=("$@")
if [ ${#names} -eq 0 ]; then names=($(cd $D && ls Loans*.dc.html | sed 's/.dc.html//' | grep -v -E 'Readme|Forms')); fi
python3 - "$G" "$D" "${names[@]}" <<'PY'
import json, sys
G, D, *names = sys.argv[1:]
h = json.load(open(f"{G}/heights.json"))
js = open(f"{G}/audit.js").read()
jobs = [{"url": f"file://{D}/{n}.dc.html", "w": 1600, "h": h.get(f"{n}.dc.html", 1500), "wait": 900, "eval": "1", "collect": js} for n in names]
json.dump(jobs, open(f"{G}/out/measure/audit.json", "w"))
PY
node $G/cdp.mjs $G/out/measure/audit.json | python3 -c "
import json,sys
for r in json.loads(sys.stdin.read().strip().split('\n')[-1]):
  n=r['url'].split('/')[-1].replace('.dc.html','')
  v=r.get('value') or []
  print(('OK   ' if not v else 'FIX  ')+n)
  for x in (v if isinstance(v,list) else [v]): print('      '+x)
"
