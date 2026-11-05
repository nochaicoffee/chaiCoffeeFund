// The picked design (J1): phone, states and forms need a few styles the page didn't.
export const FI5 = String.raw`
.notice.err { background: var(--loss-tint); color: var(--loss); } .notice.err b, .notice.err .grow { color: var(--loss); }
.notice.ok { background: var(--gain-tint); color: var(--gain); } .notice.ok b, .notice.ok .grow { color: var(--gain); }
.tsheet { background: var(--surface); border-radius: 26px 26px 0 0; padding: 12px 16px 20px; box-shadow: 0 -14px 40px oklch(0 0 0 / 0.22); display: flex; flex-direction: column; gap: 12px; } .grab { width: 40px; height: 4px; border-radius: 2px; background: var(--fill-strong); align-self: center; }
.toast { display: inline-flex; align-items: center; gap: 8px; align-self: center; padding: 12px 18px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 13px; font-weight: 700; margin-top: 4px; }
.dropz { border: 2px dashed var(--fill-strong); border-radius: 20px; padding: 30px 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; background: var(--fill); }
.dropz b { font-size: 15px; font-weight: 800; } .dropz small { font-size: 12px; font-weight: 600; color: var(--muted); }
.dropz.hot { border-color: var(--accent); background: var(--accent-tint); }
.ico { width: 46px; height: 46px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.rev { display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr; gap: 6px 12px; font-size: 12.5px; font-weight: 700; } .rev .h { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .rev .r { text-align: right; } .rev .bad { color: var(--loss); }
.rev > span { padding: 6px 0; border-bottom: 1px solid var(--divider); }
.chkl { display: grid; gap: 8px; } .chkl > div { display: grid; grid-template-columns: 22px 1fr; gap: 10px; align-items: start; padding: 10px 12px; border-radius: 14px; background: var(--fill); font-size: 12.5px; font-weight: 600; line-height: 1.45; } .chkl b { font-weight: 800; } .chkl .t { color: var(--gain); font-weight: 800; } .chkl .x { color: var(--loss); font-weight: 800; }
.chkl > div.bad { background: var(--loss-tint); }
/* On a phone the stage is one column and the doors slide sideways */
.ph .stg2 { padding: 18px 16px; gap: 14px; border-radius: 24px; } .ph .stg2 .s-grid { grid-template-columns: 1fr !important; gap: 16px; } .ph .s-big { font-size: 46px; } .ph .s-name { font-size: 20px; } .ph .s-tile .v { font-size: 17px; } .ph .s-chart { padding: 12px 10px 8px; } .ph .s-acts { flex-wrap: wrap; }
.ph .doors3 { display: flex; gap: 10px; overflow: hidden; margin-right: -16px; } .ph .doors3 .door { flex: 0 0 148px; min-height: 118px; padding: 12px; } .ph .doors3 .door .dv { font-size: 22px; } .ph .doors3 .door .ds { font-size: 10.5px; }
.ph .notes { grid-template-columns: 1fr; } .ph .dotrow { grid-template-columns: 52px repeat(12, minmax(0, 1fr)); gap: 3px; } .ph .cdot { width: 20px; height: 20px; font-size: 8.5px; }
.ph .statrow { grid-template-columns: 1fr 1fr; gap: 8px; } .ph .statrow > :nth-child(3) { grid-column: 1 / -1; } .ph .gp-chips .pkl { padding: 5px 10px; font-size: 12px; }
.pmi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; } .pmi > div { border-radius: 12px; padding: 8px 4px; text-align: center; font-size: 13px; font-weight: 800; line-height: 1.2; } .pmi small { display: block; font-size: 10px; font-weight: 800; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
.pdep { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider); } .pdep:last-child { border-bottom: 0; } .pdep .prog { grid-column: 2 / -1; }
.emp3 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.empk { border-radius: 22px; padding: 22px; display: flex; flex-direction: column; gap: 10px; color: #fff; }
.empk p { margin: 0; font-size: 13px; font-weight: 500; opacity: 0.85; line-height: 1.5; }
.rev-e .pen { display: inline-flex; margin-left: 8px; width: 20px; height: 20px; border-radius: 6px; background: var(--fill); align-items: center; justify-content: center; color: var(--muted); vertical-align: middle; }
.rev .typ { font-style: italic; background: oklch(0.97 0.03 85); } .rev em.tagb { font-style: normal; margin-left: 6px; }
.fixrow { border: 2px dashed var(--accent-edge); border-radius: 18px; padding: 14px 16px; display: grid; gap: 10px; background: var(--accent-tint); } .fr-h { font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 8px; } .fr-g { display: grid; grid-template-columns: 1.1fr 1.1fr 1fr 1fr; gap: 10px; }
.cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .cmp-c { border: 1.5px solid var(--fill-strong); border-radius: 16px; padding: 14px 16px; display: grid; gap: 3px; } .cmp-c.sel { border-color: var(--accent); background: var(--accent-tint); } .cmp-c .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .cmp-c b { font-size: 22px; font-weight: 800; } .cmp-c small { font-size: 12px; font-weight: 600; color: var(--muted); }
.rtab { display: grid; gap: 8px; } .rrow { display: grid; grid-template-columns: 70px 120px auto 1fr; gap: 12px; align-items: center; font-size: 13px; font-weight: 800; } .rrow small { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.cdot.typ { background: oklch(0.95 0.05 85); border: 2px dashed oklch(0.72 0.14 75); color: oklch(0.4 0.08 70); } .cdot.exp { background: transparent; border: 2px dashed var(--fill-strong); color: var(--muted); }
`;
