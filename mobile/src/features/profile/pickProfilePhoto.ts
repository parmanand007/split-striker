import { ActionSheetIOS, Alert, InteractionManager, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const REBUILD_MSG =
  'Profile photos need a native rebuild. From mobile/ run: npx expo run:ios --device';

function isNativeModuleError(msg: string): boolean {
  return (
    msg.includes('ExponentImagePicker') ||
    msg.includes('native module') ||
    msg.includes('Cannot find native module') ||
    msg.includes('Requiring unknown module')
  );
}

function wrapPickerError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (isNativeModuleError(msg)) return new Error(REBUILD_MSG);
  return e instanceof Error ? e : new Error(msg);
}

/** iOS needs a beat after dismissing an action sheet before presenting the picker. */
function afterSheetDismiss(fn: () => void) {
  if (Platform.OS !== 'ios') {
    fn();
    return;
  }
  InteractionManager.runAfterInteractions(() => {
    setTimeout(fn, 450);
  });
}

async function ensureLibraryPermission(): Promise<void> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.granted || perm.accessPrivileges === 'limited') return;

  Alert.alert(
    'Photo access needed',
    'Allow photo library access in Settings to choose a profile picture.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ],
  );
  throw new Error('Photo library permission denied.');
}

async function ensureCameraPermission(): Promise<void> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.granted) return;

  Alert.alert(
    'Camera access needed',
    'Allow camera access in Settings to take a profile picture.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ],
  );
  throw new Error('Camera permission denied.');
}

export async function pickProfilePhotoFromLibrary(): Promise<string | null> {
  try {
    await ensureLibraryPermission();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (e) {
    throw wrapPickerError(e);
  }
}

export async function takeProfilePhoto(): Promise<string | null> {
  try {
    await ensureCameraPermission();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (e) {
    throw wrapPickerError(e);
  }
}

export function showProfilePhotoOptions(options: {
  hasAvatar: boolean;
  onLibrary: () => void;
  onCamera: () => void;
  onRemove?: () => void;
}) {
  const { hasAvatar, onLibrary, onCamera, onRemove } = options;

  if (Platform.OS === 'ios') {
    const labels = ['Choose from library', 'Take photo'];
    const handlers = [onLibrary, onCamera];
    if (hasAvatar && onRemove) {
      labels.push('Remove photo');
      handlers.push(onRemove);
    }
    labels.push('Cancel');
    const cancelIndex = labels.length - 1;
    const destructiveIndex = hasAvatar && onRemove ? 2 : undefined;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: labels,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveIndex,
        title: 'Profile photo',
      },
      (index) => {
        if (index === cancelIndex || index === undefined) return;
        const handler = handlers[index];
        if (handler) afterSheetDismiss(handler);
      },
    );
    return;
  }

  const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
    { text: 'Choose from library', onPress: () => afterSheetDismiss(onLibrary) },
    { text: 'Take photo', onPress: () => afterSheetDismiss(onCamera) },
  ];
  if (hasAvatar && onRemove) {
    buttons.push({ text: 'Remove photo', style: 'destructive', onPress: onRemove });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Profile photo', undefined, buttons);
}
