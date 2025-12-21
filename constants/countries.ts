import L from 'leaflet';

export interface CountryData {
    name: string;
    code: string;
    bounds: L.LatLngBoundsExpression;
    center: [number, number];
    zoom: number;
}

export const BALKAN_COUNTRIES: Record<string, CountryData> = {
    albania: {
        name: 'Albania',
        code: 'AL',
        bounds: [[39.5, 19.2], [42.7, 21.1]],
        center: [41.1, 20.1],
        zoom: 8,
    },
    'bosnia-herzegovina': {
        name: 'Bosnia and Herzegovina',
        code: 'BA',
        bounds: [[42.5, 15.7], [45.3, 19.6]],
        center: [43.9, 17.7],
        zoom: 8,
    },
    bulgaria: {
        name: 'Bulgaria',
        code: 'BG',
        bounds: [[41.2, 22.3], [44.2, 28.6]],
        center: [42.7, 25.5],
        zoom: 7,
    },
    croatia: {
        name: 'Croatia',
        code: 'HR',
        bounds: [[42.3, 13.4], [46.6, 19.4]],
        center: [44.5, 16.4],
        zoom: 7,
    },
    greece: {
        name: 'Greece',
        code: 'GR',
        bounds: [[34.8, 19.3], [41.7, 28.3]],
        center: [38.2, 23.8],
        zoom: 7,
    },
    kosovo: {
        name: 'Kosovo',
        code: 'XK',
        bounds: [[41.8, 20.0], [43.3, 21.8]],
        center: [42.6, 20.9],
        zoom: 9,
    },
    montenegro: {
        name: 'Montenegro',
        code: 'ME',
        bounds: [[41.8, 18.4], [43.6, 20.4]],
        center: [42.7, 19.4],
        zoom: 9,
    },
    'north-macedonia': {
        name: 'North Macedonia',
        code: 'MK',
        bounds: [[40.8, 20.4], [42.4, 23.0]],
        center: [41.6, 21.7],
        zoom: 8,
    },
    romania: {
        name: 'Romania',
        code: 'RO',
        bounds: [[43.6, 20.2], [48.3, 29.7]],
        center: [46.0, 25.0],
        zoom: 7,
    },
    serbia: {
        name: 'Serbia',
        code: 'RS',
        bounds: [[42.2, 18.8], [46.2, 23.0]],
        center: [44.2, 20.9],
        zoom: 7,
    },
    slovenia: {
        name: 'Slovenia',
        code: 'SI',
        bounds: [[45.4, 13.4], [46.9, 16.6]],
        center: [46.1, 15.0],
        zoom: 8,
    },
};

export const COUNTRY_OPTIONS = [
    { value: 'any', label: 'All Countries' },
    ...Object.entries(BALKAN_COUNTRIES).map(([key, country]) => ({
        value: key,
        label: country.name,
    })),
];
