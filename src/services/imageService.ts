import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { MAX_MENU_IMAGES_PER_SCAN } from "../constants/menuScan";
import { PreparedMenuImage } from "../types/image";

export const MENU_IMAGE_PREPROCESSING = Object.freeze({
  version: "app-jpeg-1600-compress-0.72-v1",
  maxLongEdge: 1600,
  compress: 0.72,
  mimeType: "image/jpeg" as const
});

const MAX_LONG_EDGE = MENU_IMAGE_PREPROCESSING.maxLongEdge;

export type ImageAccessErrorCode = "camera_denied" | "photo_library_denied" | "image_picker_failed";

export class ImageAccessError extends Error {
  code: ImageAccessErrorCode;

  constructor(code: ImageAccessErrorCode, message: string) {
    super(message);
    this.name = "ImageAccessError";
    this.code = code;
    Object.setPrototypeOf(this, ImageAccessError.prototype);
  }
}

export async function pickMenuImages(
  selectionLimit = MAX_MENU_IMAGES_PER_SCAN
): Promise<PreparedMenuImage[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new ImageAccessError("photo_library_denied", "Photo library permission was not granted.");
  }

  try {
    const boundedSelectionLimit = Math.max(
      1,
      Math.min(MAX_MENU_IMAGES_PER_SCAN, Math.floor(selectionLimit))
    );
    const allowsMultipleSelection = boundedSelectionLimit > 1;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection,
      mediaTypes: ["images"],
      ...(allowsMultipleSelection
        ? {
            orderedSelection: true,
            selectionLimit: boundedSelectionLimit
          }
        : {}),
      quality: 1
    });

    if (result.canceled || result.assets.length === 0) {
      return [];
    }

    const preparedImages: PreparedMenuImage[] = [];
    for (const asset of result.assets.slice(0, boundedSelectionLimit)) {
      preparedImages.push(await prepareMenuImage(asset));
    }

    return preparedImages;
  } catch (error) {
    if (error instanceof ImageAccessError) {
      throw error;
    }

    throw new ImageAccessError("image_picker_failed", "Could not open the image picker.");
  }
}

export async function pickMenuImage(): Promise<PreparedMenuImage | null> {
  const images = await pickMenuImages(1);
  return images[0] ?? null;
}

export async function captureMenuImage(): Promise<PreparedMenuImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new ImageAccessError("camera_denied", "Camera permission was not granted.");
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ["images"],
      quality: 1
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    return prepareMenuImage(result.assets[0]);
  } catch (error) {
    if (error instanceof ImageAccessError) {
      throw error;
    }

    throw new ImageAccessError("image_picker_failed", "Could not open the image picker.");
  }
}

export async function prepareCapturedMenuImage(asset: {
  uri: string;
  width: number;
  height: number;
}): Promise<PreparedMenuImage> {
  return prepareMenuImage(asset);
}

async function prepareMenuImage(asset: {
  uri: string;
  width?: number;
  height?: number;
}): Promise<PreparedMenuImage> {
  const width = asset.width ?? MAX_LONG_EDGE;
  const height = asset.height ?? MAX_LONG_EDGE;
  const longestEdge = Math.max(width, height);
  const scale = longestEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longestEdge : 1;

  const resized = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        resize: {
          width: Math.round(width * scale),
          height: Math.round(height * scale)
        }
      }
    ],
    {
      base64: true,
      compress: MENU_IMAGE_PREPROCESSING.compress,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  if (!resized.base64) {
    const base64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: "base64"
    });

    return {
      uri: resized.uri,
      width: resized.width,
      height: resized.height,
      base64,
      mimeType: "image/jpeg"
    };
  }

  return {
    uri: resized.uri,
    width: resized.width,
    height: resized.height,
    base64: resized.base64,
    mimeType: "image/jpeg"
  };
}
