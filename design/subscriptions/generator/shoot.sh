#!/bin/zsh
# usage: shoot.sh Name [Name...]  — screenshots design/subscriptions/<Name>.dc.html at its measured size into out/shots/<Name>.png
G=${0:A:h}
D=${G:h}
S=$G/out/shots
mkdir -p $S $G/out/measure
jobs="["
sep=""
for n in "$@"; do
  w=$(python3 -c "import json;print(1600 if not '$n'.endswith('Phone') else 390)")
  h=$(python3 -c "import json;print(json.load(open('$G/heights.json')).get('$n.dc.html',1200))")
  case $n in *Forms*|*States*|*Readme*) w=$(python3 -c "import json;c=json.load(open('$D/canvas.json'));print([a['w'] for a in c['artboards'] if a['file']=='$n.dc.html'][0])");; esac
  jobs="$jobs$sep{\"url\":\"file://$D/$n.dc.html\",\"w\":$w,\"h\":$h,\"out\":\"$S/$n.png\",\"wait\":1200}"
  sep=","
done
jobs="$jobs]"
echo $jobs > $G/out/measure/shot.json
node $G/cdp.mjs $G/out/measure/shot.json > /dev/null && echo done
