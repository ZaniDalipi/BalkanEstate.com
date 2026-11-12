/**
 * The house for the 3D model: white walls under a dark pitched roof, with
 * windows and a door, at true size (see house.ts for size and siting). A
 * three.js group in metres; the scene scales and places it.
 */
import * as THREE from 'three';
import { HOUSE } from './house';

const WALL = new THREE.Color('#f5f5f7');
const ROOF = new THREE.Color('#3d3d42');
const GLASS = new THREE.Color('#2a3340');
const DOOR = new THREE.Color('#6b5444');

function roofSlope(length: number, eaveY: number, ridgeY: number, eaveZ: number): THREE.BufferGeometry {
  const hl = length / 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -hl, eaveY, eaveZ, hl, eaveY, eaveZ, hl, ridgeY, 0,
    -hl, eaveY, eaveZ, hl, ridgeY, 0, -hl, ridgeY, 0,
  ], 3));
  g.computeVertexNormals();
  return g;
}

function gable(x: number, halfWidth: number, wallY: number, ridgeY: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x, wallY, -halfWidth, x, wallY, halfWidth, x, ridgeY, 0], 3));
  g.computeVertexNormals();
  return g;
}

/**
 * The house in metres: long side along +x, front (door side) towards −z,
 * standing on y = 0 with footings below it so it sits on sloping ground.
 */
export function createHouseModel(): THREE.Group {
  const { lengthM: L, widthM: W, wallM, roofM, overhangM, footingM } = HOUSE;
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: ROOF, roughness: 0.7, side: THREE.DoubleSide });
  const gableMat = new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.85, side: THREE.DoubleSide });
  const glassMat = new THREE.MeshStandardMaterial({ color: GLASS, roughness: 0.25, metalness: 0.1 });
  const doorMat = new THREE.MeshStandardMaterial({ color: DOOR, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(L, wallM + footingM, W), wallMat);
  body.position.y = (wallM - footingM) / 2;
  group.add(body);

  const ridgeY = wallM + roofM;
  const eaveY = wallM - overhangM * (roofM / (W / 2));
  for (const side of [-1, 1]) {
    group.add(new THREE.Mesh(roofSlope(L + 2 * overhangM, eaveY, ridgeY, side * (W / 2 + overhangM)), roofMat));
    group.add(new THREE.Mesh(gable((side * L) / 2, W / 2, wallM, ridgeY), gableMat));
  }

  const pane = (w: number, h: number, x: number, y: number, z: number, rotY: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    group.add(m);
  };
  const front = -W / 2 - 0.03;
  const back = W / 2 + 0.03;
  pane(2.6, 1.4, -3.2, 1.6, front, 0, glassMat);
  pane(1.1, 2.2, 0.8, 1.1, front, 0, doorMat);
  pane(1.6, 1.4, 3.8, 1.6, front, 0, glassMat);
  for (const x of [-3.8, 0, 3.8]) pane(1.4, 1.3, x, 1.65, back, 0, glassMat);
  for (const side of [-1, 1]) pane(1.4, 1.3, side * (L / 2 + 0.03), 1.65, 0, Math.PI / 2, glassMat);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

/** Turn the house so its long side runs along a compass bearing (x east, z south). */
export const houseRotationY = (axisBearingDeg: number): number => ((90 - axisBearingDeg) * Math.PI) / 180;
