/**
 * The buildings round the plot in the 3D scene: one mesh, pale like an
 * architect's model so the plot stays what the eye goes to, rebuilt when the
 * ground is stretched so they keep standing on it.
 */
import * as THREE from 'three';
import type { ElevationGrid } from '../types';
import type { Building } from './buildingFootprints';
import { buildingsMesh } from './buildingsMesh';
import type { PlotTerrain } from './plotModel';

const COLOUR = '#f2eee8';

export interface BuildingsLayer {
  mesh: THREE.Mesh;
  show: (buildings: Building[] | null) => void;
  stretch: (exaggeration: number) => void;
}

export function createBuildingsLayer(terrain: PlotTerrain, ground: ElevationGrid, exaggeration: number): BuildingsLayer {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: COLOUR, roughness: 0.85, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = false;
  let shown: Building[] | null = null;
  let stretch = exaggeration;

  const shape = () => {
    mesh.visible = Boolean(shown?.length);
    if (!shown?.length) return;
    const m = buildingsMesh(terrain, ground, shown, stretch);
    // Vertices are not shared, so the normals come out flat: crisp walls and roofs.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geometry.computeVertexNormals();
    mesh.geometry.dispose();
    mesh.geometry = geometry;
  };

  return {
    mesh,
    show: (buildings) => { shown = buildings; shape(); },
    stretch: (next) => { stretch = next; shape(); },
  };
}
