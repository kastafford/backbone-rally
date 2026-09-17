import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMarbleFace } from './marble-face.js';

const view = () => ({ camera: new THREE.PerspectiveCamera(), position: new THREE.Vector3(), lookTarget: new THREE.Vector3(1, 2, -7) });
test('fall overrides a pickup celebration; reactions expire and reset clears them', () => {
  const face = createMarbleFace(), context = view();
  face.react('happy', 1.6);
  face.update(.1, context);
  assert.equal(face.group.userData.mood, 'happy');
  face.update(.1, { ...context, falling: true });
  assert.equal(face.group.userData.mood, 'sad');
  face.react('sad', 2.5);
  face.update(1, context);
  assert.equal(face.group.userData.mood, 'sad'); // Visible after checkpoint respawn.
  face.update(2, context);
  assert.equal(face.group.userData.mood, 'smile');
  face.react('bump');face.reset();face.update(0, context);
  assert.equal(face.group.userData.mood, 'smile');
});
test('pause freezes a bump reaction; airborne and boost expressions recover naturally', () => {
  const face = createMarbleFace(), context = view();
  face.react('bump', .5);
  for(let i=0;i<120;i++) face.update(0, context);
  assert.equal(face.group.userData.mood, 'bump');
  face.update(.6, { ...context, jumping: true });
  assert.equal(face.group.userData.mood, 'jump');
  face.update(.1, { ...context, boosting: true });
  assert.equal(face.group.userData.mood, 'happy');
  face.update(.1, context);
  assert.equal(face.group.userData.mood, 'smile');
});
