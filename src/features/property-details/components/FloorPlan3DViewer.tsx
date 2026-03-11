import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { FloorPlanRoom, FloorPlanRoomType } from '@/src/shared/types/property.types';

// Room type color mapping
const ROOM_COLORS: Record<FloorPlanRoomType, string> = {
  bedroom: '#60A5FA',    // blue-400
  bathroom: '#22D3EE',   // cyan-400
  kitchen: '#FB923C',    // orange-400
  living: '#34D399',     // emerald-400
  dining: '#A78BFA',     // violet-400
  hallway: '#F472B6',    // pink-400
  balcony: '#2DD4BF',    // teal-400
  office: '#818CF8',     // indigo-400
  storage: '#A8A29E',    // stone-400
  garage: '#9CA3AF',     // gray-400
  other: '#FBBF24',      // amber-400
};

const ROOM_FLOOR_COLORS: Record<FloorPlanRoomType, string> = {
  bedroom: '#DBEAFE',    // blue-100
  bathroom: '#E0F2FE',   // sky-100
  kitchen: '#FFF7ED',    // orange-50
  living: '#ECFDF5',     // emerald-50
  dining: '#F5F3FF',     // violet-50
  hallway: '#FDF2F8',    // pink-50
  balcony: '#F0FDFA',    // teal-50
  office: '#EEF2FF',     // indigo-50
  storage: '#F5F5F4',    // stone-100
  garage: '#F3F4F6',     // gray-100
  other: '#FFFBEB',      // amber-50
};

const WALL_THICKNESS = 0.12;
const DEFAULT_WALL_HEIGHT = 2.8;

interface RoomMeshProps {
  room: FloorPlanRoom;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

// Single room rendered as 3D box with walls, floor, and label
const RoomMesh: React.FC<RoomMeshProps> = ({ room, isHovered, onHover }) => {
  const groupRef = useRef<THREE.Group>(null);
  const wallHeight = room.wallHeight || DEFAULT_WALL_HEIGHT;
  const wallColor = room.color || ROOM_COLORS[room.roomType];
  const floorColor = ROOM_FLOOR_COLORS[room.roomType];

  // Animate slight lift on hover
  useFrame(() => {
    if (groupRef.current) {
      const targetY = isHovered ? 0.08 : 0;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1;
    }
  });

  const area = (room.width * room.height).toFixed(1);

  return (
    <group
      ref={groupRef}
      position={[room.x + room.width / 2, 0, room.y + room.height / 2]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(room.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* Floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.width - WALL_THICKNESS * 2, room.height - WALL_THICKNESS * 2]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Walls - four sides as thin boxes */}
      {/* Back wall (far Z) */}
      <mesh position={[0, wallHeight / 2, -room.height / 2 + WALL_THICKNESS / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.width, wallHeight, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} metalness={0.1} transparent opacity={isHovered ? 0.85 : 0.7} />
      </mesh>
      {/* Front wall (near Z) - lower for visibility */}
      <mesh position={[0, wallHeight * 0.35, room.height / 2 - WALL_THICKNESS / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.width, wallHeight * 0.7, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} metalness={0.1} transparent opacity={isHovered ? 0.55 : 0.4} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-room.width / 2 + WALL_THICKNESS / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, wallHeight, room.height]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} metalness={0.1} transparent opacity={isHovered ? 0.85 : 0.7} />
      </mesh>
      {/* Right wall - lower for visibility */}
      <mesh position={[room.width / 2 - WALL_THICKNESS / 2, wallHeight * 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, wallHeight * 0.7, room.height]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} metalness={0.1} transparent opacity={isHovered ? 0.55 : 0.4} />
      </mesh>

      {/* Roof - semi-transparent */}
      <mesh position={[0, wallHeight, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial
          color={wallColor}
          transparent
          opacity={isHovered ? 0.25 : 0.15}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Room label - floating above */}
      <Text
        position={[0, wallHeight + 0.4, 0]}
        fontSize={0.35}
        color="#1F2937"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {room.name}
      </Text>

      {/* Area label */}
      <Text
        position={[0, wallHeight + 0.1, 0]}
        fontSize={0.22}
        color="#6B7280"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.woff"
        outlineWidth={0.015}
        outlineColor="#ffffff"
      >
        {area} m²
      </Text>

      {/* Dimension labels on floor */}
      <Text
        position={[0, 0.05, room.height / 2 - 0.3]}
        fontSize={0.18}
        color="#9CA3AF"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {room.width.toFixed(1)}m
      </Text>
      <Text
        position={[room.width / 2 - 0.3, 0.05, 0]}
        fontSize={0.18}
        color="#9CA3AF"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        {room.height.toFixed(1)}m
      </Text>
    </group>
  );
};

// Camera auto-fit to show all rooms
const CameraController: React.FC<{ rooms: FloorPlanRoom[] }> = ({ rooms }) => {
  const { camera } = useThree();
  const hasAdjusted = useRef(false);

  React.useEffect(() => {
    if (rooms.length === 0 || hasAdjusted.current) return;

    // Calculate bounding box of all rooms
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    rooms.forEach(r => {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.width);
      minZ = Math.min(minZ, r.y);
      maxZ = Math.max(maxZ, r.y + r.height);
    });

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeZ = maxZ - minZ;
    const maxDim = Math.max(sizeX, sizeZ);

    // Position camera for isometric-like view
    const distance = maxDim * 1.4 + 4;
    camera.position.set(centerX + distance * 0.6, distance * 0.7, centerZ + distance * 0.6);
    camera.lookAt(centerX, 0, centerZ);
    camera.updateProjectionMatrix();

    hasAdjusted.current = true;
  }, [rooms, camera]);

  return null;
};

// Ground plane with grid
const Ground: React.FC<{ rooms: FloorPlanRoom[] }> = ({ rooms }) => {
  const size = useMemo(() => {
    if (rooms.length === 0) return 20;
    let maxX = -Infinity, maxZ = -Infinity;
    rooms.forEach(r => {
      maxX = Math.max(maxX, r.x + r.width);
      maxZ = Math.max(maxZ, r.y + r.height);
    });
    return Math.max(maxX, maxZ) * 2 + 10;
  }, [rooms]);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#F3F4F6" roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[size, size, '#E5E7EB', '#E5E7EB']} position={[0, 0, 0]} />
    </>
  );
};

interface FloorPlan3DViewerProps {
  rooms: FloorPlanRoom[];
  totalArea?: number;
  className?: string;
  compact?: boolean; // smaller version for cards
}

const FloorPlan3DViewer: React.FC<FloorPlan3DViewerProps> = ({
  rooms,
  totalArea,
  className = '',
  compact = false,
}) => {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const computedTotalArea = useMemo(() => {
    if (totalArea) return totalArea;
    return rooms.reduce((sum, r) => sum + r.width * r.height, 0);
  }, [rooms, totalArea]);

  const hoveredRoomData = useMemo(() => {
    return rooms.find(r => r.id === hoveredRoom);
  }, [rooms, hoveredRoom]);

  if (rooms.length === 0) return null;

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 ${className}`}
      style={{ height: compact ? 280 : 450 }}
    >
      {/* Header badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-gray-200 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-xs font-semibold text-gray-700">3D Floor Plan</span>
        </div>
      </div>

      {/* Total area badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-gray-200">
          <span className="text-xs font-semibold text-gray-700">{computedTotalArea.toFixed(1)} m²</span>
        </div>
      </div>

      {/* Hovered room info */}
      {hoveredRoomData && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-200 animate-fade-in">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hoveredRoomData.color || ROOM_COLORS[hoveredRoomData.roomType] }}
            />
            <span className="text-sm font-semibold text-gray-800">{hoveredRoomData.name}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {hoveredRoomData.width.toFixed(1)}m x {hoveredRoomData.height.toFixed(1)}m = {(hoveredRoomData.width * hoveredRoomData.height).toFixed(1)} m²
          </p>
        </div>
      )}

      {/* Controls hint */}
      {!compact && (
        <div className="absolute bottom-3 right-3 z-10 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm border border-gray-200">
          <span className="text-[10px] text-gray-400">Drag to rotate • Scroll to zoom</span>
        </div>
      )}

      <Canvas
        shadows
        camera={{
          fov: 45,
          near: 0.1,
          far: 200,
          position: [12, 10, 12],
        }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <CameraController rooms={rooms} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} />

        <Suspense fallback={null}>
          <Ground rooms={rooms} />

          {rooms.map(room => (
            <RoomMesh
              key={room.id}
              room={room}
              isHovered={hoveredRoom === room.id}
              onHover={setHoveredRoom}
            />
          ))}
        </Suspense>

        <OrbitControls
          enablePan={!compact}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.2}
          minDistance={3}
          maxDistance={50}
          autoRotate={compact}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default FloorPlan3DViewer;
