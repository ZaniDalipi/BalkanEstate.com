# Image Upload System Guide

## Overview

This application uses Cloudinary for efficient, cost-optimized image storage. All property images are automatically compressed, optimized, and organized in a structured folder hierarchy.

## Folder Structure

Images are organized in Cloudinary with the following structure:

```
balkan-estate/
├── properties/
│   └── user-{userId}/
│       ├── listing-{propertyId}/
│       │   ├── image1.jpg
│       │   ├── image2.jpg
│       │   └── ...
│       └── temp/
│           └── (temporary uploads before property creation)
├── avatars/
│   └── user-{userId}/
│       └── avatar.jpg
└── agencies/
    └── user-{userId}/
        ├── logo.jpg
        └── cover.jpg
```

### Benefits of This Structure

1. **Easy Organization**: All images for a property are in one folder
2. **Simple Cleanup**: Delete entire folder when property is deleted
3. **Cost Efficiency**: No orphaned images taking up storage
4. **User Isolation**: Each user's images are in separate folders
5. **Easy Migration**: Can move user's entire image library if needed

## Cost Optimization Features

### 1. **Pre-Upload Compression**
Images are compressed using Sharp before uploading to Cloudinary:
- Resized to max 1920x1080 (maintaining aspect ratio)
- Converted to JPEG with 85% quality
- Progressive JPEG for better web loading
- Metadata removed

### 2. **Cloudinary Transformations**
- `quality: auto:good` - Automatic quality adjustment
- `fetch_format: auto` - Serves WebP to supported browsers (50-80% smaller than JPEG)

### 3. **Eager Transformations**
Pre-generates commonly used sizes in the background:
- Thumbnail: 800x600
- Medium: 1200x800

### 4. **Storage Efficiency**
- Only `publicId` stored in MongoDB (not full URLs)
- URLs generated on-demand using publicId
- Automatic folder cleanup when properties deleted

## Backend API

### Upload Images

**Endpoint:** `POST /api/properties/upload-images`

**With Property ID:** `POST /api/properties/:propertyId/upload-images`

**Authentication:** Required

**Request:**
```typescript
// Form data with files
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
// ... up to 30 images
```

**Response:**
```json
{
  "images": [
    {
      "url": "https://res.cloudinary.com/.../image.jpg",
      "publicId": "balkan-estate/properties/user-123/listing-456/abc123",
      "tag": "other"
    }
  ],
  "message": "Successfully uploaded 2 images"
}
```

### Workflow Examples

#### 1. Creating a New Property

```typescript
// Step 1: Upload images without propertyId (goes to temp folder)
const images = await uploadPropertyImages(files);

// Step 2: Create property with image references
const property = await createProperty({
  ...propertyData,
  images: images.map(img => ({
    url: img.url,
    publicId: img.publicId,
    tag: img.tag
  }))
});

// Step 3: (Optional) Move images from temp to property folder
// This happens automatically on the backend when property is created
```

#### 2. Adding Images to Existing Property

```typescript
// Upload directly to property folder
const newImages = await uploadPropertyImages(files, propertyId);

// Update property with new images
await updateProperty(propertyId, {
  images: [...existingImages, ...newImages]
});
```

## Frontend Usage

### Import the Function

```typescript
import { uploadPropertyImages } from '../services/apiService';
```

### Basic Upload

```typescript
const handleImageUpload = async (files: File[]) => {
  try {
    // Upload without property ID (for new listings)
    const uploadedImages = await uploadPropertyImages(files);
    console.log('Uploaded:', uploadedImages);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Upload to Existing Property

```typescript
const handleAddImages = async (propertyId: string, files: File[]) => {
  try {
    // Upload with property ID (organized in property folder)
    const uploadedImages = await uploadPropertyImages(files, propertyId);
    console.log('Uploaded to property:', uploadedImages);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### React Component Example

```typescript
import React, { useState } from 'react';
import { uploadPropertyImages } from '../services/apiService';

const ImageUploader: React.FC<{ propertyId?: string }> = ({ propertyId }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setUploading(true);
    try {
      const images = await uploadPropertyImages(files, propertyId);
      setUploadedImages(prev => [...prev, ...images]);
      alert(`Successfully uploaded ${images.length} images!`);
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}

      <div className="grid grid-cols-3 gap-4">
        {uploadedImages.map((img, idx) => (
          <img key={idx} src={img.url} alt={`Upload ${idx}`} />
        ))}
      </div>
    </div>
  );
};
```

## Database Schema

### Property Model

```typescript
interface IPropertyImage {
  url: string;
  publicId?: string; // Cloudinary public_id
  tag: 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
}

interface IProperty {
  // Main image
  imageUrl: string;
  imagePublicId?: string;

  // Additional images
  images: IPropertyImage[];

  // Floorplan
  floorplanUrl?: string;
  floorplanPublicId?: string;

  // ... other fields
}
```

### Storing Images

```typescript
// Only store the publicId and tag
property.images = uploadedImages.map(img => ({
  url: img.url,
  publicId: img.publicId,
  tag: 'other'
}));
```

### Retrieving Images

```typescript
// URLs are already in the database
const imageUrls = property.images.map(img => img.url);

// Or generate optimized URLs on-demand
import { getOptimizedUrl } from '../services/cloudinaryService';

const thumbnailUrl = getOptimizedUrl(img.publicId, {
  width: 400,
  height: 300,
  quality: 'auto:good'
});
```

## Image Deletion

### Automatic Deletion

When a property is deleted, all associated images are automatically removed from Cloudinary:

```typescript
// Backend automatically handles this
await deleteProperty(propertyId);
// ✓ Property deleted from database
// ✓ All images deleted from Cloudinary
// ✓ Entire folder removed
```

### Manual Deletion

```typescript
import { deleteImages, deleteFolder } from '../services/cloudinaryService';

// Delete specific images
await deleteImages([publicId1, publicId2]);

// Delete entire folder
await deleteFolder('balkan-estate/properties/user-123/listing-456');
```

## Best Practices

### 1. **Always Provide Property ID When Available**
```typescript
// ✓ Good - organized in property folder
await uploadPropertyImages(files, propertyId);

// ✗ Avoid - creates orphaned files in temp folder
await uploadPropertyImages(files);
```

### 2. **Validate Files Before Upload**
```typescript
const validateImage = (file: File): boolean => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return false;
  }

  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be less than 5MB');
    return false;
  }

  return true;
};

const validFiles = files.filter(validateImage);
```

### 3. **Show Upload Progress**
```typescript
const [progress, setProgress] = useState(0);

const uploadWithProgress = async (files: File[]) => {
  for (let i = 0; i < files.length; i++) {
    await uploadPropertyImages([files[i]], propertyId);
    setProgress(((i + 1) / files.length) * 100);
  }
};
```

### 4. **Handle Errors Gracefully**
```typescript
try {
  const images = await uploadPropertyImages(files, propertyId);
  if (images.length < files.length) {
    alert(`Warning: Only ${images.length} of ${files.length} images uploaded`);
  }
} catch (error: any) {
  console.error('Upload error:', error);
  alert('Some images failed to upload. Please try again.');
}
```

### 5. **Clean Up Temp Folder**
If you upload images before creating the property, move them to the property folder:

```typescript
// Backend function (already implemented)
const newPublicIds = await moveImagesToProperty(
  tempPublicIds,
  userId,
  propertyId
);
```

## Cost Monitoring

### Cloudinary Free Tier Limits
- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month

### Our Optimizations
With our optimizations, you can store approximately:
- **~25,000 property images** (avg 1MB each after compression)
- **~50,000 thumbnails** (avg 50KB each)

### Tips to Stay Within Quota
1. ✓ Delete properties when no longer needed
2. ✓ Use the property ID in uploads for proper organization
3. ✓ Limit images to 10-15 per property
4. ✓ Compress large images before upload (we do this automatically)
5. ✓ Use Cloudinary's auto format (WebP when supported)

## Troubleshooting

### Images Not Uploading
```typescript
// Check authentication
const token = localStorage.getItem('balkan_estate_token');
if (!token) {
  alert('Please log in to upload images');
  return;
}

// Check file size
const oversized = files.filter(f => f.size > 5 * 1024 * 1024);
if (oversized.length > 0) {
  alert('Some files are too large. Max size: 5MB');
}
```

### Images Not Deleting
- Check that `publicId` is stored in database
- Verify folder path matches the pattern
- Check Cloudinary dashboard for orphaned files

### Slow Uploads
- Upload images in batches (5-10 at a time)
- Compress images on client side before upload
- Use a faster internet connection

## Support

For issues or questions:
1. Check Cloudinary dashboard: [cloudinary.com/console](https://cloudinary.com/console)
2. Review server logs for upload errors
3. Verify folder structure in Cloudinary media library
