import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {Camera, CameraRuntimeError, PhotoFile, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import ImageResizer from 'react-native-image-resizer';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {ProgressBar} from '@/components/ProgressBar';
import {useThemeContext} from '@/theme';
import {AppTabParamList} from '@/navigation/AppNavigator';
import {createParcel, requestParcelUpload, uploadParcelImage} from '@/api/parcels';
import {showToast} from '@/utils/toast';
import {useAuth} from '@/hooks/useAuth';
import {useParcelQueue} from '@/hooks/useParcelQueue';

const MAX_PHOTO_EDGE = 1400;

const ensureFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);

type ResizedPhoto = {
  path: string;
  width: number;
  height: number;
};

type CaptureStep = 'capture' | 'confirm' | 'uploading' | 'success';

type UploadState = {
  progress: number;
  message: string;
};

export const CaptureScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const {property, refreshProfile} = useAuth();
  const {isOnline, enqueue} = useParcelQueue();
  const device = useCameraDevice('back');
  const camera = useRef<Camera | null>(null);
  const {hasPermission, requestPermission, status} = useCameraPermission();
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<CaptureStep>('capture');
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoFile | null>(null);
  const [remarks, setRemarks] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>({progress: 0, message: ''});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('Parcel saved');

  const propertyId = property?.propertyId;

  useEffect(() => {
    if (!hasPermission && status !== 'denied') {
      requestPermission();
    }
  }, [hasPermission, status, requestPermission]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleCameraError = useCallback((runtimeError: CameraRuntimeError) => {
    setError(runtimeError?.message ?? 'Unable to access the camera.');
  }, []);

  const takePhoto = useCallback(async () => {
    if (!camera.current || !device) {
      return;
    }

    try {
      setError(null);
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        skipMetadata: true,
      });
      setCapturedPhoto(photo);
      setStep('confirm');
    } catch (err) {
      setError('Unable to capture photo. Please try again.');
    }
  }, [device]);

  const resetCapture = useCallback(() => {
    setCapturedPhoto(null);
    setRemarks('');
    setUploadState({progress: 0, message: ''});
    setError(null);
    setStep('capture');
    setSuccessMessage('Parcel saved');
  }, []);

  const optimizePhoto = useCallback(
    async (photo: PhotoFile): Promise<ResizedPhoto> => {
      const width = photo.width ?? MAX_PHOTO_EDGE;
      const height = photo.height ?? MAX_PHOTO_EDGE;
      const longestEdge = Math.max(width, height);
      const scale = longestEdge > MAX_PHOTO_EDGE ? MAX_PHOTO_EDGE / longestEdge : 1;

      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const result = await ImageResizer.createResizedImage(ensureFileUri(photo.path), targetWidth, targetHeight, 'JPEG', 80);

      return {
        path: result.path ?? result.uri,
        width: targetWidth,
        height: targetHeight,
      };
    },
    [],
  );

  const uploadPhoto = useCallback(
    async (photo: PhotoFile, notes: string, propertyId: string) => {
      setStep('uploading');
      setUploadState({progress: 0, message: 'Preparing photo'});

      const optimized = await optimizePhoto(photo);
      setUploadState({progress: 0.2, message: 'Requesting secure upload'});
      const {uploadUrl, blobUrl} = await requestParcelUpload({ext: 'jpg'});

      setUploadState({progress: 0.4, message: 'Uploading photo'});
      await uploadParcelImage(uploadUrl, optimized.path, progress => {
        setUploadState({progress: 0.4 + progress * 0.5, message: 'Uploading photo'});
      });

      setUploadState({progress: 0.95, message: 'Saving parcel'});
      await createParcel({
        propertyId,
        photoUrl: blobUrl,
        remarks: notes.trim() ? notes.trim() : undefined,
      });

      await queryClient.invalidateQueries({queryKey: ['parcels'], exact: false});
      setUploadState({progress: 1, message: 'Complete'});
      showToast('Parcel saved');
      setStep('success');
    },
    [optimizePhoto, queryClient],
  );

  const handleUsePhoto = useCallback(async () => {
    if (!capturedPhoto) {
      return;
    }

    if (!propertyId) {
      setError('You are not assigned to a property.');
      return;
    }

    try {
      setError(null);
      const trimmedRemarks = remarks.trim();

      if (!isOnline) {
        const optimized = await optimizePhoto(capturedPhoto);
        await enqueue({
          localUri: ensureFileUri(optimized.path),
          propertyId,
          remarks: trimmedRemarks ? trimmedRemarks : undefined,
        });
        showToast('Parcel queued for upload');
        setCapturedPhoto(null);
        setRemarks('');
        setSuccessMessage('Parcel queued for sync');
        setStep('success');
        return;
      }

      await uploadPhoto(capturedPhoto, trimmedRemarks, propertyId);
      setSuccessMessage('Parcel saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save parcel. Please try again.');
      setStep('confirm');
    }
  }, [capturedPhoto, enqueue, isOnline, optimizePhoto, propertyId, remarks, uploadPhoto]);

  const handleViewToday = useCallback(() => {
    navigation.navigate('Today');
  }, [navigation]);

  const renderPermissionState = useMemo(() => {
    if (hasPermission) {
      return null;
    }

    const message =
      status === 'denied'
        ? 'Camera access has been denied. Please enable it in settings to capture parcels.'
        : 'We need access to your camera to capture parcel photos.';

    return (
      <View style={styles.centered}>
        <Text style={[styles.title, {color: theme.colors.text, marginBottom: 12}]}>Camera permission</Text>
        <Text style={[styles.subtitle, {color: theme.colors.muted, textAlign: 'center', marginBottom: 24}]}>{message}</Text>
        <Button
          title={status === 'denied' ? 'Open settings' : 'Grant permission'}
          onPress={status === 'denied' ? handleOpenSettings : requestPermission}
        />
      </View>
    );
  }, [hasPermission, handleOpenSettings, requestPermission, status, theme.colors.muted, theme.colors.text]);

  const canShowCamera = hasPermission && device && step === 'capture';

  if (!propertyId) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.centered}>
          <Text style={[styles.title, {color: theme.colors.text, marginBottom: 8}]}>Property assignment required</Text>
          <Text style={[styles.subtitle, {color: theme.colors.muted, textAlign: 'center', marginBottom: 24}]}>We couldn't find an assigned property for your account. Please contact your administrator or try refreshing your assignment.</Text>
          <Button title="Retry assignment" onPress={() => refreshProfile()} />
        </View>
      </ScreenContainer>
    );
  }

  const cameraContent = canShowCamera ? (
    <View style={styles.cameraWrapper}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={step === 'capture'}
        photo
        onError={handleCameraError}
      />
      <View style={[styles.shutterContainer, {backgroundColor: `${theme.colors.background}aa`}]}>
        <Button title="Capture" onPress={takePhoto} />
      </View>
    </View>
  ) : (
    renderPermissionState ?? (
      <View style={styles.centered}>
        {status === 'granted' && !device ? (
          <ActivityIndicator color={theme.colors.primary} size="large" />
        ) : null}
      </View>
    )
  );

  const photoPreviewUri = capturedPhoto ? ensureFileUri(capturedPhoto.path) : undefined;

  const confirmContent = capturedPhoto ? (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.confirmContent}>
        <View style={styles.previewContainer}>
          <Image source={{uri: photoPreviewUri}} style={styles.previewImage} resizeMode="contain" />
        </View>
        <View style={styles.remarksContainer}>
          <Text style={[styles.label, {color: theme.colors.text}]}>Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add optional notes"
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={3}
            style={[styles.input, {borderColor: theme.colors.border, color: theme.colors.text}]}
          />
        </View>
        {!isOnline ? (
          <Text style={[styles.offlineNotice, {color: theme.colors.muted}]}>You're offline. We'll queue this parcel and sync it once you're connected.</Text>
        ) : null}
        {error ? <Text style={[styles.errorText, {color: theme.colors.notification}]}>{error}</Text> : null}
        <View style={styles.actionsRow}>
          <Button title="Retake" variant="secondary" onPress={resetCapture} style={[styles.actionButton, styles.actionSpacing]} />
          <Button title="Use photo" onPress={handleUsePhoto} style={styles.actionButton} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  ) : null;

  const uploadingContent = (
    <View style={[styles.centered, styles.uploadContainer]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.uploadMessage, {color: theme.colors.text}]}>{uploadState.message}</Text>
      <View style={styles.progressWrapper}>
        <ProgressBar progress={uploadState.progress} />
      </View>
    </View>
  );

  const successSubtitle = successMessage.toLowerCase().includes('queue')
    ? 'We will sync it automatically once you are back online.'
    : 'What would you like to do next?';

  const successContent = (
    <View style={styles.successContainer}>
      <Text style={[styles.title, {color: theme.colors.text}]}>{successMessage}</Text>
      <Text style={[styles.subtitle, {color: theme.colors.muted, textAlign: 'center'}]}>{successSubtitle}</Text>
      <View style={styles.actionsColumn}>
        <Button title="Create another" onPress={resetCapture} style={styles.fullWidthButton} />
        <View style={styles.actionsColumnSpacer} />
        <Button title="View Today" variant="secondary" onPress={handleViewToday} style={[styles.fullWidthButton, styles.successSecondary]} />
      </View>
    </View>
  );

  let content: React.ReactNode;
  if (step === 'uploading') {
    content = uploadingContent;
  } else if (step === 'confirm') {
    content = confirmContent;
  } else if (step === 'success') {
    content = successContent;
  } else {
    content = cameraContent;
  }

  return (
    <ScreenContainer style={styles.container}>
      {content}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  shutterContainer: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  confirmContent: {
    padding: 16,
    flexGrow: 1,
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 3 / 4,
    marginBottom: 16,
  },
  previewImage: {
    flex: 1,
  },
  remarksContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
  },
  actionSpacing: {
    marginRight: 12,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 14,
  },
  offlineNotice: {
    marginBottom: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  uploadContainer: {
    width: '100%',
    paddingHorizontal: 32,
  },
  uploadMessage: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  progressWrapper: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  actionsColumn: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  actionsColumnSpacer: {
    height: 12,
  },
  successSecondary: {
    width: '100%',
  },
  fullWidthButton: {
    width: '100%',
  },
});
