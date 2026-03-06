import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface PropertyCardData {
    id: string;
    title?: string;
    address: string;
    city: string;
    country: string;
    price: number;
    currency?: string;
    beds: number;
    baths: number;
    sqft: number;
    imageUrl: string;
    isPromoted?: boolean;
    promotionTier?: string;
    hasDiscount?: boolean;
    createdAt?: number;
}

interface StackedPropertyCardProps {
    property: PropertyCardData;
    index: number;
    totalCards: number;
    color: string;
    onClick: () => void;
}

const CARD_COLORS = [
    'rgba(2, 82, 205, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(14, 165, 233, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
];

const StackedPropertyCard: React.FC<StackedPropertyCardProps> = ({ property, index, totalCards, color, onClick }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const formatPrice = (price: number, currency?: string) => {
        const symbol = currency === 'USD' ? '$' : '€';
        return `${symbol}${price.toLocaleString()}`;
    };

    useEffect(() => {
        const card = cardRef.current;
        const container = containerRef.current;
        if (!card || !container) return;

        const targetScale = 1 - (totalCards - index) * 0.05;

        gsap.set(card, {
            scale: 1,
            transformOrigin: "center top"
        });

        const trigger = ScrollTrigger.create({
            trigger: container,
            start: "top center",
            end: "bottom center",
            scrub: 1,
            onUpdate: (self) => {
                const progress = self.progress;
                const scale = gsap.utils.interpolate(1, targetScale, progress);
                gsap.set(card, {
                    scale: Math.max(scale, targetScale),
                    transformOrigin: "center top"
                });
            }
        });

        return () => {
            trigger.kill();
        };
    }, [index, totalCards]);

    return (
        <div
            ref={containerRef}
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'sticky',
                top: 0
            }}
        >
            <div
                ref={cardRef}
                onClick={onClick}
                style={{
                    position: 'relative',
                    width: '70%',
                    maxWidth: '900px',
                    height: '450px',
                    borderRadius: '24px',
                    isolation: 'isolate',
                    top: `calc(-5vh + ${index * 25}px)`,
                    transformOrigin: 'top',
                    cursor: 'pointer'
                }}
            >
                {/* Electric Border Effect */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-3px',
                        borderRadius: '27px',
                        padding: '3px',
                        background: `conic-gradient(
                            from 0deg,
                            transparent 0deg,
                            ${color} 60deg,
                            ${color.replace('0.8', '0.6')} 120deg,
                            transparent 180deg,
                            ${color.replace('0.8', '0.4')} 240deg,
                            transparent 360deg
                        )`,
                        zIndex: -1
                    }}
                />

                {/* Main Card Content */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    borderRadius: '24px',
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(245, 247, 250, 0.9))',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: `
                        0 8px 32px rgba(0, 0, 0, 0.08),
                        0 2px 8px rgba(0, 0, 0, 0.04),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8)
                    `,
                    overflow: 'hidden'
                }}>
                    {/* Property Image */}
                    <div style={{
                        width: '45%',
                        height: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src={property.imageUrl}
                            alt={property.title || property.address}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            loading="lazy"
                        />
                        {/* Image overlay gradient */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '40%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                            pointerEvents: 'none'
                        }} />
                        {/* Badges */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            display: 'flex',
                            gap: '6px'
                        }}>
                            {property.isPromoted && property.promotionTier && property.promotionTier !== 'standard' && (
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: '#f59e0b',
                                    color: '#fff'
                                }}>
                                    Promoted
                                </span>
                            )}
                            {property.createdAt && Date.now() - property.createdAt < 7 * 24 * 60 * 60 * 1000 && (
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: '#10b981',
                                    color: '#fff'
                                }}>
                                    New
                                </span>
                            )}
                        </div>
                        {/* Price on image */}
                        <div style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '12px',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: '#fff',
                            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                            {formatPrice(property.price, property.currency)}
                        </div>
                    </div>

                    {/* Property Details */}
                    <div style={{
                        width: '55%',
                        padding: '2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <h2 style={{
                            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                            fontWeight: 700,
                            color: '#0f172a',
                            marginBottom: '0.5rem',
                            lineHeight: 1.3
                        }}>
                            {property.title || property.address}
                        </h2>
                        <p style={{
                            fontSize: '0.9rem',
                            color: '#64748b',
                            marginBottom: '1.5rem'
                        }}>
                            {property.city}, {property.country}
                        </p>

                        {/* Property stats */}
                        <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: 'rgba(2, 82, 205, 0.06)',
                                minWidth: '70px'
                            }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{property.beds}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Beds</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: 'rgba(2, 82, 205, 0.06)',
                                minWidth: '70px'
                            }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{property.baths}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Baths</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: 'rgba(2, 82, 205, 0.06)',
                                minWidth: '70px'
                            }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{property.sqft}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>m²</span>
                            </div>
                        </div>

                        {/* View button */}
                        <button
                            style={{
                                alignSelf: 'flex-start',
                                padding: '0.625rem 1.5rem',
                                borderRadius: '12px',
                                background: '#0252CD',
                                color: '#fff',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#003A96')}
                            onMouseOut={(e) => (e.currentTarget.style.background = '#0252CD')}
                        >
                            View Property
                        </button>
                    </div>

                    {/* Glass shine effect */}
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        right: '10px',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)',
                        borderRadius: '1px',
                        pointerEvents: 'none'
                    }} />

                    {/* Side glass reflection */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '2px',
                        height: '100%',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, transparent 50%)',
                        borderRadius: '24px 0 0 24px',
                        pointerEvents: 'none'
                    }} />
                </div>
            </div>
        </div>
    );
};

interface StackedCardsProps {
    properties: PropertyCardData[];
    onPropertyClick: (property: PropertyCardData) => void;
    title?: string;
    subtitle?: string;
    onViewAll?: () => void;
}

export const StackedCards: React.FC<StackedCardsProps> = ({
    properties,
    onPropertyClick,
    title = 'Featured Properties',
    subtitle = 'Handpicked properties from top agents across the Balkans',
    onViewAll
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        gsap.fromTo(container,
            { opacity: 0 },
            {
                opacity: 1,
                duration: 1.2,
                ease: "power2.out"
            }
        );
    }, []);

    if (properties.length === 0) return null;

    return (
        <section ref={containerRef} style={{ background: '#ffffff' }}>
            {/* Section Header */}
            <div style={{
                maxWidth: '72rem',
                margin: '0 auto',
                padding: '3rem 1rem 0',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between'
            }}>
                <div>
                    <h2 style={{
                        fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                        fontWeight: 700,
                        color: '#0f172a'
                    }}>
                        {title}
                    </h2>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        marginTop: '0.25rem'
                    }}>
                        {subtitle}
                    </p>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#475569',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        View All Properties →
                    </button>
                )}
            </div>

            {/* Stacked Cards */}
            <div style={{ width: '100%' }}>
                {properties.slice(0, 6).map((property, index) => (
                    <StackedPropertyCard
                        key={property.id}
                        property={property}
                        index={index}
                        totalCards={Math.min(properties.length, 6)}
                        color={CARD_COLORS[index % CARD_COLORS.length]}
                        onClick={() => onPropertyClick(property)}
                    />
                ))}
            </div>
        </section>
    );
};
