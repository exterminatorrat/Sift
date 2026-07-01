import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { PreparedMenuImage } from "../types/image";

const MAX_LONG_EDGE = 1600;

export async function pickMenuImage(): Promise<PreparedMenuImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission was not granted.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return prepareMenuImage(result.assets[0]);
}

export async function captureMenuImage(): Promise<PreparedMenuImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission was not granted.");
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return prepareMenuImage(result.assets[0]);
}

async function prepareMenuImage(asset: ImagePicker.ImagePickerAsset): Promise<PreparedMenuImage> {
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
      compress: 0.72,
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
