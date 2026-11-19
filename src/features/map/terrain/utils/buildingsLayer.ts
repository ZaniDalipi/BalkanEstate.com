/**
 * The buildings round the plot in the 3D scene: plastered walls with windows
 * and tile or concrete roofs (see buildingsMesh), casting shadows, rebuilt
 * when the ground is stretched so they keep standing on it.
 */
import * as THREE from 'three';
import type { ElevationGrid } from '../types';
import type { Building } from './buildingFootprints';
import { buildingsMesh, type MeshPart } from './buildingsMesh';
import type { PlotTerrain } from './plotModel';
import { createWindowTexture } from './windowTexture';

export interface BuildingsLayer {
  mesh: THREE.Group;
  show: (buildings: Building[] | null) => void;
  stretch: (exaggeration: number) => void;
}

function geometryOf(part: MeshPart, uvs?: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(part.colors, 3));
  if (uvs) g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  // Vertices are not shared, so the normals come out flat: crisp walls and roof planes.
  g.computeVertexNormals();
  return g;
}

export function createBuildingsLayer(terrain: PlotTerrain, ground: ElevationGrid, exaggeration: number, anisotropy = 1): BuildingsLayer {
  const walls = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, map: createWindowTexture(anisotropy), roughness: 0.9, side: THREE.DoubleSide }),
  );
  const roofs = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }),
  );
  const group = new THREE.Group();
  for (const m of [walls, roofs]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  group.visible = false;
  let shown: Building[] | null = null;
  let stretch = exaggeration;

  const shape = () => {
    group.visible = Boolean(shown?.length);
    if (!shown?.length) return;
    const m = buildingsMesh(terrain, ground, shown, stretch);
    walls.geometry.dispose();
    walls.geometry = geometryOf(m.walls, m.walls.uvs);
    roofs.geometry.dispose();
    roofs.geometry = geometryOf(m.roofs);
  };

  return {
    mesh: group,
    show: (buildings) => { shown = buildings; shape(); },
    stretch: (next) => { stretch = next; shape(); },
  };
}
