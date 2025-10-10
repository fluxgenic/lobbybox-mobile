import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {z} from 'zod';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';
import api from '@/api/client';
import {parseApiError} from '@/utils/error';
import {showToast} from '@/utils/toast';
import {Button} from '@/components/Button';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ProfileStackParamList} from '@/navigation/AppNavigator';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Use letters and numbers for a stronger password'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const {theme} = useThemeContext();
  const [form, setForm] = useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = async () => {
    try {
      schema.parse(form);
      setErrors({});
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const nextErrors: FormErrors = {};
        validationError.errors.forEach(issue => {
          if (issue.path[0]) {
            const key = issue.path[0] as keyof FormState;
            nextErrors[key] = issue.message;
          }
        });
        setErrors(nextErrors);
        if (validationError.errors[0]) {
          showToast(validationError.errors[0].message, {type: 'error'});
        }
      }
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      showToast('Password updated successfully', {type: 'success'});
      navigation.goBack();
    } catch (error) {
      const parsed = parseApiError(error, 'Unable to change password. Please try again.');
      showToast(parsed.message, {type: 'error'});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Current Password</Text>
            <TextInput
              value={form.currentPassword}
              onChangeText={value => handleChange('currentPassword', value)}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor={theme.roles.input.placeholder}
              style={[styles.input, {borderColor: theme.roles.input.border, color: theme.roles.input.text}]}
              onFocus={() => setErrors(prev => ({...prev, currentPassword: undefined}))}
              accessibilityLabel="Current password"
            />
            {errors.currentPassword ? (
              <Text style={[styles.error, {color: theme.roles.status.error}]}>{errors.currentPassword}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, {color: theme.roles.text.secondary}]}>New Password</Text>
            <TextInput
              value={form.newPassword}
              onChangeText={value => handleChange('newPassword', value)}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor={theme.roles.input.placeholder}
              style={[styles.input, {borderColor: theme.roles.input.border, color: theme.roles.input.text}]}
              onFocus={() => setErrors(prev => ({...prev, newPassword: undefined}))}
              accessibilityLabel="New password"
            />
            {errors.newPassword ? (
              <Text style={[styles.error, {color: theme.roles.status.error}]}>{errors.newPassword}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Confirm Password</Text>
            <TextInput
              value={form.confirmPassword}
              onChangeText={value => handleChange('confirmPassword', value)}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor={theme.roles.input.placeholder}
              style={[styles.input, {borderColor: theme.roles.input.border, color: theme.roles.input.text}]}
              onFocus={() => setErrors(prev => ({...prev, confirmPassword: undefined}))}
              accessibilityLabel="Confirm new password"
            />
            {errors.confirmPassword ? (
              <Text style={[styles.error, {color: theme.roles.status.error}]}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <Button
            title={submitting ? 'Updating…' : 'Update Password'}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityHint="Saves your new password"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 10,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
  },
});

