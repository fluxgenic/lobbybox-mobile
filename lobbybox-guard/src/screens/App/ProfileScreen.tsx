import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import dayjs from 'dayjs';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useAuth} from '@/hooks/useAuth';
import {useThemeContext} from '@/theme';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useMutation} from '@tanstack/react-query';
import {ErrorNotice} from '@/components/ErrorNotice';
import {changePassword, updateProfile} from '@/api/profile';
import {ParsedApiError, parseApiError} from '@/utils/error';
import {showToast} from '@/utils/toast';
import {Button} from '@/components/Button';

export const ProfileScreen: React.FC = () => {
  const {user, property, logout, refreshProfile} = useAuth();
  const {mode, setMode, theme} = useThemeContext();

  const isDark = useMemo(() => mode === 'dark', [mode]);
  const [fullName, setFullName] = useState(user?.fullName ?? user?.name ?? '');
  const [profileError, setProfileError] = useState<ParsedApiError | null>(null);
  const [passwordError, setPasswordError] = useState<ParsedApiError | null>(null);
  const [passwordForm, setPasswordForm] = useState({oldPassword: '', newPassword: ''});

  const updateProfileMutation = useMutation({mutationFn: updateProfile});
  const changePasswordMutation = useMutation({mutationFn: changePassword});

  useEffect(() => {
    setFullName(user?.fullName ?? user?.name ?? '');
  }, [user?.fullName, user?.name]);

  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setProfileError({message: 'Full name is required.'});
      return;
    }
    setProfileError(null);
    try {
      await updateProfileMutation.mutateAsync({fullName: trimmedName});
      showToast('Profile updated');
      await refreshProfile();
    } catch (err) {
      setProfileError(parseApiError(err, 'Unable to update profile.'));
    }
  };

  const handleChangePassword = async () => {
    const oldPassword = passwordForm.oldPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    if (!oldPassword || !newPassword) {
      setPasswordError({message: 'Enter your current and new passwords.'});
      return;
    }
    setPasswordError(null);
    try {
      const response = await changePasswordMutation.mutateAsync({oldPassword, newPassword});
      if (response.status !== 'ok') {
        setPasswordError({message: 'Unable to confirm password change. Please try again.'});
        return;
      }
      showToast('Password updated');
      setPasswordForm({oldPassword: '', newPassword: ''});
    } catch (err) {
      setPasswordError(parseApiError(err, 'Unable to change password.'));
    }
  };

  const hasProfileChanges = useMemo(() => {
    const baseline = (user?.fullName ?? user?.name ?? '').trim();
    return fullName.trim() !== baseline && fullName.trim().length > 0;
  }, [fullName, user?.fullName, user?.name]);

  const canChangePassword = useMemo(() => {
    return passwordForm.oldPassword.trim().length > 0 && passwordForm.newPassword.trim().length > 0;
  }, [passwordForm.newPassword, passwordForm.oldPassword]);

  const isUpdatingProfile = updateProfileMutation.isPending;
  const isUpdatingPassword = changePasswordMutation.isPending;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.name, {color: theme.colors.text}]}>{user?.fullName ?? user?.name ?? 'Guard'}</Text>
        <Text style={{color: theme.colors.muted}}>{user?.email}</Text>
        <Text style={[styles.role, {color: theme.colors.secondary}]}>{user?.role}</Text>
        {user?.lastLoginAt ? (
          <Text style={{color: theme.colors.muted, marginTop: 4}}>
            Last login {dayjs(user.lastLoginAt).format('MMM D, YYYY • HH:mm')}
          </Text>
        ) : null}
      </View>
      <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Assignment</Text>
        {property ? (
          <>
            <Text style={[styles.assignmentName, {color: theme.colors.text}]}>{property.propertyName}</Text>
            <Text style={{color: theme.colors.muted, marginBottom: 16}}>Property ID: {property.propertyId}</Text>
            <Button
              title="Refresh assignment"
              onPress={() => {
                void refreshProfile();
              }}
              variant="secondary"
              accessibilityHint="Fetch your latest property assignment"
            />
          </>
        ) : (
          <>
            <Text style={{color: theme.colors.muted, marginBottom: 16}}>
              We couldn't find an assigned property for your account.
            </Text>
            <Button
              title="Retry"
              onPress={() => {
                void refreshProfile();
              }}
              accessibilityHint="Attempt to fetch your property assignment again"
            />
          </>
        )}
      </View>
      <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Profile</Text>
        <Text style={[styles.inputLabel, {color: theme.colors.muted}]}>Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          style={[styles.input, {borderColor: theme.colors.border, color: theme.colors.text}]}
          placeholder="Enter your full name"
          placeholderTextColor={theme.colors.muted}
          onFocus={() => setProfileError(null)}
          accessibilityLabel="Full name"
          accessibilityHint="Update the name shown in your profile"
        />
        {profileError ? <ErrorNotice error={profileError} variant="inline" style={styles.errorNotice} /> : null}
        <TouchableOpacity
          style={[
            styles.saveButton,
            {backgroundColor: theme.colors.primary, opacity: hasProfileChanges && !isUpdatingProfile ? 1 : 0.6},
          ]}
          onPress={handleSaveProfile}
          disabled={!hasProfileChanges || isUpdatingProfile}
          accessibilityRole="button"
          accessibilityLabel={isUpdatingProfile ? 'Saving profile' : 'Save profile changes'}
          accessibilityHint="Updates your profile information">
          <Text style={[styles.saveButtonLabel, {color: theme.colors.background}]}>
            {isUpdatingProfile ? 'Saving…' : 'Save changes'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Appearance</Text>
        <View style={styles.row}>
          <Text style={{color: theme.colors.text}}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={value => {
              void setMode(value ? 'dark' : 'light');
            }}
            trackColor={{false: theme.colors.muted, true: theme.colors.primary}}
            thumbColor={isDark ? theme.colors.card : '#f4f3f4'}
            accessibilityLabel="Toggle dark mode"
            accessibilityHint="Switch between dark and light appearance"
          />
        </View>
      </View>
      <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Change password</Text>
        <TextInput
          value={passwordForm.oldPassword}
          onChangeText={value => setPasswordForm(prev => ({...prev, oldPassword: value}))}
          placeholder="Current password"
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          style={[styles.input, {borderColor: theme.colors.border, color: theme.colors.text}]}
          onFocus={() => setPasswordError(null)}
          accessibilityLabel="Current password"
          accessibilityHint="Enter your current account password"
        />
        <TextInput
          value={passwordForm.newPassword}
          onChangeText={value => setPasswordForm(prev => ({...prev, newPassword: value}))}
          placeholder="New password"
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          style={[styles.input, {borderColor: theme.colors.border, color: theme.colors.text}]}
          onFocus={() => setPasswordError(null)}
          accessibilityLabel="New password"
          accessibilityHint="Enter the new password you want to use"
        />
        {passwordError ? <ErrorNotice error={passwordError} variant="inline" style={styles.errorNotice} /> : null}
        <TouchableOpacity
          style={[
            styles.saveButton,
            {backgroundColor: theme.colors.primary, opacity: !canChangePassword || isUpdatingPassword ? 0.6 : 1},
          ]}
          onPress={handleChangePassword}
          disabled={isUpdatingPassword || !canChangePassword}
          accessibilityRole="button"
          accessibilityLabel={isUpdatingPassword ? 'Updating password' : 'Change password'}
          accessibilityHint="Saves your new password">
          <Text style={[styles.saveButtonLabel, {color: theme.colors.background}]}>
            {isUpdatingPassword ? 'Updating…' : 'Update password'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.logoutButton, {backgroundColor: theme.colors.primary}]}
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Logout"
        accessibilityHint="Signs you out of the app">
        <Text style={[styles.logoutLabel, {color: theme.colors.background}]}>Logout</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  role: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  assignmentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  saveButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 'auto',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorNotice: {
    marginBottom: 12,
  },
});
