import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePDB, formatTime } from './protein.js';
for(const [id,count] of [['1CRN',46],['1UBQ',76]])test(`${id}: resolves first protein chain and secondary structure`,()=>{const p=parsePDB(readFileSync(new URL(`../public/structures/${id}.pdb`,import.meta.url),'utf8'),id);assert.equal(p.residues.length,count);assert.equal(p.chain,'A');assert.ok(p.residues.some(r=>r.type==='helix'));assert.ok(p.residues.some(r=>r.type==='sheet'));assert.equal(p.gaps.length,0);assert.ok(p.residues.every(r=>r.xyz.every(Number.isFinite)));});
test('rejects non-protein content',()=>assert.throws(()=>parsePDB('<html>Not found</html>'),/No playable/));
test('ignores additional models and alternate locations',()=>{const pdb=readFileSync(new URL('../public/structures/1CRN.pdb',import.meta.url),'utf8');assert.equal(parsePDB(pdb+'\nENDMDL\n'+pdb).residues.length,46);});
test('formats race timer',()=>assert.equal(formatTime(74.125),'01:14.13'));
