import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, CameraViewRef, useCameraPermissions } from 'expo-camera';
import { createUploadTask, getInfoAsync } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useThemeContext } from '@/theme';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/context/AuthContext';
import { createParcel, fetchParcelOcrSuggestions, requestParcelUpload } from '@/api/parcels';
import { CreateParcelRequest, CreateParcelResponse } from '@/api/types';
import { parseApiError, ParsedApiError } from '@/utils/error';
import { parseRawTextToFields } from '@/utils/parcelOcrParser';
import { showErrorToast, showToast } from '@/utils/toast';
import { parcelEvents } from '@/events/parcelEvents';
import { AppTabsParamList } from '@/navigation/AppNavigator';
import {
  ParcelFormErrors,
  ParcelFormValues,
  getUsePhotoButtonState,
  validateParcelForm,
} from './parcelFlowUtils';

const LONGEST_EDGE_TARGET = 1400;

let loggedManipulatorUnavailable = false;
let loggedManipulatorFailure = false;

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
  logisticSource: string;
  ocrText: string;
  remarks: string;
  collectedAt: string;
};

type ParcelFieldKey = keyof ParcelFormValues;

type EntryMode = 'photo' | 'manual';

const createBlankFormState = (): ParcelFormState => ({
  trackingNumber: '',
  recipientName: '',
  mobileNumber: '',
  logisticSource: '',
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

const parseOcrTextSuggestions = (ocrText: string | undefined | null): Partial<ParcelFormState> => {
  if (!ocrText) {
    return {};
  }

  const parsed = parseRawTextToFields(ocrText);
  const result: Partial<ParcelFormState> = {};

  if (parsed.trackingNumber?.value) {
    result.trackingNumber = parsed.trackingNumber.value;
  }

  if (parsed.recipientName?.value) {
    result.recipientName = parsed.recipientName.value;
  }

  if (parsed.mobileNumber?.value) {
    result.mobileNumber = parsed.mobileNumber.value;
  }

  if (parsed.remarks?.value) {
    result.remarks = parsed.remarks.value;
  } else if (parsed.addressLine?.value) {
    result.remarks = parsed.addressLine.value;
  }

  return result;
};

export const CaptureScreen: React.FC = () => {
  const { theme } = useThemeContext();
  const navigation = useNavigation<NavigationProp<AppTabsParamList>>();
  const cameraRef = useRef<CameraViewRef>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('camera');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [formState, setFormState] = useState<ParcelFormState>(() => createBlankFormState());
  const [formErrors, setFormErrors] = useState<ParcelFormErrors>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<ParsedApiError | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastCreatedParcel, setLastCreatedParcel] = useState<CreateParcelResponse | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>('photo');
  const { user } = useAuth();
  const propertyId = user?.property?.id ?? user?.tenantId ?? null;
  const scanningProgress = useRef(new Animated.Value(0)).current;
  const scanningAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const detailsScrollViewRef = useRef<ScrollView | null>(null);
  const trackingNumberInputRef = useRef<TextInput | null>(null);
  const recipientNameInputRef = useRef<TextInput | null>(null);
  const mobileNumberInputRef = useRef<TextInput | null>(null);
  const remarksInputRef = useRef<TextInput | null>(null);
  const fieldLayoutsRef = useRef<Partial<Record<ParcelFieldKey, number>>>({});

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const shouldAnimate = isCapturing || isProcessingPhoto;

    if (shouldAnimate) {
      scanningProgress.setValue(0);
      const animation = Animated.loop(
        Animated.timing(scanningProgress, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      );
      scanningAnimationRef.current = animation;
      animation.start();
    } else if (scanningAnimationRef.current) {
      scanningAnimationRef.current.stop();
      scanningAnimationRef.current = null;
      scanningProgress.setValue(0);
    }

    return () => {
      if (scanningAnimationRef.current) {
        scanningAnimationRef.current.stop();
        scanningAnimationRef.current = null;
      }
      scanningProgress.setValue(0);
    };
  }, [isCapturing, isProcessingPhoto, scanningProgress]);

  const resetFlow = useCallback(() => {
    setEntryMode('photo');
    setStep('camera');
    setPhoto(null);
    setPhotoUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
    setIsSaving(false);
    setFormState(createBlankFormState());
    setFormErrors({});
    setLastCreatedParcel(null);
    fieldLayoutsRef.current = {};
  }, []);

  const beginManualEntry = useCallback(() => {
    setEntryMode('manual');
    setStep('details');
    setPhoto(null);
    setPhotoUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
    setIsSaving(false);
    setFormState(createBlankFormState());
    setFormErrors({});
    setLastCreatedParcel(null);
    fieldLayoutsRef.current = {};
  }, []);

  const returnToCamera = useCallback(() => {
    setEntryMode('photo');
    setStep('camera');
    setPhoto(null);
    setPhotoUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
    setIsSaving(false);
    setFormErrors({});
    setFormState(createBlankFormState());
    setLastCreatedParcel(null);
    fieldLayoutsRef.current = {};
  }, []);

  const handleFieldLayout = useCallback(
    (field: ParcelFieldKey) => (event: LayoutChangeEvent) => {
      fieldLayoutsRef.current[field] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToField = useCallback(
    (field: ParcelFieldKey) => {
      const offset = fieldLayoutsRef.current[field];
      if (typeof offset === 'number') {
        detailsScrollViewRef.current?.scrollTo({ y: Math.max(offset - 16, 0), animated: true });
      }
    },
    [],
  );

  const focusField = useCallback(
    (field: ParcelFieldKey) => {
      switch (field) {
        case 'trackingNumber':
          trackingNumberInputRef.current?.focus();
          break;
        case 'recipientName':
          recipientNameInputRef.current?.focus();
          break;
        case 'mobileNumber':
          mobileNumberInputRef.current?.focus();
          break;
        case 'remarks':
          remarksInputRef.current?.focus();
          break;
        default:
          break;
      }
    },
    [],
  );

  const clearFieldError = useCallback((field: ParcelFieldKey) => {
    setFormErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const next = {...prev};
      delete next[field];
      return next;
    });
  }, []);

  const ensureDimensions = useCallback(async (uri: string, width?: number, height?: number) => {
    if (width && height) {
      return { width, height };
    }

    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        uri,
        (resolvedWidth, resolvedHeight) => {
          resolve({ width: resolvedWidth, height: resolvedHeight });
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

      let result: { uri: string; width?: number; height?: number } = { uri };
      let manipulated = false;

      if (actions.length > 0 && Platform.OS !== 'web') {
        if (typeof ImageManipulator.manipulateAsync === 'function') {
          try {
            const options: Parameters<typeof ImageManipulator.manipulateAsync>[2] = {
              compress: 0.8,
              ...(ImageManipulator.SaveFormat?.JPEG ? { format: ImageManipulator.SaveFormat.JPEG } : {}),
            };

            result = await ImageManipulator.manipulateAsync(uri, actions, options);
            manipulated = true;
          } catch (error) {
            if (!loggedManipulatorFailure) {
              console.warn(
                'expo-image-manipulator failed; returning original photo without resizing or compression.',
                error,
              );
              loggedManipulatorFailure = true;
            }
          }
        } else if (!loggedManipulatorUnavailable) {
          console.warn('expo-image-manipulator is unavailable; returning original photo without resizing.');
          loggedManipulatorUnavailable = true;
        }
      }

      const resolvedUri = result.uri ?? uri;
      const info = await getInfoAsync(resolvedUri);

      return {
        uri: resolvedUri,
        width: result.width ?? (manipulated ? targetWidth : resolved.width),
        height: result.height ?? (manipulated ? targetHeight : resolved.height),
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
      setEntryMode('photo');
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
    console.log('[CaptureScreen] handleUsePhoto invoked');

    if (!photo) {
      console.warn('[CaptureScreen] handleUsePhoto called without an available photo.');
      return;
    }

    if (isUploading) {
      console.log('[CaptureScreen] handleUsePhoto aborted because an upload is already in progress.');
      return;
    }

    if (!propertyId) {
      console.warn('[CaptureScreen] Unable to determine property while using photo.');
      showToast('Unable to determine your assigned property.', { type: 'error' });
      return;
    }

    console.log('[CaptureScreen] Starting upload for photo', {
      uri: photo.uri,
      width: photo.width,
      height: photo.height,
      size: photo.size,
    });

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      console.log('[CaptureScreen] Requesting SAS for parcel upload.');
      const sas = await requestParcelUpload();
      console.log('[CaptureScreen] Received SAS response', {
        hasUploadUrl: Boolean(sas.uploadUrl),
        hasBlobUrl: Boolean(sas.blobUrl),
      });

      let lastLoggedProgressBucket = -1;
      const uploadTask = createUploadTask(
        sas.uploadUrl,
        photo.uri,
        {
          httpMethod: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg',
            'x-ms-blob-type': 'BlockBlob',
          },
        },
        ({ totalBytesSent, totalBytesExpectedToSend }) => {
          if (totalBytesExpectedToSend > 0) {
            const progress = totalBytesSent / totalBytesExpectedToSend;
            setUploadProgress(progress);

            const progressBucket = Math.round(progress * 10);
            if (progressBucket !== lastLoggedProgressBucket) {
              console.log('[CaptureScreen] Upload progress', {
                sent: totalBytesSent,
                expected: totalBytesExpectedToSend,
                progress,
              });
              lastLoggedProgressBucket = progressBucket;
            }
          }
        },
      );

      console.log('[CaptureScreen] Beginning upload task.');
      await uploadTask.uploadAsync();
      console.log('[CaptureScreen] Upload task completed successfully.');

      setPhotoUrl(sas.blobUrl);
      setUploadProgress(1);

      let suggestions: Partial<ParcelFormState> = {};
      try {
        console.log('[CaptureScreen] Requesting OCR suggestions for uploaded photo.', sas.readUrl);
        const response = await fetchParcelOcrSuggestions(sas.readUrl);
        console.log('[CaptureScreen] Received OCR suggestions', response);

        suggestions = {
          trackingNumber: response.trackingNumber ?? '',
          recipientName: response.customerName ?? '',
          mobileNumber: response.mobileNumber ?? '',
          ocrText: response.ocrText ?? '',
          remarks: response.unit ?? '',
          logisticSource: response.logisticSource?.trim() ?? '',
        };
      } catch (error) {
        console.error('[CaptureScreen] Failed to fetch OCR suggestions', error);
        const parsed = parseApiError(error, 'Unable to auto-fill from the photo.');
        showToast(parsed.message, { type: 'info' });
      }

      setFormState(prev => ({
        ...prev,
        ...suggestions,
        collectedAt: new Date().toISOString(),
      }));
      setEntryMode('photo');
      setStep('details');
      setFormErrors({});
      fieldLayoutsRef.current = {};
      console.log('[CaptureScreen] handleUsePhoto completed successfully.');
    } catch (error) {
      console.error('[CaptureScreen] Upload failed', error);
      const parsed = parseApiError(error, 'Unable to upload photo.');
      setUploadError(parsed);
    } finally {
      setIsUploading(false);
      console.log('[CaptureScreen] handleUsePhoto finished');
    }
  }, [isUploading, photo, propertyId]);

  const handleSaveParcel = useCallback(async () => {
    if (!propertyId) {
      showToast('Unable to determine your assigned property.', { type: 'error' });
      return;
    }

    if (entryMode === 'photo' && !photoUrl) {
      showToast('Missing parcel photo. Please try again.', { type: 'error' });
      return;
    }

    const validation = validateParcelForm({
      trackingNumber: formState.trackingNumber,
      recipientName: formState.recipientName,
      mobileNumber: formState.mobileNumber,
      remarks: formState.remarks,
    });

    setFormErrors(validation.errors);

    if (!validation.isValid) {
      const firstInvalid = (['trackingNumber', 'recipientName', 'mobileNumber', 'remarks'] as ParcelFieldKey[]).find(
        field => Boolean(validation.errors[field]),
      );

      if (firstInvalid) {
        scrollToField(firstInvalid);
        focusField(firstInvalid);
      }
      return;
    }

    const { cleanedValues } = validation;
    setFormState(prev => ({ ...prev, ...cleanedValues }));

    const collectedDate = new Date(formState.collectedAt);
    const collectedAtIso = Number.isNaN(collectedDate.getTime()) ? new Date().toISOString() : collectedDate.toISOString();

    setIsSaving(true);
    try {
      const payload: CreateParcelRequest = {
        propertyId,
        remarks: sanitizeInput(cleanedValues.remarks) ?? null,
        mobileNumber: sanitizeInput(cleanedValues.mobileNumber) ?? null,
        ocrText: '',
        trackingNumber: sanitizeInput(cleanedValues.trackingNumber) ?? null,
        recipientName: sanitizeInput(cleanedValues.recipientName) ?? null,
        logisticSource: sanitizeInput(formState.logisticSource) ?? null,
        collectedAt: collectedAtIso,
      };

      if (photoUrl) {
        payload.photoUrl = photoUrl;
      }

      const created = await createParcel(payload);
      setLastCreatedParcel(created);
      showToast('Parcel saved', { type: 'success' });
      parcelEvents.emitParcelCreated();
      setStep('success');
      setFormErrors({});
    } catch (error) {
      const parsed = parseApiError(error, 'Unable to save parcel.');
      showErrorToast(parsed);
    } finally {
      setIsSaving(false);
    }
  }, [entryMode, focusField, formState, photoUrl, propertyId, scrollToField]);

  const handleViewToday = useCallback(() => {
    navigation.navigate('Today');
  }, [navigation]);

  const canRetryUpload = Boolean(uploadError) && !isUploading;
  const usePhotoButtonState = useMemo(() => getUsePhotoButtonState({ isUploading }), [isUploading]);

  const permissionStatusView = useMemo(() => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.palette.primary.main} />
          <Text style={[styles.permissionText, { color: theme.roles.text.secondary }]}>Checking camera access…</Text>
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
        <Text style={[styles.permissionTitle, { color: theme.roles.text.primary }]}>Camera access needed</Text>
        <Text style={[styles.permissionText, { color: theme.roles.text.secondary }]}>
          Allow Lobbybox Guard to use the camera so you can capture parcel photos.
        </Text>
        <Button title={actionLabel} onPress={actionHandler} style={styles.permissionButton} />
      </View>
    );
  }, [permission, requestPermission, theme]);

  const shutterIconColor = useMemo(
    () => (theme.mode === 'light' ? theme.palette.secondary.contrastText : theme.roles.text.primary),
    [theme],
  );

  const topContentPadding = Math.max(8 - insets.top, 0);
  const renderCameraStep = () => (
    <View style={[styles.cameraWrapper, { paddingTop: insets.top }]}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.cameraOverlay}>
          <Text style={[styles.cameraHint, { color: theme.roles.text.onPrimary }]}>Align the label and tap the shutter</Text>
        </View>
        {(isCapturing || isProcessingPhoto) && (
          <View style={styles.scannerOverlay} pointerEvents="none">
            <Animated.View
              style={[
                styles.scannerBar,
                {
                  transform: [
                    {
                      translateY: scanningProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-160, 160],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        )}
      </View>
      <View style={[styles.cameraControls, { paddingBottom: Math.max(insets.bottom, 24) }]}>
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
            <ActivityIndicator color={shutterIconColor} />
          ) : (
            <MaterialCommunityIcons
              name="camera-iris"
              size={38}
              color={shutterIconColor}
              style={styles.shutterIcon}
            />
          )}
        </TouchableOpacity>
        <Button
          title="Add manually"
          onPress={beginManualEntry}
          variant="secondary"
          style={styles.manualButton}
          accessibilityLabel="Add a parcel manually without taking a photo"
          disabled={isCapturing || isProcessingPhoto}
        />
      </View>
    </View>
  );

  const renderPreviewStep = () => {
    if (!photo) {
      return null;
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
        keyboardVerticalOffset={Platform.select({ ios: insets.top, android: 0 })}>
        <ScrollView
          contentContainerStyle={[
            styles.previewContent,
            {
              paddingTop: topContentPadding,
              paddingBottom: 24 + Math.max(insets.bottom - 8, 0),
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled">
          <Image
            source={{ uri: photo.uri }}
            style={[styles.previewImage, { aspectRatio: photo.width / photo.height }]}
            resizeMode="contain"
          />
          <View style={styles.previewInfoRow}>
            <Text style={[styles.previewInfoText, { color: theme.roles.text.secondary }]}>Resolution</Text>
            <Text style={[styles.previewInfoValue, { color: theme.roles.text.primary }]}>
              {photo.width} × {photo.height}
            </Text>
          </View>
          {photo.size ? (
            <View style={styles.previewInfoRow}>
              <Text style={[styles.previewInfoText, { color: theme.roles.text.secondary }]}>File size</Text>
              <Text style={[styles.previewInfoValue, { color: theme.roles.text.primary }]}>
                {(photo.size / 1024).toFixed(0)} KB
              </Text>
            </View>
          ) : null}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.roles.text.secondary }]}>Remark/Unit</Text>
            <TextInput
              style={[styles.textInput, { color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background }]}
              placeholder="Add any remark or unit (e.g., C-28-12)"
              placeholderTextColor={theme.roles.text.secondary}
              value={formState.remarks}
              onChangeText={value => {
                setFormState(prev => ({ ...prev, remarks: value }));
                clearFieldError('remarks');
              }}
              multiline
              numberOfLines={3}
            />
          </View>
          {uploadError ? (
            <Text style={[styles.uploadErrorText, { color: theme.roles.status.error }]}>{uploadError.message}</Text>
          ) : null}
          {isUploading ? (
            <View style={styles.uploadProgressWrapper}>
              <Text style={[styles.uploadLabel, { color: theme.roles.text.secondary }]}>Uploading photo…</Text>
              <ProgressBar progress={uploadProgress} />
              <Text style={[styles.uploadPercent, { color: theme.roles.text.secondary }]}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.previewActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button title="Retake" onPress={resetFlow} variant="secondary" disabled={isUploading} />
          <View style={styles.previewSpacing} />
          <Button
            title="Use photo"
            onPress={handleUsePhoto}
            disabled={usePhotoButtonState.disabled}
            loading={usePhotoButtonState.showLoader}
            loadingText="Processing…"
            loadingLabel="Processing photo…"
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
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.flex}
      keyboardVerticalOffset={Platform.select({ ios: insets.top, android: 0 })}>
      <ScrollView
        ref={detailsScrollViewRef}
        contentContainerStyle={[
          styles.detailsContent,
          {
            paddingTop: topContentPadding,
            paddingBottom: 32 + Math.max(insets.bottom - 12, 0),
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.detailsTitle, { color: theme.roles.text.primary }]}>
          {entryMode === 'manual' ? 'Enter parcel details' : 'Confirm parcel details'}
        </Text>
        <Text style={[styles.detailsSubtitle, { color: theme.roles.text.secondary }]}>
          {entryMode === 'manual'
            ? 'Fill in the parcel information to log it without a photo.'
            : 'Review the OCR suggestions and update as needed.'}
        </Text>
        <View style={styles.sectionSpacing} />
        <View style={styles.formFieldsWrapper}>
          <View style={styles.inputGroup} onLayout={handleFieldLayout('trackingNumber')}>
            <Text style={[styles.inputLabel, { color: theme.roles.text.secondary }]}>Tracking number</Text>
            <TextInput
              ref={trackingNumberInputRef}
              style={[styles.textInput, { color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background }]}
              value={formState.trackingNumber}
              onChangeText={value => {
                setFormState(prev => ({ ...prev, trackingNumber: value }));
                clearFieldError('trackingNumber');
              }}
              placeholder="Enter tracking number"
              placeholderTextColor={theme.roles.text.secondary}
              returnKeyType="next"
            />
            {formErrors.trackingNumber ? (
              <Text style={[styles.errorText, { color: theme.roles.status.error }]}>{formErrors.trackingNumber}</Text>
            ) : null}
          </View>
          <View style={styles.inputGroup} onLayout={handleFieldLayout('recipientName')}>
            <Text style={[styles.inputLabel, { color: theme.roles.text.secondary }]}>Recipient name</Text>
            <TextInput
              ref={recipientNameInputRef}
              style={[styles.textInput, { color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background }]}
              value={formState.recipientName}
              onChangeText={value => {
                setFormState(prev => ({ ...prev, recipientName: value }));
                clearFieldError('recipientName');
              }}
              placeholder="Enter recipient name"
              placeholderTextColor={theme.roles.text.secondary}
              returnKeyType="next"
            />
            {formErrors.recipientName ? (
              <Text style={[styles.errorText, { color: theme.roles.status.error }]}>{formErrors.recipientName}</Text>
            ) : null}
          </View>
          <View style={styles.inputGroup} onLayout={handleFieldLayout('mobileNumber')}>
            <Text style={[styles.inputLabel, { color: theme.roles.text.secondary }]}>Mobile number</Text>
            <TextInput
              ref={mobileNumberInputRef}
              style={[styles.textInput, { color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background }]}
              value={formState.mobileNumber}
              keyboardType="phone-pad"
              onChangeText={value => {
                setFormState(prev => ({ ...prev, mobileNumber: value }));
                clearFieldError('mobileNumber');
              }}
              placeholder="Enter mobile number"
              placeholderTextColor={theme.roles.text.secondary}
              returnKeyType="next"
            />
            {formErrors.mobileNumber ? (
              <Text style={[styles.errorText, { color: theme.roles.status.error }]}>{formErrors.mobileNumber}</Text>
            ) : null}
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.roles.text.secondary }]}>Logistic</Text>
            <TextInput
              style={[styles.textInput, { color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background }]}
              value={formState.logisticSource}
              onChangeText={value => {
                setFormState(prev => ({ ...prev, logisticSource: value }));
              }}
              placeholder="Detected logistic from label"
              placeholderTextColor={theme.roles.text.secondary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inputGroup} onLayout={handleFieldLayout('remarks')}>
            <Text style={[styles.inputLabel, { color: theme.roles.text.secondary }]}>Remark/Unit</Text>
            <TextInput
              ref={remarksInputRef}
              style={[styles.textInputMultiline, { color: theme.roles.text.primary, borderColor: theme.roles.card.border, backgroundColor: theme.roles.input.background }]}
              value={formState.remarks}
              onChangeText={value => {
                setFormState(prev => ({ ...prev, remarks: value }));
                clearFieldError('remarks');
              }}
              placeholder="Add any remark or unit (e.g., C-28-12)"
              placeholderTextColor={theme.roles.text.secondary}
              multiline
              numberOfLines={3}
            />
            {formErrors.remarks ? (
              <Text style={[styles.errorText, { color: theme.roles.status.error }]}>{formErrors.remarks}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.roles.text.secondary }]}>Collected at</Text>
          <Text style={[styles.summaryValue, { color: theme.roles.text.primary }]}>{formatTimestamp(formState.collectedAt)}</Text>
        </View>
      </ScrollView>
      <View style={[styles.detailsActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title={entryMode === 'manual' ? 'Back to camera' : 'Back'}
          onPress={entryMode === 'manual' ? returnToCamera : () => setStep('preview')}
          variant="secondary"
          disabled={isSaving}
        />
        <View style={styles.previewSpacing} />
        <Button title="Save parcel" onPress={handleSaveParcel} disabled={isSaving} />
      </View>
      {isSaving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={theme.roles.text.onPrimary} size="large" />
          <Text style={[styles.savingText, { color: theme.roles.text.onPrimary }]}>Saving parcel…</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );

  const renderSuccessStep = () => (
    <ScrollView
      contentContainerStyle={[
        styles.successContent,
        {
          paddingTop: topContentPadding,
          paddingBottom: 24 + Math.max(insets.bottom - 8, 0),
        },
      ]}
      contentInsetAdjustmentBehavior="never">
      <Text style={[styles.successTitle, { color: theme.roles.text.primary }]}>Parcel recorded</Text>
      <Text style={[styles.successSubtitle, { color: theme.roles.text.secondary }]}>You can capture another or review today's log.</Text>
      {photo ? (
        <Image
          source={{ uri: photo.uri }}
          style={[styles.successImage, { aspectRatio: photo.width / photo.height }]}
          resizeMode="contain"
        />
      ) : null}
      {lastCreatedParcel ? (
        <View style={[styles.successSummary, { borderColor: theme.roles.card.border, backgroundColor: theme.roles.card.background }]}>
          {lastCreatedParcel.recipientName ? (
            <Text style={[styles.successSummaryText, { color: theme.roles.text.primary }]}>Recipient: {lastCreatedParcel.recipientName}</Text>
          ) : null}
          {lastCreatedParcel.trackingNumber ? (
            <Text style={[styles.successSummaryText, { color: theme.roles.text.primary }]}>Tracking #: {lastCreatedParcel.trackingNumber}</Text>
          ) : null}
          {lastCreatedParcel.remarks ? (
            <Text style={[styles.successSummaryText, { color: theme.roles.text.secondary }]}>Remarks: {lastCreatedParcel.remarks}</Text>
          ) : null}
          {lastCreatedParcel.logisticSource ? (
            <Text style={[styles.successSummaryText, { color: theme.roles.text.secondary }]}>Logistic: {lastCreatedParcel.logisticSource}</Text>
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
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  scannerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 120,
    marginHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  manualButton: {
    marginTop: 16,
    minWidth: 200,
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  sectionSpacing: {
    height: 8,
  },
  formFieldsWrapper: {
    width: '100%',
  },
  inputGroup: {
    marginTop: 16,
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
  errorText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
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
    paddingHorizontal: 24,
    paddingTop: 16,
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
    flexGrow: 1,
    paddingHorizontal: 24,
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
