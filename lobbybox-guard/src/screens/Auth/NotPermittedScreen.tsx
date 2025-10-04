import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {useAuth} from '@/context/AuthContext';
import {useThemeContext} from '@/theme';

export const NotPermittedScreen: React.FC = () => {
  const {logout, user} = useAuth();
  const {theme} = useThemeContext();

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.colors.text}]}>Not permitted</Text>
        <Text style={[styles.subtitle, {color: theme.colors.muted}]}>This app is only available to Guard accounts.</Text>
        {user?.role ? (
          <Text style={[styles.detail, {color: theme.colors.muted}]}>Current role: {user.role}</Text>
        ) : null}
      </View>
      <Button title="Sign out" onPress={logout} accessibilityLabel="Sign out" />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  detail: {
    marginTop: 16,
    fontSize: 14,
  },
});
