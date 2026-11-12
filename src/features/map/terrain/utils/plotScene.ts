/**
 * The 3D model's scene: the block of land (plotModel) on a pale table, lit
 * softly from the north-west with real shadows, and the house at the best
 * spot. Built once; `setStretch` and `setSurface` change it in place.
 */
import * as THREE from 'three';
import type { TerrainAnalysis } from '../types';
import { houseAxis } from './house';
import { createHouseModel, houseRotationY } from './houseModel3d';
import { MODEL_SIZE, plotTerrain, sideMesh, surfaceAt, surfaceMesh, toModel, type PlotTerrain } from './plotModel';

const TOPSOIL = new THREE.Color('#3e3127');
const EARTH = new THREE.Color('#9a7656');
const EARTH_DEEP = new THREE.Color('#6b5141');

export interface PlotScene {
  scene: THREE.Scene;
  terrain: PlotTerrain;
  /** Where the camera looks: the middle of the block, half-way up. */
  target: THREE.Vector3;
  /** The top of the house's roof, for the label (null without a best spot). */
  labelAnchor: THREE.Vector3 | null;
  setStretch: (exaggeration: number) => void;
  setSurface: (picture: HTMLCanvasElement) => void;
  dispose: () => void;
}

function geometry(positions: Float32Array, indices: Uint32Array, uvs?: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (uvs) g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  return g;
}

function texture(picture: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(picture);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

export function createPlotScene(analysis: TerrainAnalysis, picture: HTMLCanvasElement, exaggeration: number, anisotropy: number): PlotScene {
  const { grid, buildSpot } = analysis;
  const terrain = plotTerrain(grid);
  const scene = new THREE.Scene();

  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d3c7', 1.25));
  const sun = new THREE.DirectionalLight('#ffffff', 2.4);
  sun.position.set(-9, 16, -7); // high in the north-west, as on printed maps
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = MODEL_SIZE * 0.85;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const table = new THREE.Mesh(new THREE.PlaneGeometry(MODEL_SIZE * 8, MODEL_SIZE * 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  const top = surfaceMesh(terrain, exaggeration);
  const surfaceMaterial = new THREE.MeshStandardMaterial({ map: texture(picture, anisotropy), roughness: 0.92 });
  const surface = new THREE.Mesh(geometry(top.positions, top.indices, top.uvs), surfaceMaterial);
  surface.castShadow = true;
  surface.receiveShadow = true;
  scene.add(surface);

  const sides = sideMesh(terrain, exaggeration);
  const colours = new Float32Array(sides.depth.length * 3);
  sides.depth.forEach((d, i) => colours.set((d === 2 ? TOPSOIL : d === 1 ? EARTH : EARTH_DEEP).toArray(), i * 3));
  const sideGeometry = geometry(sides.positions, sides.indices);
  sideGeometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const side = new THREE.Mesh(sideGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  side.castShadow = true;
  side.receiveShadow = true;
  scene.add(side);

  let house: THREE.Group | null = null;
  let at = { x: 0, z: 0 };
  if (buildSpot) {
    house = createHouseModel();
    at = toModel(terrain, grid, buildSpot);
    house.scale.setScalar(terrain.scale);
    // Front door downhill; on level ground, facing south for the sun.
    house.rotation.y = houseRotationY(houseAxis(buildSpot)) + (buildSpot.downhill === null ? Math.PI : 0);
    scene.add(house);
  }
  const labelAnchor = house ? new THREE.Vector3() : null;
  const target = new THREE.Vector3();

  const setStretch = (stretch: number) => {
    const t = surfaceMesh(terrain, stretch);
    (surface.geometry.getAttribute('position') as THREE.BufferAttribute).copyArray(t.positions).needsUpdate = true;
    surface.geometry.computeVertexNormals();
    surface.geometry.computeBoundingSphere();
    const s = sideMesh(terrain, stretch);
    (side.geometry.getAttribute('position') as THREE.BufferAttribute).copyArray(s.positions).needsUpdate = true;
    side.geometry.computeVertexNormals();
    side.geometry.computeBoundingSphere();
    let highest = 0;
    for (let i = 1; i < t.positions.length; i += 3) highest = Math.max(highest, t.positions[i]);
    target.set(0, highest / 2, 0);
    if (house && labelAnchor) {
      const ground = surfaceAt(terrain, at.x, at.z, stretch);
      house.position.set(at.x, ground, at.z);
      labelAnchor.set(at.x, ground + 6.2 * terrain.scale, at.z);
    }
  };
  setStretch(exaggeration);

  return {
    scene,
    terrain,
    target,
    labelAnchor,
    setStretch,
    setSurface: (next) => {
      surfaceMaterial.map?.dispose();
      surfaceMaterial.map = texture(next, anisotropy);
      surfaceMaterial.needsUpdate = true;
    },
    dispose: () => {
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => { m.map?.dispose(); m.dispose(); });
      });
    },
  };
}
