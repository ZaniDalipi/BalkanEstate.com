import React, { useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { List } from 'react-window';
import { Property } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import Footer from '@/components/shared/Footer';

interface VirtualizedPropertyGridProps {
  properties: Property[];
  onPropertyHover?: (propertyId: string | null) => void;
  containerHeight: number;
  columns?: 1 | 2;
  gap?: number;
  showFooter?: boolean;
}

// Memoized property item to prevent unnecessary re-renders
const PropertyItem = memo(({
  property,
  onHover,
}: {
  property: Property;
  onHover?: (id: string | null) => void;
}) => {
  const handleMouseEnter = useCallback(() => {
    onHover?.(property.id);
  }, [onHover, property.id]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PropertyCard property={property} />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.property.id === nextProps.property.id &&
         prevProps.onHover === nextProps.onHover;
});

PropertyItem.displayName = 'PropertyItem';

// Row data interface for the row component props
interface RowData {
  properties: Property[];
  columns: number;
  gap: number;
  onPropertyHover?: (id: string | null) => void;
  totalPropertyRows: number;
  showFooter: boolean;
}

// Row component props type
interface RowProps {
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  index: number;
  style: React.CSSProperties;
  properties: Property[];
  columns: number;
  gap: number;
  onPropertyHover?: (id: string | null) => void;
  totalPropertyRows: number;
  showFooter: boolean;
}

// Row component for the virtualized list
const Row = ({ index, style, properties, columns, gap, onPropertyHover, totalPropertyRows, showFooter }: RowProps): React.ReactElement => {
  // Check if this is the footer row
  if (showFooter && index === totalPropertyRows) {
    return (
      <div style={{ ...style, paddingTop: '32px' }}>
        <Footer contained />
      </div>
    );
  }

  const startIndex = index * columns;
  const items: Property[] = [];

  for (let i = 0; i < columns; i++) {
    const propertyIndex = startIndex + i;
    if (propertyIndex < properties.length) {
      items.push(properties[propertyIndex]);
    }
  }

  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
        gap: `${gap}px`,
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: index === 0 ? '16px' : '0px',
        paddingBottom: '16px',
      }}
    >
      {items.map((property) => (
        <PropertyItem
          key={property.id}
          property={property}
          onHover={onPropertyHover}
        />
      ))}
    </div>
  );
};

const VirtualizedPropertyGrid: React.FC<VirtualizedPropertyGridProps> = ({
  properties,
  onPropertyHover,
  containerHeight,
  columns = 1,
  gap = 24,
  showFooter = true,
}) => {
  const listRef = useRef<any>(null);

  // Calculate row count based on columns
  const propertyRowCount = useMemo(() => {
    return Math.ceil(properties.length / columns);
  }, [properties.length, columns]);

  // Total rows including footer
  const rowCount = useMemo(() => {
    return propertyRowCount + (showFooter ? 1 : 0);
  }, [propertyRowCount, showFooter]);

  // Estimated row height - card image + content + promotion badges
  // Card: image (~200px) + content (~200px) + gap + extra space for badges
  const rowHeight = useMemo(() => {
    return 440;
  }, []);

  // Dynamic row height function for footer
  const getRowHeight = useCallback((index: number) => {
    // Footer row is taller
    if (showFooter && index === propertyRowCount) {
      return 350; // Footer height
    }
    return rowHeight;
  }, [showFooter, propertyRowCount, rowHeight]);

  // Row props passed to each row
  const rowProps = useMemo((): RowData => ({
    properties,
    columns,
    gap,
    onPropertyHover,
    totalPropertyRows: propertyRowCount,
    showFooter,
  }), [properties, columns, gap, onPropertyHover, propertyRowCount, showFooter]);

  // Reset scroll when properties change significantly
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToRow?.({ index: 0 });
    }
  }, [properties.length > 0 ? properties[0]?.id : null]);

  if (properties.length === 0) {
    return null;
  }

  return (
    <List<RowData>
      listRef={listRef}
      rowCount={rowCount}
      rowHeight={getRowHeight}
      rowComponent={Row}
      rowProps={rowProps}
      overscanCount={2}
      className="virtualized-property-list"
      style={{ height: containerHeight, width: '100%' }}
    />
  );
};

export default memo(VirtualizedPropertyGrid);
