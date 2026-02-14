import React, { useState, useEffect, useCallback } from 'react';
import {
  PhotoIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
} from '@/constants';
import {
  getAllShowcaseImages,
  uploadShowcaseImage,
  createShowcaseItem,
  updateShowcaseItem,
  deleteShowcaseItem,
  type ShowcaseImage,
} from '../api/adminApi';

const ShowcaseManager: React.FC = () => {
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllShowcaseImages();
      setImages(data.sort((a, b) => a.order - b.order));
    } catch (err: any) {
      setError(err.message || 'Failed to load showcase images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url, publicId } = await uploadShowcaseImage(file);
        await createShowcaseItem({
          title: file.name.replace(/\.[^.]+$/, ''),
          url,
          publicId,
          order: images.length + i,
          subsection: 'tablet',
        });
      }
      setSuccess(`Uploaded ${files.length} image(s) successfully`);
      await fetchImages();
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShowcaseItem(id);
      setImages((prev) => prev.filter((img) => img._id !== id));
      setSuccess('Image deleted');
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = images.findIndex((img) => img._id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === images.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...images];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];

    // Update orders
    setImages(updated);
    try {
      await Promise.all([
        updateShowcaseItem(updated[idx]._id, { order: idx }),
        updateShowcaseItem(updated[swapIdx]._id, { order: swapIdx }),
      ]);
    } catch (err: any) {
      setError('Failed to reorder');
      await fetchImages();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateShowcaseItem(id, { isActive: !isActive });
      setImages((prev) =>
        prev.map((img) => (img._id === id ? { ...img, isActive: !isActive } : img))
      );
    } catch (err: any) {
      setError('Failed to update status');
    }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    try {
      await updateShowcaseItem(id, { title });
      setImages((prev) =>
        prev.map((img) => (img._id === id ? { ...img, title } : img))
      );
    } catch (err: any) {
      setError('Failed to update title');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Homepage Showcase</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage images displayed in the interactive iPad/tablet scroll section on the homepage.
            These images will cycle through inside the device frame as users scroll.
          </p>
        </div>
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
          uploading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90'
        }`}>
          <PlusIcon className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Add Images'}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          Loading showcase images...
        </div>
      )}

      {/* Empty State */}
      {!loading && images.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No showcase images yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Upload screenshots of the app to display in the homepage tablet section
          </p>
        </div>
      )}

      {/* Image Grid */}
      {!loading && images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, idx) => (
            <div
              key={image._id}
              className={`relative bg-white rounded-xl border overflow-hidden group transition-all ${
                image.isActive ? 'border-gray-200' : 'border-orange-200 opacity-60'
              }`}
            >
              {/* Image Preview */}
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover object-top"
                />
                {!image.isActive && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-medium">
                      Hidden
                    </span>
                  </div>
                )}
                {/* Order badge */}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  #{idx + 1}
                </div>
              </div>

              {/* Controls */}
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={image.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setImages((prev) =>
                      prev.map((img) => (img._id === image._id ? { ...img, title: newTitle } : img))
                    );
                  }}
                  onBlur={(e) => handleUpdateTitle(image._id, e.target.value)}
                  className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none pb-0.5"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorder(image._id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUpIcon className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleReorder(image._id, 'down')}
                      disabled={idx === images.length - 1}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(image._id, image.isActive)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        image.isActive
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      }`}
                    >
                      {image.isActive ? 'Active' : 'Hidden'}
                    </button>
                    <button
                      onClick={() => handleDelete(image._id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-600">
          <li>Upload app screenshots to show inside the iPad frame on the homepage</li>
          <li>Images will auto-cycle as users interact with the tablet section</li>
          <li>Drag to reorder — first image appears initially when the section loads</li>
          <li>Toggle visibility to hide images without deleting them</li>
        </ul>
      </div>
    </div>
  );
};

export default ShowcaseManager;
