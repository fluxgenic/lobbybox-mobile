import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {CameraView, CameraViewRef, useCameraPermissions} from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';
import {Button} from '@/components/Button';
import {ProgressBar} from '@/components/ProgressBar';
import {useAuth} from '@/context/AuthContext';
import {createParcel, fetchParcelOcrSuggestions, requestParcelUpload} from '@/api/parcels';
import {CreateParcelResponse} from '@/api/types';
import {parseApiError, ParsedApiError} from '@/utils/error';
import {showErrorToast, showToast} from '@/utils/toast';
import {parcelEvents} from '@/events/parcelEvents';
import {AppTabsParamList} from '@/navigation/AppNavigator';

const LONGEST_EDGE_TARGET = 1400;

type Step = 'camera' | 'preview' | 'details' | 'success';

type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
  size?: number;
};

type ParcelFormState = {
  trackingNumber: string;
  recipientName: string;
  mobileNumber: string;
  ocrText: string;
  remarks: string;
  collectedAt: string;
};

const createBlankFormState = (): ParcelFormState => ({
  trackingNumber: '',
  recipientName: '',
  mobileNumber: '',
  ocrText: '',
  remarks: '',
  collectedAt: new Date().toISOString(),
});

const sanitizeInput = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const formatTimestamp = (value: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  } catch (error) {
    return '—';
  }
};

export const CaptureScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const navigation = useNavigation<NavigationProp<AppTabsParamList>>();
  const cameraRef = useRef<CameraViewRef>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('camera');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [formState, setFormState] = useState<ParcelFormState>(() => createBlankFormState());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<ParsedApiError | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastCreatedParcel, setLastCreatedParcel] = useState<CreateParcelResponse | null>(null);
  const {user} = useAuth();
  const propertyId = user?.property?.id ?? null;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const resetFlow = useCallback(() => {
    setStep('camera');
    setPhoto(null);
    setPhotoUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
    setIsSaving(false);
    setFormState(createBlankFormState());
    setLastCreatedParcel(null);
  }, []);

  const ensureDimensions = useCallback(async (uri: string, width?: number, height?: number) => {
    if (width && height) {
      return {width, height};
    }

    return new Promise<{width: number; height: number}>((resolve, reject) => {
      Image.getSize(
        uri,
        (resolvedWidth, resolvedHeight) => {
          resolve({width: resolvedWidth, height: resolvedHeight});
        },
        error => reject(error),
      );
    });
  }, []);

  const optimizePhoto = useCallback(
    async (uri: string, width?: number, height?: number): Promise<CapturedPhoto> => {
      const resolved = await ensureDimensions(uri, width, height);
      const longestEdge = Math.max(resolved.width, resolved.height);
      const shouldResize = longestEdge > LONGEST_EDGE_TARGET;
      const resizeRatio = shouldResize ? LONGEST_EDGE_TARGET / longestEdge : 1;
      const targetWidth = Math.round(resolved.width * resizeRatio);
      const targetHeight = Math.round(resolved.height * resizeRatio);
      const actions = shouldResize
        ? [
            {
              resize: {
                width: targetWidth,
                height: targetHeight,
              },
            },
          ]
        : [];

      const result = await manipulateAsync(uri, actions, {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      const info = await FileSystem.getInfoAsync(result.uri);

      return {
        uri: result.uri,
        width: result.width ?? targetWidth,
        height: result.height ?? targetHeight,
        size: info.exists ? info.size : undefined,
      };
    },
    [ensureDimensions],
  );

  const handleCapture = useCallback(async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    if (!cameraRef.current || isCapturing) {
      return;
    }
    try {
      setIsCapturing(true);
      setIsProcessingPhoto(true);
      const result = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
      });
      const optimized = await optimizePhoto(result.uri, result.width, result.height);
      setPhoto(optimized);
      setFormState(createBlankFormState());
      setPhotoUrl(null);
      setUploadError(null);
      setStep('preview');
    } catch (error) {
      const parsed = parseApiError(error, 'Unable to capture photo.');
      showErrorToast(parsed);
    } finally {
      setIsCapturing(false);
      setIsProcessingPhoto(false);
    }
  }, [permission?.granted, requestPermission, isCapturing, optimizePhoto]);

  const handleUsePhoto = useCallback(async () => {
    if (!photo) {
      return;
    }
    if (!propertyId) {
      showToast('Unable to determine your assigned property.', {type: 'error'});
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const sas = await requestParcelUpload();
      const uploadTask = FileSystem.createUploadTask(
        sas.uploadUrl,
        photo.uri,
        {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': 'image/jpeg',
          },
        },
        ({totalBytesSent, totalBytesExpectedToSend}) => {
          if (totalBytesExpectedToSend > 0) {
            setUploadProgress(totalBytesSent / totalBytesExpectedToSend);
          }
        },
      );
      await uploadTask.uploadAsync();
      setPhotoUrl(sas.blobUrl);
      setUploadProgress(1);

      let suggestions: Partial<ParcelFormState> = {};
      try {
        const response = await fetchParcelOcrSuggestions(sas.blobUrl);
        suggestions = {
          trackingNumber: response.trackingNumber ?? '',
          recipientName: response.recipientName ?? '',
          mobileNumber: response.mobileNumber ?? '',
          ocrText: response.ocrText ?? '',
        };
      } catch (error) {
        const parsed = parseApiError(error, 'Unable to auto-fill from the photo.');
        showToast(parsed.message, {type: 'info'});
      }

      setFormState(prev => ({
        ...prev,
        ...suggestions,
        collectedAt: new Date().toISOString(),
      }));
      setStep('details');
    } catch (error) {
      const parsed = parseApiError(error, 'Unable to upload photo.');
      setUploadError(parsed);
    } finally {
      setIsUploading(false);
    }
  }, [photo, propertyId]);

  const handleSaveParcel = useCallback(async () => {
    if (!propertyId || !photoUrl) {
      showToast('Missing parcel details. Please try again.', {type: 'error'});
      return;
    }

    const collectedDate = new Date(formState.collectedAt);
    const collectedAtIso = Number.isNaN(collectedDate.getTime()) ? new Date().toISOString() : collectedDate.toISOString();

    setIsSaving(true);
    try {
      const created = await createParcel({
        propertyId,
        photoUrl,
        remarks: sanitizeInput(formState.remarks) ?? null,
        mobileNumber: sanitizeInput(formState.mobileNumber) ?? null,
        ocrText: sanitizeInput(formState.ocrText) ?? null,
        trackingNumber: sanitizeInput(formState.trackingNumber) ?? null,
        recipientName: sanitizeInput(formState.recipientName) ?? null,
        collectedAt: collectedAtIso,
      });
      setLastCreatedParcel(created);
      showToast('Parcel saved', {type: 'success'});
      parcelEvents.emitParcelCreated();
      setStep('success');
    } catch (error) {
      const parsed = parseApiError(error, 'Unable to save parcel.');
      showErrorToast(parsed);
    } finally {
      setIsSaving(false);
    }
  }, [formState, photoUrl, propertyId]);

  const handleViewToday = useCallback(() => {
    navigation.navigate('Today');
  }, [navigation]);

  const canRetryUpload = Boolean(uploadError) && !isUploading;

  const permissionStatusView = useMemo(() => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.palette.primary.main} />
          <Text style={[styles.permissionText, {color: theme.roles.text.secondary}]}>Checking camera access…</Text>
        </View>
      );
    }

    if (permission.granted) {
      return null;
    }

    const actionLabel = permission.canAskAgain ? 'Grant camera access' : 'Open settings';
    const actionHandler = permission.canAskAgain
      ? () => {
          requestPermission();
        }
      : () => {
          Linking.openSettings();
        };

    return (
      <View style={styles.centered}>
        <Text style={[styles.permissionTitle, {color: theme.roles.text.primary}]}>Camera access needed</Text>
        <Text style={[styles.permissionText, {color: theme.roles.text.secondary}]}>
          Allow Lobbybox Guard to use the camera so you can capture parcel photos.
        </Text>
        <Button title={actionLabel} onPress={actionHandler} style={styles.permissionButton} />
      </View>
    );
  }, [permission, requestPermission, theme]);

  const renderCameraStep = () => (
    <View style={[styles.cameraWrapper, {paddingTop: insets.top}]}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.cameraOverlay}>
          <Text style={[styles.cameraHint, {color: theme.roles.text.onPrimary}]}>Align the label and tap the shutter</Text>
        </View>
      </View>
      <View style={[styles.cameraControls, {paddingBottom: Math.max(insets.bottom, 24)}]}>
        <TouchableOpacity
          onPress={handleCapture}
          style={[
            styles.shutterButton,
            {
              backgroundColor: theme.roles.text.onPrimary,
              shadowColor: '#000',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Capture parcel photo"
          disabled={isCapturing || isProcessingPhoto}>
          {isCapturing || isProcessingPhoto ? (
            <ActivityIndicator color={theme.roles.text.primary} />
          ) : (
            <MaterialCommunityIcons
              name="camera-iris"
              size={38}
              color={theme.roles.text.primary}
              style={styles.shutterIcon}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewStep = () => {
    if (!photo) {
      return null;
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.select({ios: 'padding', android: undefined})}
        style={styles.flex}
        keyboardVerticalOffset={Platform.select({ios: 24, android: 0})}>
        <ScrollView contentContainerStyle={styles.previewContent}>
          <Image
            source={{uri: photo.uri}}
            style={[styles.previewImage, {aspectRatio: photo.width / photo.height}]}
            resizeMode="contain"
          />
          <View style={styles.previewInfoRow}>
            <Text style={[styles.previewInfoText, {color: theme.roles.text.secondary}]}>Resolution</Text>
            <Text style={[styles.previewInfoValue, {color: theme.roles.text.primary}]}> 
              {photo.width} × {photo.height}
            </Text>
          </View>
          {photo.size ? (
            <View style={styles.previewInfoRow}>
              <Text style={[styles.previewInfoText, {color: theme.roles.text.secondary}]}>File size</Text>
              <Text style={[styles.previewInfoValue, {color: theme.roles.text.primary}]}> 
                {(photo.size / 1024).toFixed(0)} KB
              </Text>
            </View>
          ) : null}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, {color: theme.roles.text.secondary}]}>Remarks</Text>
            <TextInput
              style={[styles.textInput, {color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background}]}
              placeholder="Add notes about this parcel"
              placeholderTextColor={theme.roles.text.secondary}
              value={formState.remarks}
              onChangeText={value => setFormState(prev => ({...prev, remarks: value}))}
              multiline
              numberOfLines={3}
            />
          </View>
          {uploadError ? (
            <Text style={[styles.uploadErrorText, {color: theme.roles.status.error}]}>{uploadError.message}</Text>
          ) : null}
          {isUploading ? (
            <View style={styles.uploadProgressWrapper}>
              <Text style={[styles.uploadLabel, {color: theme.roles.text.secondary}]}>Uploading photo…</Text>
              <ProgressBar progress={uploadProgress} />
              <Text style={[styles.uploadPercent, {color: theme.roles.text.secondary}]}> 
                {Math.round(uploadProgress * 100)}%
              </Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.previewActions}>
          <Button title="Retake" onPress={resetFlow} variant="secondary" disabled={isUploading} />
          <View style={styles.previewSpacing} />
          <Button
            title="Use photo"
            onPress={handleUsePhoto}
            disabled={isUploading}
            accessibilityLabel="Use this photo and continue"
          />
        </View>
        {canRetryUpload ? (
          <View style={styles.retryNotice}>
            <Button title="Try upload again" onPress={handleUsePhoto} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    );
  };

  const renderDetailsStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.select({ios: 'padding', android: undefined})}
      style={styles.flex}
      keyboardVerticalOffset={Platform.select({ios: 24, android: 0})}>
      <ScrollView contentContainerStyle={styles.detailsContent}>
        <Text style={[styles.detailsTitle, {color: theme.roles.text.primary}]}>Confirm parcel details</Text>
        <Text style={[styles.detailsSubtitle, {color: theme.roles.text.secondary}]}>Review the OCR suggestions and update as needed.</Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, {color: theme.roles.text.secondary}]}>Tracking number</Text>
          <TextInput
            style={[styles.textInput, {color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background}]}
            value={formState.trackingNumber}
            onChangeText={value => setFormState(prev => ({...prev, trackingNumber: value}))}
            placeholder="Enter tracking number"
            placeholderTextColor={theme.roles.text.secondary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, {color: theme.roles.text.secondary}]}>Recipient name</Text>
          <TextInput
            style={[styles.textInput, {color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background}]}
            value={formState.recipientName}
            onChangeText={value => setFormState(prev => ({...prev, recipientName: value}))}
            placeholder="Enter recipient name"
            placeholderTextColor={theme.roles.text.secondary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, {color: theme.roles.text.secondary}]}>Mobile number</Text>
          <TextInput
            style={[styles.textInput, {color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background}]}
            value={formState.mobileNumber}
            keyboardType="phone-pad"
            onChangeText={value => setFormState(prev => ({...prev, mobileNumber: value}))}
            placeholder="Enter mobile number"
            placeholderTextColor={theme.roles.text.secondary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, {color: theme.roles.text.secondary}]}>OCR text</Text>
          <TextInput
            style={[styles.textInputMultiline, {color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background}]}
            value={formState.ocrText}
            onChangeText={value => setFormState(prev => ({...prev, ocrText: value}))}
            placeholder="Recognized text from the label"
            placeholderTextColor={theme.roles.text.secondary}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, {color: theme.roles.text.secondary}]}>Remarks</Text>
          <TextInput
            style={[styles.textInputMultiline, {color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background}]}
            value={formState.remarks}
            onChangeText={value => setFormState(prev => ({...prev, remarks: value}))}
            placeholder="Add any additional notes"
            placeholderTextColor={theme.roles.text.secondary}
            multiline
            numberOfLines={3}
          />
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, {color: theme.roles.text.secondary}]}>Collected at</Text>
          <Text style={[styles.summaryValue, {color: theme.roles.text.primary}]}>{formatTimestamp(formState.collectedAt)}</Text>
        </View>
      </ScrollView>
      <View style={styles.detailsActions}>
        <Button title="Back" onPress={() => setStep('preview')} variant="secondary" disabled={isSaving} />
        <View style={styles.previewSpacing} />
        <Button title="Save parcel" onPress={handleSaveParcel} disabled={isSaving} />
      </View>
      {isSaving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={theme.roles.text.onPrimary} size="large" />
          <Text style={[styles.savingText, {color: theme.roles.text.onPrimary}]}>Saving parcel…</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );

  const renderSuccessStep = () => (
    <ScrollView contentContainerStyle={styles.successContent}>
      <Text style={[styles.successTitle, {color: theme.roles.text.primary}]}>Parcel recorded</Text>
      <Text style={[styles.successSubtitle, {color: theme.roles.text.secondary}]}>You can capture another or review today's log.</Text>
      {photo ? (
        <Image
          source={{uri: photo.uri}}
          style={[styles.successImage, {aspectRatio: photo.width / photo.height}]}
          resizeMode="contain"
        />
      ) : null}
      {lastCreatedParcel ? (
        <View style={[styles.successSummary, {borderColor: theme.roles.card.border, backgroundColor: theme.roles.card.background}]}> 
          {lastCreatedParcel.recipientName ? (
            <Text style={[styles.successSummaryText, {color: theme.roles.text.primary}]}>Recipient: {lastCreatedParcel.recipientName}</Text>
          ) : null}
          {lastCreatedParcel.trackingNumber ? (
            <Text style={[styles.successSummaryText, {color: theme.roles.text.primary}]}>Tracking #: {lastCreatedParcel.trackingNumber}</Text>
          ) : null}
          {lastCreatedParcel.remarks ? (
            <Text style={[styles.successSummaryText, {color: theme.roles.text.secondary}]}>Remarks: {lastCreatedParcel.remarks}</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.successActions}>
        <Button title="Create another" onPress={resetFlow} />
        <View style={styles.previewSpacing} />
        <Button title="View Today" onPress={handleViewToday} variant="secondary" />
      </View>
    </ScrollView>
  );

  let content: React.ReactNode = null;
  if (permissionStatusView) {
    content = permissionStatusView;
  } else {
    switch (step) {
      case 'camera':
        content = renderCameraStep();
        break;
      case 'preview':
        content = renderPreviewStep();
        break;
      case 'details':
        content = renderDetailsStep();
        break;
      case 'success':
        content = renderSuccessStep();
        break;
      default:
        content = null;
    }
  }

  return (
    <ScreenContainer style={styles.screen} edges={step === 'camera' ? ['left', 'right'] : undefined}>
      {content}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 0,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
  permissionButton: {
    marginTop: 24,
    minWidth: 180,
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraHint: {
    fontSize: 16,
    fontWeight: '600',
  },
  cameraControls: {
    paddingTop: 12,
    alignItems: 'center',
  },
  shutterButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  shutterIcon: {
    marginLeft: 2,
  },
  previewContent: {
    padding: 24,
  },
  previewImage: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'black',
  },
  previewInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  previewInfoText: {
    fontSize: 14,
  },
  previewInfoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textInputMultiline: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 24,
  },
  previewSpacing: {
    width: 12,
  },
  uploadProgressWrapper: {
    marginTop: 24,
  },
  uploadLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  uploadPercent: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadErrorText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  retryNotice: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  detailsContent: {
    padding: 24,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  detailsSubtitle: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: 20,
  },
  detailsActions: {
    flexDirection: 'row',
    padding: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  successContent: {
    padding: 24,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  successImage: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'black',
  },
  successSummary: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  successSummaryText: {
    fontSize: 15,
    marginBottom: 6,
  },
  successActions: {
    flexDirection: 'row',
    marginTop: 24,
  },
});
