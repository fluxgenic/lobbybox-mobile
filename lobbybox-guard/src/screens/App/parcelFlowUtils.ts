export type ParcelFormValues = {
  trackingNumber: string;
  recipientName: string;
  mobileNumber: string;
  remarks: string;
};

export type ParcelFormErrors = Partial<Record<keyof ParcelFormValues, string>>;

export type ParcelFormValidationResult = {
  cleanedValues: ParcelFormValues;
  errors: ParcelFormErrors;
  isValid: boolean;
};

const REQUIRED_MESSAGES: Record<keyof ParcelFormValues, string> = {
  trackingNumber: 'Tracking number is required.',
  recipientName: 'Recipient name is required.',
  mobileNumber: 'Mobile number is required.',
  remarks: 'Remark/Unit is required.',
};

const MOBILE_NUMBER_PATTERN = /^\d{9,11}$/;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const validateParcelForm = (values: ParcelFormValues): ParcelFormValidationResult => {
  const cleanedValues: ParcelFormValues = {
    trackingNumber: normalizeWhitespace(values.trackingNumber),
    recipientName: normalizeWhitespace(values.recipientName),
    mobileNumber: values.mobileNumber.trim(),
    remarks: normalizeWhitespace(values.remarks),
  };

  const errors: ParcelFormErrors = {};

  (Object.keys(cleanedValues) as Array<keyof ParcelFormValues>).forEach(key => {
    if (!cleanedValues[key]) {
      errors[key] = REQUIRED_MESSAGES[key];
    }
  });

  if (cleanedValues.mobileNumber) {
    const digitsOnly = cleanedValues.mobileNumber.replace(/\s+/g, '');
    if (!MOBILE_NUMBER_PATTERN.test(digitsOnly)) {
      errors.mobileNumber = 'Enter a mobile number with 9 to 11 digits.';
    } else {
      cleanedValues.mobileNumber = digitsOnly;
    }
  }

  return {
    cleanedValues,
    errors,
    isValid: Object.values(errors).every(message => !message),
  };
};

export const getUsePhotoButtonState = ({
  isUploading,
}: {
  isUploading: boolean;
}) => {
  const showLoader = isUploading;
  return {
    disabled: isUploading,
    showLoader,
  };
};
