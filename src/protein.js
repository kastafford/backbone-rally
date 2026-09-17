// PDB fixed-width fields; first model, first protein chain, one CA per residue.
export function parsePDB(text, id = 'CUSTOM') {
  const residues = [], ranges = [], seen = new Set();
  let chain = null;
  for (const line of text.split(/\r?\n/)) {
    const record = line.slice(0, 6).trim();
    if (record === 'ENDMDL') break;
    if (record === 'HELIX') ranges.push({ type: 'helix', chain: line[19], start: +line.slice(21,25), end: +line.slice(33,37) });
    if (record === 'SHEET') ranges.push({ type: 'sheet', chain: line[21], start: +line.slice(22,26), end: +line.slice(33,37) });
    if (record !== 'ATOM' || line.slice(12,16).trim() !== 'CA' || ![' ', 'A'].includes(line[16])) continue;
    const xyz = [30,38,46].map(i => Number(line.slice(i,i+8)));
    if (!xyz.every(Number.isFinite)) continue;
    if (chain === null) chain = line[21];
    if (line[21] !== chain) continue;
    const key = line.slice(22,27);
    if (seen.has(key)) continue;
    seen.add(key);
    residues.push({ number: +line.slice(22,26), insertion: line[26].trim(), name: line.slice(17,20).trim(), xyz });
  }
  if (residues.length < 8) throw new Error('No playable protein chain found. Choose a structure with at least 8 resolved residues.');
  if (residues.length > 600) throw new Error('This prototype supports chains up to 600 residues. Try a smaller protein.');
  for (const r of residues) r.type = ranges.find(s => s.chain === chain && r.number >= s.start && r.number <= s.end)?.type || 'loop';
  const gaps = [];
  residues.forEach((r,i) => {
    if (i && Math.hypot(...r.xyz.map((v,k) => v-residues[i-1].xyz[k])) > 5.5) gaps.push(i);
  });
  return { id, chain: chain.trim() || '1', residues, gaps };
}
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2,'0')}:${(seconds % 60).toFixed(2).padStart(5,'0')}`;
}
