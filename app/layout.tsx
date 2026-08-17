/* ===== PSSA Mission Control — Space Theme ===== */
/* Add this to the BOTTOM of your existing app/globals.css — don't replace
   what's already there, Tailwind's own setup needs to stay at the top. */

:root{
  --void: #0a0e1f;
  --void-2: #10152c;
  --panel: #141a36;
  --panel-edge: #232b52;
  --star: #f2f0e8;
  --star-dim: #a7adc9;
  --solar: #f2a65a;
  --solar-dim: #c98a49;
  --nebula: #8b6ff0;
  --thruster: #4fd1c5;
  --alert: #f0605a;
}

body{
  background: radial-gradient(ellipse at 20% 0%, #1a2148 0%, var(--void) 55%);
  color: var(--star);
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.app{ max-width:900px; margin:0 auto; padding:28px 20px 60px; }

.panel{
  background: linear-gradient(180deg, var(--panel), var(--void-2));
  border:1px solid var(--panel-edge);
  border-radius:16px;
  padding:32px;
  box-shadow: 0 20px 60px rgba(0,0,0,.35);
}
.eyebrow{
  font-family:'JetBrains Mono', monospace; font-size:11px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--thruster); margin-bottom:10px; display:block;
}
h2{ font-family:'Orbitron', sans-serif; font-size:26px; font-weight:700; margin-bottom:6px; line-height:1.25; }
.sub{ color:var(--star-dim); font-size:15px; margin-bottom:22px; line-height:1.5; }

.btn{
  font-family:'Inter', sans-serif; font-weight:800; font-size:15px; border:none; border-radius:12px;
  padding:14px 26px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px;
}
.btn-primary{ background: linear-gradient(135deg, var(--solar), var(--solar-dim)); color:var(--void); }
.btn-ghost{ background:transparent; border:1px solid var(--panel-edge); color:var(--star); }
.btn-full{ width:100%; }
.btn:disabled{ opacity:.4; cursor:not-allowed; }

.stat-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
.stat-card{ background:var(--void); border:1px solid var(--panel-edge); border-radius:14px; padding:22px; }
.stat-card .label{ font-family:'JetBrains Mono', monospace; font-size:13px; text-transform:uppercase; color:var(--star-dim); margin-bottom:10px; }
.stat-card .value{ font-family:'Orbitron', sans-serif; font-size:36px; font-weight:700; }
.stat-card .value.good{ color:var(--thruster); }
.stat-card .value.warn{ color:var(--solar); }

.banner{ border-radius:14px; padding:22px 24px; margin-bottom:20px; font-size:17px; font-weight:600; line-height:1.5; }
.banner .banner-title{ font-family:'Orbitron', sans-serif; font-size:15px; font-weight:700; display:block; margin-bottom:8px; }
.banner.success{ background:rgba(79,209,197,.1); border:1px solid rgba(79,209,197,.35); color:var(--thruster); }
.banner.encourage{ background:rgba(242,166,90,.1); border:1px solid rgba(242,166,90,.35); color:var(--star); }

