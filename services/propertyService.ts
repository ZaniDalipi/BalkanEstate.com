import type { MunicipalityData } from '../types';

export const MUNICIPALITY_DATA: Record<string, MunicipalityData[]> = {
    "Serbia": [
        {
            name: "Belgrade",
            settlements: [
                { name: "Stari Grad", lat: 44.82, lng: 20.46 },
                { name: "Novi Beograd", lat: 44.81, lng: 20.41 },
                { name: "Zemun", lat: 44.84, lng: 20.37 },
            ]
        },
        {
            name: "Zlatibor",
            settlements: [
                { name: "Zlatibor", lat: 43.72, lng: 19.70 },
                { name: "Čajetina", lat: 43.75, lng: 19.71 },
            ]
        }
    ],
    "Croatia": [
        {
            name: "Zagreb",
            settlements: [
                { name: "Donji Grad", lat: 45.81, lng: 15.97 },
                { name: "Gornji Grad - Medveščak", lat: 45.82, lng: 15.97 },
            ]
        },
        {
            name: "Split",
            settlements: [
                { name: "Grad", lat: 43.51, lng: 16.44 },
                { name: "Marjan", lat: 43.52, lng: 16.42 },
            ]
        }
    ],
    "Bosnia and Herzegovina": [
        {
            name: "Sarajevo",
            settlements: [
                { name: "Stari Grad", lat: 43.86, lng: 18.43 },
                { name: "Centar", lat: 43.86, lng: 18.41 },
            ]
        }
    ],
    "Slovenia": [
        {
            name: "Ljubljana",
            settlements: [
                { name: "Center", lat: 46.05, lng: 14.50 },
                { name: "Šiška", lat: 46.07, lng: 14.48 },
            ]
        }
    ],
    "North Macedonia": [
        {
            name: "Skopje",
            settlements: [
                { name: "Centar", lat: 41.99, lng: 21.43 },
                { name: "Aerodrom", lat: 41.98, lng: 21.47 },
            ]
        }
    ],
    "Montenegro": [
        {
            name: "Podgorica",
            settlements: [
                { name: "Centar", lat: 42.44, lng: 19.26 },
            ]
        },
        {
            name: "Budva",
            settlements: [
                { name: "Budva", lat: 42.28, lng: 18.84 },
            ]
        }
    ],
    "Albania": [
        {
            name: "Tirana",
            settlements: [
                { name: "Tirana", lat: 41.32, lng: 19.81 },
            ]
        }
    ],
    "Bulgaria": [
        {
            name: "Sofia",
            settlements: [
                { name: "Sofia", lat: 42.69, lng: 23.32 },
            ]
        }
    ],
    "Greece": [
        {
            name: "Athens",
            settlements: [
                { name: "Athens", lat: 37.98, lng: 23.72 },
            ]
        }
    ],
    "Kosovo": [
        {
            name: "Pristina",
            settlements: [
                { name: "Pristina", lat: 42.66, lng: 21.16 },
            ]
        }
    ],
};
