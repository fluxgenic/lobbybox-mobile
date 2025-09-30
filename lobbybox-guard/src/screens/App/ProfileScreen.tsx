import React, {useMemo} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useAuth} from '@/hooks/useAuth';
import {useThemeContext} from '@/theme';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const ProfileScreen: React.FC = () => {
  const {user, logout} = useAuth();
  const {mode, setMode, theme} = useThemeContext();

  const isDark = useMemo(() => mode === 'dark', [mode]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.name, {color: theme.colors.text}]}>{user?.name ?? 'Guard'}</Text>
        <Text style={{color: theme.colors.muted}}>{user?.email}</Text>
        <Text style={[styles.role, {color: theme.colors.secondary}]}>{user?.role}</Text>
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
          />
        </View>
      </View>
      <TouchableOpacity style={[styles.logoutButton, {backgroundColor: theme.colors.primary}]} onPress={logout}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
