import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default icon issue with bundlers
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyLocationMapProps {
    lat: number;
    lng: number;
    address: string;
}

const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({ lat, lng, address }) => {
    if (isNaN(lat) || isNaN(lng)) {
        return <div className="h-full bg-neutral-200 flex items-center justify-center text-neutral-500">Location data unavailable.</div>;
    }

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={15}
            scrollWheelZoom={false}
            className="w-full h-full rounded-lg"
            preferCanvas={true}
            updateWhenIdle={true}
            updateWhenZooming={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                keepBuffer={2}
                updateWhenIdle={true}
                updateWhenZooming={false}
                updateInterval={150}
            />
            <Marker position={[lat, lng]}>
                <Popup>
                    {address}
                </Popup>
            </Marker>
        </MapContainer>
    );
};

export default PropertyLocationMap;
