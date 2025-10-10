import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useAuth} from '@/context/AuthContext';
import {useThemeContext} from '@/theme';

type DetailItem = {
  label: string;
  value: string;
};

export const ProfileDetailsScreen: React.FC = () => {
  const {user} = useAuth();
  const {theme} = useThemeContext();

  const userName = user?.displayName ?? user?.fullName ?? user?.email ?? 'Guest';
  const email = user?.email ?? '—';
  const propertyDisplay = useMemo(() => {
    if (!user?.property?.name) {
      return '—';
    }
    const code = user.property.code?.trim();
    return code ? `${user.property.name} (${code})` : user.property.name;
  }, [user?.property?.code, user?.property?.name]);

  const initials = useMemo(() => {
    const source = user?.displayName ?? user?.fullName ?? user?.email ?? '';
    if (!source) {
      return 'G';
    }
    const parts = source.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }, [user?.displayName, user?.email, user?.fullName]);

  const details = useMemo<DetailItem[]>(() => {
    if (!user) {
      return [
        {label: 'Name', value: 'Guest'},
        {label: 'Email', value: '—'},
        {label: 'Role', value: '—'},
      ];
    }

    return [
      {label: 'Name', value: user.displayName ?? user.fullName ?? '—'},
      {label: 'Email', value: user.email ?? '—'},
      {label: 'Role', value: formatRole(user.role)},
      {
        label: 'Property',
        value: user.property?.name ? `${user.property.name}${user.property.code ? ` (${user.property.code})` : ''}` : '—',
      },
    ];
  }, [user]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
        <View
          style={[styles.headerCard, {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border}]}
        >
          <View style={[styles.avatar, {backgroundColor: theme.palette.primary.main}]}>
            <Text style={[styles.avatarText, {color: theme.roles.text.onPrimary}]}>{initials}</Text>
          </View>
          <Text style={[styles.headerName, {color: theme.roles.text.primary}]} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={[styles.headerSubtitle, {color: theme.roles.text.secondary}]} numberOfLines={1}>
            {email}
          </Text>
          <Text style={[styles.headerSubtitle, {color: theme.roles.text.secondary}]} numberOfLines={1}>
            {propertyDisplay}
          </Text>
        </View>
        <View
          style={[styles.card, {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border}]}
        >
          {details.map((item, index) => (
            <View key={item.label} style={[styles.row, index === details.length - 1 && styles.rowLast]}>
              <Text style={[styles.label, {color: theme.roles.text.secondary}]}>{item.label}</Text>
              <Text style={[styles.value, {color: theme.roles.text.primary}]}>{item.value || '—'}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const formatRole = (role: string): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'PROPERTY_ADMIN':
      return 'Property Admin';
    case 'GUARD':
      return 'Guard';
    default:
      return role;
  }
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  headerCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  row: {
    marginBottom: 16,
  },
  rowLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
});

