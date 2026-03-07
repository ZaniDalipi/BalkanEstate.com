import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';

gsap.registerPlugin(ScrollTrigger);

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [breakpoint]);
    return isMobile;
}

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
    livingRooms?: number;
    yearBuilt?: number;
    description?: string;
    listingType?: 'sale' | 'rent';
    imageUrl: string;
    isPromoted?: boolean;
    promotionTier?: string;
    hasDiscount?: boolean;
    originalPrice?: number;
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
    'rgba(2, 82, 205, 0.7)',
    'rgba(139, 92, 246, 0.7)',
    'rgba(14, 165, 233, 0.7)',
    'rgba(16, 185, 129, 0.7)',
    'rgba(245, 158, 11, 0.7)',
    'rgba(239, 68, 68, 0.7)',
];

const StackedPropertyCard: React.FC<StackedPropertyCardProps & { isMobile?: boolean }> = ({ property, index, totalCards, color, onClick, isMobile = false }) => {
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

        const targetScale = 1 - (totalCards - index) * 0.04;

        gsap.set(card, {
            scale: 1,
            transformOrigin: "center top"
        });

        const trigger = ScrollTrigger.create({
            trigger: container,
            start: "top center",
            end: "bottom center",
            scrub: 0.6,
            onUpdate: (self) => {
                const progress = self.progress;
                const scale = gsap.utils.interpolate(1, targetScale, progress);
                gsap.to(card, {
                    scale: Math.max(scale, targetScale),
                    transformOrigin: "center top",
                    duration: 0.3,
                    ease: "power2.out",
                    overwrite: true
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
                height: isMobile ? '70vh' : '100vh',
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
                    width: isMobile ? '92%' : '75%',
                    maxWidth: '960px',
                    height: isMobile ? 'auto' : '480px',
                    borderRadius: isMobile ? '20px' : '28px',
                    isolation: 'isolate',
                    top: `calc(-5vh + ${index * 25}px)`,
                    transformOrigin: 'top',
                    cursor: 'pointer'
                }}
            >
                {/* Liquid glass border glow */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-2px',
                        borderRadius: isMobile ? '22px' : '30px',
                        background: `linear-gradient(
                            135deg,
                            ${color} 0%,
                            ${color.replace('0.7', '0.3')} 30%,
                            transparent 50%,
                            ${color.replace('0.7', '0.2')} 70%,
                            ${color} 100%
                        )`,
                        zIndex: -1,
                        opacity: 0.8
                    }}
                />
                {/* Outer soft shadow for depth */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-1px',
                        borderRadius: isMobile ? '21px' : '29px',
                        boxShadow: `
                            0 20px 60px -10px ${color.replace('0.7', '0.15')},
                            0 8px 24px -4px rgba(0, 0, 0, 0.06)
                        `,
                        zIndex: -2,
                        pointerEvents: 'none'
                    }}
                />

                {/* Main Card — liquid glass surface */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    borderRadius: isMobile ? '20px' : '28px',
                    background: `linear-gradient(
                        145deg,
                        rgba(255, 255, 255, 0.85),
                        rgba(255, 255, 255, 0.65) 40%,
                        rgba(248, 250, 252, 0.75) 100%
                    )`,
                    backdropFilter: 'blur(40px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: `
                        inset 0 1px 0 rgba(255, 255, 255, 0.9),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.3),
                        0 1px 3px rgba(0, 0, 0, 0.04)
                    `,
                    overflow: 'hidden'
                }}>
                    {/* ── Top highlight line (liquid glass shine) ── */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '5%',
                        right: '5%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }} />

                    {/* ── Glass refraction overlay on right panel ── */}
                    {!isMobile && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '55%',
                        height: '50%',
                        background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)',
                        pointerEvents: 'none',
                        zIndex: 5,
                        borderRadius: '0 28px 0 0'
                    }} />
                    )}

                    {/* ── Property Image ── */}
                    <div style={{
                        width: isMobile ? '100%' : '45%',
                        height: isMobile ? undefined : '100%',
                        aspectRatio: isMobile ? '16/10' : undefined,
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: isMobile ? '20px 20px 0 0' : '28px 0 0 28px'
                    }}>
                        <img
                            src={optimizeCloudinaryUrl(property.imageUrl, { width: 800, quality: 'auto', format: 'auto' })}
                            srcSet={cloudinarySrcSet(property.imageUrl, [480, 800, 1200])}
                            sizes="(max-width: 768px) 100vw, 45vw"
                            alt={property.title || property.address}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            loading="lazy"
                            decoding="async"
                            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        />

                        {/* Image gradient overlay */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                            pointerEvents: 'none'
                        }} />

                        {/* Badges row */}
                        <div style={{
                            position: 'absolute',
                            top: '14px',
                            left: '14px',
                            display: 'flex',
                            gap: '6px',
                            zIndex: 3
                        }}>
                            {property.listingType && (
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    background: property.listingType === 'rent'
                                        ? 'rgba(14, 165, 233, 0.9)'
                                        : 'rgba(2, 82, 205, 0.9)',
                                    color: '#fff',
                                    backdropFilter: 'blur(8px)'
                                }}>
                                    For {property.listingType === 'rent' ? 'Rent' : 'Sale'}
                                </span>
                            )}
                            {property.isPromoted && property.promotionTier && property.promotionTier !== 'standard' && (
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    background: 'rgba(245, 158, 11, 0.9)',
                                    color: '#fff',
                                    backdropFilter: 'blur(8px)'
                                }}>
                                    Promoted
                                </span>
                            )}
                            {property.createdAt && Date.now() - property.createdAt < 7 * 24 * 60 * 60 * 1000 && (
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    background: 'rgba(16, 185, 129, 0.9)',
                                    color: '#fff',
                                    backdropFilter: 'blur(8px)'
                                }}>
                                    New
                                </span>
                            )}
                        </div>

                        {/* Price block */}
                        <div style={{
                            position: 'absolute',
                            bottom: '16px',
                            left: '16px',
                            zIndex: 3
                        }}>
                            {property.hasDiscount && property.originalPrice && (
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: 'rgba(255,255,255,0.7)',
                                    textDecoration: 'line-through',
                                    display: 'block',
                                    marginBottom: '2px'
                                }}>
                                    {formatPrice(property.originalPrice, property.currency)}
                                </span>
                            )}
                            <span style={{
                                fontSize: '1.6rem',
                                fontWeight: 800,
                                color: '#fff',
                                textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                                letterSpacing: '-0.02em'
                            }}>
                                {formatPrice(property.price, property.currency)}
                            </span>
                            {property.listingType === 'rent' && (
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>/mo</span>
                            )}
                        </div>
                    </div>

                    {/* ── Property Details (right panel) ── */}
                    <div style={{
                        width: isMobile ? '100%' : '55%',
                        padding: isMobile ? '1.25rem 1rem 1.5rem' : '2rem 2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 6
                    }}>
                        {/* Title */}
                        <h2 style={{
                            fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: '0.35rem',
                            lineHeight: 1.25,
                            letterSpacing: '-0.02em'
                        }}>
                            {property.title || property.address}
                        </h2>

                        {/* Location */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            marginBottom: '1rem'
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                {property.city}, {property.country}
                            </span>
                        </div>

                        {/* Description excerpt */}
                        {property.description && (
                            <p style={{
                                fontSize: '0.82rem',
                                color: '#94a3b8',
                                lineHeight: 1.6,
                                marginBottom: '1.25rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {property.description}
                            </p>
                        )}

                        {/* Stats row — glass pill style */}
                        <div style={{
                            display: 'flex',
                            gap: '0.6rem',
                            marginBottom: '1.25rem',
                            flexWrap: 'wrap'
                        }}>
                            {[
                                { value: property.beds, label: 'Beds', icon: '🛏' },
                                { value: property.baths, label: 'Baths', icon: '🚿' },
                                { value: property.sqft, label: 'm²', icon: '📐' },
                                ...(property.yearBuilt ? [{ value: property.yearBuilt, label: 'Built', icon: '🏗' }] : []),
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 0.85rem',
                                        borderRadius: '12px',
                                        background: 'rgba(248, 250, 252, 0.8)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid rgba(226, 232, 240, 0.6)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span style={{ fontSize: '0.75rem' }}>{stat.icon}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{stat.value}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{stat.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA button */}
                        <button
                            style={{
                                alignSelf: 'flex-start',
                                padding: '0.7rem 1.6rem',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #0252CD, #003A96)',
                                color: '#fff',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '0 4px 14px rgba(2, 82, 205, 0.25)',
                                letterSpacing: '0.01em'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(2, 82, 205, 0.35)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 82, 205, 0.25)';
                            }}
                        >
                            View Property →
                        </button>
                    </div>

                    {/* ── Frosted glass noise texture ── */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `
                            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.06) 1px, transparent 1px),
                            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px, 30px 30px',
                        pointerEvents: 'none',
                        borderRadius: isMobile ? '20px' : '28px',
                        opacity: 0.5,
                        zIndex: 4
                    }} />

                    {/* ── Left edge liquid glass reflection ── */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '1.5px',
                        height: '100%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
                        borderRadius: isMobile ? '20px 0 0 20px' : '28px 0 0 28px',
                        pointerEvents: 'none',
                        zIndex: 10
                    }} />
                </div>
            </div>
        </div>
    );
};

/* ─── Compact mobile property card ─── */
const MobilePropertyCard: React.FC<{ property: PropertyCardData; color: string; onClick: () => void }> = ({ property, color, onClick }) => {
    const formatPrice = (price: number, currency?: string) => {
        const symbol = currency === 'USD' ? '$' : '€';
        return `${symbol}${price.toLocaleString()}`;
    };

    return (
        <div
            onClick={onClick}
            style={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: `0 8px 32px -8px ${color.replace('0.7', '0.15')}, 0 2px 8px rgba(0,0,0,0.04)`,
                cursor: 'pointer',
            }}
        >
            {/* Image */}
            <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                <img
                    src={optimizeCloudinaryUrl(property.imageUrl, { width: 480, quality: 'auto', format: 'auto' })}
                    srcSet={cloudinarySrcSet(property.imageUrl, [320, 480, 640])}
                    sizes="(max-width: 480px) 100vw, 50vw"
                    alt={property.title || property.address}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                    decoding="async"
                />
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                    pointerEvents: 'none',
                }} />
                {/* Badges */}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4 }}>
                    {property.listingType && (
                        <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: property.listingType === 'rent' ? 'rgba(14,165,233,0.9)' : 'rgba(2,82,205,0.9)',
                            color: '#fff',
                        }}>
                            {property.listingType === 'rent' ? 'Rent' : 'Sale'}
                        </span>
                    )}
                </div>
                {/* Price */}
                <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        {formatPrice(property.price, property.currency)}
                    </span>
                    {property.listingType === 'rent' && (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>/mo</span>
                    )}
                </div>
            </div>
            {/* Details */}
            <div style={{ padding: '0.75rem 1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                    {property.title || property.address}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    {property.city}, {property.country}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                        { v: property.beds, l: 'Beds' },
                        { v: property.baths, l: 'Baths' },
                        { v: property.sqft, l: 'm²' },
                    ].map(s => (
                        <span key={s.l} style={{
                            padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem',
                            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600,
                        }}>
                            {s.v} {s.l}
                        </span>
                    ))}
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
    const isMobile = useIsMobile();

    if (properties.length === 0) return null;

    return (
        <section style={{ background: '#ffffff' }}>
            {/* Section Header — liquid glass */}
            <div style={{
                maxWidth: '72rem',
                margin: '0 auto',
                padding: '3rem 1rem 0',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Glass shine */}
                    <div style={{
                        position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)',
                        pointerEvents: 'none',
                    }} />
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
                                padding: '0.5rem 1rem',
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#475569',
                                background: 'rgba(248,250,252,0.8)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(226,232,240,0.6)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = 'rgba(248,250,252,1)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'rgba(248,250,252,0.8)'; }}
                        >
                            View All Properties →
                        </button>
                    )}
                </div>
            </div>

            {/* Stacked scroll cards — same animation for both mobile and desktop */}
            <div style={{ width: '100%' }}>
                {properties.slice(0, 6).map((property, index) => (
                    <StackedPropertyCard
                        key={property.id}
                        property={property}
                        index={index}
                        totalCards={Math.min(properties.length, 6)}
                        color={CARD_COLORS[index % CARD_COLORS.length]}
                        onClick={() => onPropertyClick(property)}
                        isMobile={isMobile}
                    />
                ))}
            </div>
        </section>
    );
};
