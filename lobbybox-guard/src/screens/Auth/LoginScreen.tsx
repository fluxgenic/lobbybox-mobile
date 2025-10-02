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
import {useAuth} from '@/hooks/useAuth';
import {useThemeContext} from '@/theme';
import {z} from 'zod';
import {ErrorNotice} from '@/components/ErrorNotice';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password is required'),
});

export const LoginScreen: React.FC = () => {
  const {login, error, clearError} = useAuth();
  const {theme} = useThemeContext();
  const [form, setForm] = useState({email: '', password: ''});
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: 'email' | 'password', value: string) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const handleSubmit = async () => {
    clearError();
    try {
      schema.parse(form);
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const zodErrors: typeof errors = {};
        err.errors.forEach(issue => {
          if (issue.path[0]) {
            zodErrors[issue.path[0] as 'email' | 'password'] = issue.message;
          }
        });
        setErrors(zodErrors);
      }
      return;
    }

    setSubmitting(true);
    await login(form.email, form.password);
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}> 
        <Text style={[styles.title, {color: theme.colors.primary}]}>Lobbybox Guard</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.muted}
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, {borderColor: theme.colors.border, color: theme.colors.text}]}
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
        {errors.email ? <Text style={[styles.error, {color: 'red'}]}>{errors.email}</Text> : null}
        <TextInput
          placeholder="Password"
          placeholderTextColor={theme.colors.muted}
          value={form.password}
          secureTextEntry
          style={[styles.input, {borderColor: theme.colors.border, color: theme.colors.text}]}
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
        {errors.password ? <Text style={[styles.error, {color: 'red'}]}>{errors.password}</Text> : null}
        {error ? <ErrorNotice error={error} variant="inline" style={styles.inlineError} /> : null}
        <TouchableOpacity
          disabled={submitting}
          style={[styles.button, {backgroundColor: theme.colors.primary, opacity: submitting ? 0.7 : 1}]}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Signing in' : 'Login'}
          accessibilityHint="Authenticates your account">
          <Text style={[styles.buttonLabel, {color: theme.colors.background}]}>{submitting ? 'Signing in…' : 'Login'}</Text>
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
