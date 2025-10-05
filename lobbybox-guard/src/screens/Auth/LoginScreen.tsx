import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {z} from 'zod';
import {useAuth} from '@/context/AuthContext';
import {useThemeContext} from '@/theme';
import {ErrorNotice} from '@/components/ErrorNotice';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginScreen: React.FC = () => {
  const {login, error, clearError} = useAuth();
  const {theme} = useThemeContext();
  const [form, setForm] = useState({email: '', password: ''});
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: 'email' | 'password', value: string) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = async () => {
    clearError();
    try {
      schema.parse(form);
      setErrors({});
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const nextErrors: typeof errors = {};
        validationError.errors.forEach(issue => {
          if (issue.path[0]) {
            nextErrors[issue.path[0] as 'email' | 'password'] = issue.message;
          }
        });
        setErrors(nextErrors);
      }
      return;
    }

    setSubmitting(true);
    await login(form.email, form.password);
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.roles.background.default}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.colors.primary}]}>LobbyBox</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.roles.input.placeholder}
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, {borderColor: theme.roles.input.border, color: theme.roles.input.text}]}
          onChangeText={value => handleChange('email', value)}
          onFocus={() => {
            setErrors(prev => ({...prev, email: undefined}));
            if (error) {
              clearError();
            }
          }}
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email address"
        />
        {errors.email ? <Text style={[styles.error, {color: theme.roles.status.error}]}>{errors.email}</Text> : null}
        <TextInput
          placeholder="Password"
          placeholderTextColor={theme.roles.input.placeholder}
          value={form.password}
          secureTextEntry
          style={[styles.input, {borderColor: theme.roles.input.border, color: theme.roles.input.text}]}
          onChangeText={value => handleChange('password', value)}
          onFocus={() => {
            setErrors(prev => ({...prev, password: undefined}));
            if (error) {
              clearError();
            }
          }}
          accessibilityLabel="Password"
          accessibilityHint="Enter your account password"
        />
        {errors.password ? (
          <Text style={[styles.error, {color: theme.roles.status.error}]}>{errors.password}</Text>
        ) : null}
        {error ? <ErrorNotice error={error} variant="inline" style={styles.inlineError} /> : null}
        <TouchableOpacity
          disabled={submitting}
          style={[
            styles.button,
            {backgroundColor: theme.roles.button.primary.background, opacity: submitting ? 0.7 : 1},
          ]}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Signing in' : 'Login'}
          accessibilityHint="Authenticates your account">
          <Text style={[styles.buttonLabel, {color: theme.roles.button.primary.text}]}>
            {submitting ? 'Signing in…' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
  },
  inlineError: {
    marginBottom: 8,
  },
});
