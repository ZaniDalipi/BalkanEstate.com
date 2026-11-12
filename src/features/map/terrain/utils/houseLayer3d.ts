/**
 * Draws the house (see house.ts) into the 3D map as a real model — flat
 * walls, two roof slopes — at the best place to build: on the relief, or on
 * top of its block in the blocks view.
 * A MapLibre custom layer: a few lines of WebGL, no 3D library.
 */
import * as maplibregl from 'maplibre-gl';
import type { BuildSpot } from '../types';
import { HOUSE_VERTEX_SIZE, houseMesh, placeOnMap } from './house';

const VERTEX_SHADER = `
attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_matrix;
varying vec3 v_color;
void main() {
  v_color = a_color;
  gl_Position = u_matrix * vec4(a_position, 1.0);
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}`;

type GL = WebGLRenderingContext | WebGL2RenderingContext;

function compile(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function link(gl: GL): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

export const HOUSE_LAYER = 'terrain-house';

/**
 * A layer that draws the house at `spot`, standing at the height `standsAt`
 * gives (metres; null while unknown, and nothing is drawn). If the model
 * can't be set up it draws nothing.
 */
export function createHouseLayer(spot: BuildSpot, standsAt: (map: maplibregl.Map) => number | null): maplibregl.CustomLayerInterface {
  const mesh = houseMesh(spot);
  const at: [number, number] = [spot.lng, spot.lat];
  let map: maplibregl.Map | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;

  return {
    id: HOUSE_LAYER,
    type: 'custom',
    renderingMode: '3d',
    onAdd(owner, gl) {
      map = owner;
      program = link(gl);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    },
    render(gl, args) {
      if (!map || !program || !buffer) return;
      const ground = standsAt(map);
      if (ground === null) return;
      const origin = maplibregl.MercatorCoordinate.fromLngLat(at, ground);
      const matrix = placeOnMap(args.defaultProjectionData.mainMatrix, origin, origin.meterInMercatorCoordinateUnits());

      gl.useProgram(program);
      gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_matrix'), false, matrix);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const stride = HOUSE_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT;
      const position = gl.getAttribLocation(program, 'a_position');
      const color = gl.getAttribLocation(program, 'a_color');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(color);
      gl.vertexAttribPointer(color, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.length / HOUSE_VERTEX_SIZE);
    },
    onRemove(_owner, gl) {
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      program = null;
      buffer = null;
      map = null;
    },
  };
}
