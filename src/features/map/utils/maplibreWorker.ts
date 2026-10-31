// Points MapLibre at its web worker. MapLibre 6 looks for the worker file next
// to its own module, which a bundler moves and renames, so the 3D map would
// stall loading tiles. `?url` makes Vite emit the (self-contained) worker as an
// asset and hands back its final URL. Import this before creating a map.
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(workerUrl);
