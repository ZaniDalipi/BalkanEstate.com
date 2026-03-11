import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorPlanRoom, FloorPlanRoomType } from '@/src/shared/types/property.types';

const ROOM_TYPE_OPTIONS: { value: FloorPlanRoomType; label: string; icon: string }[] = [
  { value: 'living', label: 'Living Room', icon: '🛋️' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
  { value: 'dining', label: 'Dining Room', icon: '🍽️' },
  { value: 'hallway', label: 'Hallway', icon: '🚪' },
  { value: 'balcony', label: 'Balcony', icon: '🌅' },
  { value: 'office', label: 'Office', icon: '💼' },
  { value: 'storage', label: 'Storage', icon: '📦' },
  { value: 'garage', label: 'Garage', icon: '🚗' },
  { value: 'other', label: 'Other', icon: '📐' },
];

const ROOM_COLORS: Record<FloorPlanRoomType, string> = {
  bedroom: '#60A5FA',
  bathroom: '#22D3EE',
  kitchen: '#FB923C',
  living: '#34D399',
  dining: '#A78BFA',
  hallway: '#F472B6',
  balcony: '#2DD4BF',
  office: '#818CF8',
  storage: '#A8A29E',
  garage: '#9CA3AF',
  other: '#FBBF24',
};

interface FloorPlanRoomEditorProps {
  rooms: FloorPlanRoom[];
  onChange: (rooms: FloorPlanRoom[]) => void;
}

const FloorPlanRoomEditor: React.FC<FloorPlanRoomEditorProps> = ({ rooms, onChange }) => {
  const { t } = useTranslation(['seller', 'common']);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState<Partial<FloorPlanRoom>>({
    name: '',
    roomType: 'living',
    width: 4,
    height: 3,
  });

  const totalArea = useMemo(() => {
    return rooms.reduce((sum, r) => sum + r.width * r.height, 0);
  }, [rooms]);

  // Auto-calculate position: stack rooms in a grid-like layout
  const calculatePosition = useCallback((existingRooms: FloorPlanRoom[], width: number, height: number) => {
    if (existingRooms.length === 0) return { x: 0, y: 0 };

    // Try to place next to the last room
    const lastRoom = existingRooms[existingRooms.length - 1];

    // Try placing to the right of the last room
    let x = lastRoom.x + lastRoom.width;
    let y = lastRoom.y;

    // If it would extend too far right, start a new row
    const maxX = existingRooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
    if (x + width > maxX + 8) {
      x = 0;
      y = existingRooms.reduce((max, r) => Math.max(max, r.y + r.height), 0);
    }

    return { x, y };
  }, []);

  const handleAddRoom = useCallback(() => {
    if (!newRoom.name || !newRoom.roomType || !newRoom.width || !newRoom.height) return;

    const pos = calculatePosition(rooms, newRoom.width, newRoom.height);
    const room: FloorPlanRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newRoom.name,
      roomType: newRoom.roomType as FloorPlanRoomType,
      width: newRoom.width,
      height: newRoom.height,
      x: pos.x,
      y: pos.y,
    };

    onChange([...rooms, room]);
    setNewRoom({ name: '', roomType: 'living', width: 4, height: 3 });
    setIsAdding(false);
  }, [newRoom, rooms, onChange, calculatePosition]);

  const handleUpdateRoom = useCallback((id: string, updates: Partial<FloorPlanRoom>) => {
    onChange(rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [rooms, onChange]);

  const handleRemoveRoom = useCallback((id: string) => {
    onChange(rooms.filter(r => r.id !== id));
    if (editingId === id) setEditingId(null);
  }, [rooms, onChange, editingId]);

  const handleQuickAdd = useCallback((type: FloorPlanRoomType) => {
    const typeInfo = ROOM_TYPE_OPTIONS.find(o => o.value === type)!;
    const existingCount = rooms.filter(r => r.roomType === type).length;
    const name = existingCount > 0 ? `${typeInfo.label} ${existingCount + 1}` : typeInfo.label;

    const defaultSizes: Record<string, { w: number; h: number }> = {
      living: { w: 5, h: 4 },
      bedroom: { w: 4, h: 3.5 },
      kitchen: { w: 3.5, h: 3 },
      bathroom: { w: 2.5, h: 2 },
      dining: { w: 3.5, h: 3 },
      hallway: { w: 6, h: 1.5 },
      balcony: { w: 3, h: 1.5 },
      office: { w: 3, h: 3 },
      storage: { w: 2, h: 2 },
      garage: { w: 5, h: 5 },
      other: { w: 3, h: 3 },
    };

    const size = defaultSizes[type] || { w: 3, h: 3 };
    const pos = calculatePosition(rooms, size.w, size.h);

    const room: FloorPlanRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      roomType: type,
      width: size.w,
      height: size.h,
      x: pos.x,
      y: pos.y,
    };

    onChange([...rooms, room]);
  }, [rooms, onChange, calculatePosition]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-700">
            3D Floor Plan
          </h4>
        </div>
        {rooms.length > 0 && (
          <span className="text-xs text-gray-400">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} • {totalArea.toFixed(1)} m²
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Add rooms to generate an interactive 3D floor plan preview for buyers.
      </p>

      {/* Quick add buttons */}
      <div className="flex flex-wrap gap-1.5">
        {ROOM_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleQuickAdd(opt.value)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Room list */}
      {rooms.length > 0 && (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="glass-panel-light rounded-xl p-3 border border-gray-100"
            >
              {editingId === room.id ? (
                // Editing mode
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Name</label>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => handleUpdateRoom(room.id, { name: e.target.value })}
                        className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Type</label>
                      <select
                        value={room.roomType}
                        onChange={(e) => handleUpdateRoom(room.id, { roomType: e.target.value as FloorPlanRoomType })}
                        className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5 appearance-none"
                      >
                        {ROOM_TYPE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Width (m)</label>
                      <input
                        type="number"
                        value={room.width}
                        onChange={(e) => handleUpdateRoom(room.id, { width: Math.max(0.5, Math.min(50, Number(e.target.value))) })}
                        className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5"
                        min={0.5}
                        max={50}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Depth (m)</label>
                      <input
                        type="number"
                        value={room.height}
                        onChange={(e) => handleUpdateRoom(room.id, { height: Math.max(0.5, Math.min(50, Number(e.target.value))) })}
                        className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5"
                        min={0.5}
                        max={50}
                        step={0.1}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-blue-600 font-medium hover:text-blue-700"
                  >
                    Done editing
                  </button>
                </div>
              ) : (
                // View mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ROOM_COLORS[room.roomType] }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{room.name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {room.width}m × {room.height}m = {(room.width * room.height).toFixed(1)} m²
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(room.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(room.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom room form */}
      {isAdding && (
        <div className="glass-panel-light rounded-xl p-4 border border-blue-100 space-y-3">
          <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Custom Room</h5>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Name</label>
              <input
                type="text"
                value={newRoom.name || ''}
                onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5"
                placeholder="e.g., Master Bedroom"
                maxLength={30}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Type</label>
              <select
                value={newRoom.roomType || 'living'}
                onChange={(e) => setNewRoom(prev => ({ ...prev, roomType: e.target.value as FloorPlanRoomType }))}
                className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5 appearance-none"
              >
                {ROOM_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Width (m)</label>
              <input
                type="number"
                value={newRoom.width || 4}
                onChange={(e) => setNewRoom(prev => ({ ...prev, width: Math.max(0.5, Math.min(50, Number(e.target.value))) }))}
                className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5"
                min={0.5}
                max={50}
                step={0.1}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Depth (m)</label>
              <input
                type="number"
                value={newRoom.height || 3}
                onChange={(e) => setNewRoom(prev => ({ ...prev, height: Math.max(0.5, Math.min(50, Number(e.target.value))) }))}
                className="glass-input w-full text-sm px-2.5 py-1.5 mt-0.5"
                min={0.5}
                max={50}
                step={0.1}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddRoom}
              disabled={!newRoom.name}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add Room
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add custom room button */}
      {!isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          + Add custom room
        </button>
      )}
    </div>
  );
};

export default FloorPlanRoomEditor;
