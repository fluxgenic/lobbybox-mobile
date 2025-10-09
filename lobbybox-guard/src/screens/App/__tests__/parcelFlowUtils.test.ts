import assert from 'node:assert/strict';
import {getUsePhotoButtonState, validateParcelForm} from '../parcelFlowUtils';

type TestCase = {name: string; fn: () => void};

const tests: TestCase[] = [];

const buildValidForm = () => ({
  trackingNumber: 'TRK123456',
  recipientName: 'Jane Doe',
  mobileNumber: '0123456789',
  remarks: 'Unit 10-2',
});

const addTest = (name: string, fn: () => void) => {
  tests.push({name, fn});
};

addTest('validateParcelForm returns no errors for a valid form', () => {
  const result = validateParcelForm(buildValidForm());

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.cleanedValues.mobileNumber, '0123456789');
});

addTest('validateParcelForm flags missing required fields', () => {
  const result = validateParcelForm({
    trackingNumber: '   ',
    recipientName: '',
    mobileNumber: '   ',
    remarks: ' ',
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.errors, {
    trackingNumber: 'Tracking number is required.',
    recipientName: 'Recipient name is required.',
    mobileNumber: 'Mobile number is required.',
    remarks: 'Remark/Unit is required.',
  });
});

addTest('validateParcelForm rejects mobile numbers outside 9-11 digits', () => {
  const tooShort = validateParcelForm({...buildValidForm(), mobileNumber: '12345678'});
  const tooLong = validateParcelForm({...buildValidForm(), mobileNumber: '123456789012'});
  const withLetters = validateParcelForm({...buildValidForm(), mobileNumber: '12345abcde'});

  [tooShort, tooLong, withLetters].forEach(result => {
    assert.equal(result.isValid, false);
    assert.equal(result.errors.mobileNumber, 'Enter a mobile number with 9 to 11 digits.');
  });
});

addTest('getUsePhotoButtonState disables and shows loader while uploading', () => {
  const state = getUsePhotoButtonState({isUploading: true});

  assert.equal(state.disabled, true);
  assert.equal(state.showLoader, true);
});

addTest('getUsePhotoButtonState enables button when idle', () => {
  const state = getUsePhotoButtonState({isUploading: false});

  assert.equal(state.disabled, false);
  assert.equal(state.showLoader, false);
});

let hasFailure = false;

for (const {name, fn} of tests) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    hasFailure = true;
    console.error(`❌ ${name}`);
    console.error(error);
  }
}

if (hasFailure) {
  process.exitCode = 1;
}
