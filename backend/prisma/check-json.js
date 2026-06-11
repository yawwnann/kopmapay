const data = require('./data_anggota_fix.json');
const nims = ['1800015089','1800033040','1800005044','2000006018','2300032044','2200011269','2200011188','2300036028','2200011078','2200032043','2200011086','2200011018','2300011195','2300011423','2200012091'];
nims.forEach(nim => {
  const u = data.find(a => a.nim === nim);
  if (u === undefined) { console.log('NOT FOUND:', nim); return; }
  const pokok = parseInt(u['simpanan_pokok']) || 0;
  let wajib = 0;
  if (u['simpanan_wajib']) {
    Object.keys(u['simpanan_wajib']).forEach(y => Object.keys(u['simpanan_wajib'][y]).forEach(m => {
      const v = u['simpanan_wajib'][y][m];
      if (v && v.nominal) wajib += parseInt(v.nominal);
    }));
  }
  let sukarelaNet = 0, last = 0;
  const ss = u['simpanan_sukarela'] || [];
  ss.forEach(s => {
    const curr = parseInt(s.saldo) || 0;
    const diff = curr - last;
    if (diff > 0) sukarelaNet += diff;
    else if (diff < 0) sukarelaNet -= Math.abs(diff);
    last = curr;
  });
  const total = pokok + wajib + sukarelaNet;
  console.log(u.nama, '| pokok:', pokok, '| wajib:', wajib, '| sukarelaNet:', sukarelaNet, '| TOTAL:', total);
});
