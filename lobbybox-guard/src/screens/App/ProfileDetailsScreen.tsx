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
    padding: 24,
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

