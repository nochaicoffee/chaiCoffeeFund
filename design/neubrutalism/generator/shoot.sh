#!/bin/zsh
# usage: shoot.sh A [B C D] — screenshots design/neubrutalism/Nb<X>_*.dc.html into generator/out/<X>.png (gitignored by out/).
G=${0:A:h}
D=${G:h}
mkdir -p $G/out
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
for n in "$@"; do
  f=$(ls $D/Nb${n}_*.dc.html)
  h=$(node -e "const c=require('$D/canvas.json');console.log(c.artboards.find(a=>a.file==='${f:t}').h)")
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=1440,$h --screenshot=$G/out/$n.png "file://$f" >/dev/null 2>&1
  echo "shot $n (${h}px) -> $G/out/$n.png"
done
