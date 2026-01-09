import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const PROFILE_PICTURES_DIR = path.join(process.cwd(), 'uploads', 'profile-pictures');

if (!fs.existsSync(PROFILE_PICTURES_DIR)) {
  fs.mkdirSync(PROFILE_PICTURES_DIR, { recursive: true });
}

export interface AvatarResult {
  localPath: string;
  filename: string;
}

export async function downloadAndStoreProfilePicture(
  imageUrl: string,
  customerId?: string
): Promise<AvatarResult | null> {
  try {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.log('[Avatar Service] Invalid image URL:', imageUrl);
      return null;
    }

    console.log('[Avatar Service] Downloading profile picture from:', imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      console.log('[Avatar Service] Failed to download image:', response.status);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      console.log('[Avatar Service] Response is not an image:', contentType);
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    const filename = customerId 
      ? `${customerId}.webp`
      : `${randomUUID()}.webp`;
    
    const filePath = path.join(PROFILE_PICTURES_DIR, filename);

    await sharp(imageBuffer)
      .resize(200, 200, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(filePath);

    console.log('[Avatar Service] Profile picture saved:', filename);
    
    return {
      localPath: `/api/profile-pictures/${filename}`,
      filename
    };
  } catch (error) {
    console.error('[Avatar Service] Error downloading/storing profile picture:', error);
    return null;
  }
}

export async function deleteProfilePicture(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(PROFILE_PICTURES_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[Avatar Service] Deleted profile picture:', filename);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Avatar Service] Error deleting profile picture:', error);
    return false;
  }
}

export function getProfilePicturePath(filename: string): string | null {
  const filePath = path.join(PROFILE_PICTURES_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
