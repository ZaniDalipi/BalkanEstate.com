import React, { useState, useEffect } from 'react';
import Modal from '../../shared/Modal';
import { Property } from '../../../types';
import { formatPrice } from '../../../utils/currency';
import { BuildingOfficeIcon } from '../../../constants';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
}

const HighlightedCell: React.FC<{ children: React.ReactNode; isBest: boolean }> = ({ children, isBest }) => (
    <td className={`p-4 text-center align-top ${isBest ? 'bg-green-50 text-green-800 font-bold' : ''}`}>
        {children}
    </td>
);

const CompareModalImage: React.FC<{ property: Property }> = ({ property }) => {
    const [error, setError] = useState(false);
    useEffect(() => { setError(false); }, [property.imageUrl]);
    return (
        <>
            {error ? (
                <div className="w-full h-24 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-lg">
                    <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
                </div>
            ) : (
                <img src={property.imageUrl} alt={property.title || property.address} className="w-full h-24 object-cover rounded-lg" onError={() => setError(true)} />
            )}
            {property.title && (
                <p className="font-bold text-sm mt-2 truncate text-neutral-900">{property.title}</p>
            )}
            <p className={`text-sm ${property.title ? 'text-neutral-500' : 'font-semibold mt-2'} truncate`}>{property.address}, {property.city}</p>
        </>
    )
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, properties }) => {
    if (properties.length === 0) return null;

    const findBestValue = (key: keyof Property, direction: 'min' | 'max') => {
        const values = properties.map(p => p[key]).filter(v => typeof v === 'number') as number[];
        if (values.length === 0) return null;
        return direction === 'min' ? Math.min(...values) : Math.max(...values);
    };

    const bestPrice = findBestValue('price', 'min');
    const bestBeds = findBestValue('beds', 'max');
    const bestBaths = findBestValue('baths', 'max');
    const bestLivingRooms = findBestValue('livingRooms', 'max');
    const bestSqft = findBestValue('sqft', 'max');
    const bestYear = findBestValue('yearBuilt', 'max');
    const bestParking = findBestValue('parking', 'max');

    const rows = [
        { label: 'Price', key: 'price', bestValue: bestPrice, format: (p: Property) => formatPrice(p.price, p.country) },
        { label: 'Beds', key: 'beds', bestValue: bestBeds, format: (p: Property) => p.beds },
        { label: 'Baths', key: 'baths', bestValue: bestBaths, format: (p: Property) => p.baths },
        { label: 'Living Rooms', key: 'livingRooms', bestValue: bestLivingRooms, format: (p: Property) => p.livingRooms },
        { label: 'Area (m²)', key: 'sqft', bestValue: bestSqft, format: (p: Property) => p.sqft },
        { label: 'Year Built', key: 'yearBuilt', bestValue: bestYear, format: (p: Property) => p.yearBuilt },
        { label: 'Parking', key: 'parking', bestValue: bestParking, format: (p: Property) => p.parking },
        { label: 'Special Features', key: 'specialFeatures', format: (p: Property) => p.specialFeatures },
        { label: 'Materials', key: 'materials', format: (p: Property) => p.materials },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" title="Compare Properties">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-neutral-200">
                            <th className="p-4 text-left font-bold text-neutral-800 w-[15%] sticky left-0 bg-white z-10">Feature</th>
                            {properties.map(p => (
                                <th key={p.id} className="p-4 w-[21.25%]">
                                    <CompareModalImage property={p} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.label} className="border-b border-neutral-100 hover:bg-neutral-50">
                                <td className="p-4 font-semibold text-neutral-700 sticky left-0 bg-white hover:bg-neutral-50 z-10">{row.label}</td>
                                {properties.map(p => {
                                    const value = p[row.key as keyof Property];
                                    const displayValue = row.format(p);
                                    const isBest = row.bestValue !== undefined && value === row.bestValue;

                                    if(Array.isArray(displayValue)) {
                                      return (
                                        <td key={p.id} className="p-4 text-center text-sm align-top">
                                          <ul className="list-disc list-inside text-left space-y-1">
                                            {displayValue.length > 0 ? displayValue.map((item, index) => <li key={index}>{item}</li>) : '-'}
                                          </ul>
                                        </td>
                                      );
                                    }
                                    
                                    return (
                                        <HighlightedCell key={p.id} isBest={isBest}>
                                            <span className="text-sm">{displayValue}</span>
                                        </HighlightedCell>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default ComparisonModal;