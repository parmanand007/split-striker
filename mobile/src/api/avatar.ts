import { File, UploadTask, UploadType } from 'expo-file-system';
import { getMemoryToken } from '@/src/stores/tokenStore';
import { API_BASE_URL } from '@/src/config/env';
import { resolveMediaUrl } from '@/src/utils/mediaUrl';
import { ApiError } from '@/src/types/api';
import type { User } from '@/src/types/api';

function formatDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join(', ');
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return fallback;
}

export async function uploadUserAvatar(userId: number, uri: string): Promise<User> {
  // Expo SDK 57's global `fetch` only accepts Blob/File form parts — it no longer
  // supports React Native's classic `{uri, name, type}` FormData shape (throws
  // "Unsupported FormDataPart implementation"). expo-file-system's UploadTask
  // uploads a local file URI natively, sidestepping fetch's FormData entirely.
  const token = getMemoryToken();

  let result: { body: string; status: number };
  try {
    const file = new File(uri);
    const task = new UploadTask(file, `${API_BASE_URL}/users/${userId}/avatar`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'image/jpeg',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    result = await task.uploadAsync();
  } catch (error) {
    throw new TypeError(
      error instanceof Error
        ? `Network error: ${error.message}`
        : 'Network error while uploading photo',
    );
  }

  const parsedBody = (() => {
    try {
      return JSON.parse(result.body);
    } catch {
      return { detail: result.body };
    }
  })();

  if (result.status < 200 || result.status >= 300) {
    throw new ApiError(
      result.status,
      formatDetail(parsedBody?.detail ?? parsedBody, `Upload failed (${result.status})`),
    );
  }

  return parsedBody as User;
}

export async function deleteUserAvatar(userId: number): Promise<User> {
  const token = getMemoryToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    throw new TypeError(
      error instanceof Error
        ? `Network error: ${error.message}`
        : 'Network error while removing photo',
    );
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, formatDetail(errBody?.detail ?? errBody, res.statusText));
  }

  return (await res.json()) as User;
}

/** Auth headers for loading private avatar images in Image components. */
export function avatarImageSource(avatarUrl?: string | null) {
  const uri = resolveMediaUrl(avatarUrl);
  if (!uri) return null;
  const token = getMemoryToken();
  return {
    uri,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}
