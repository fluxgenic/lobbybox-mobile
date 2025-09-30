import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAuth} from '@/hooks/useAuth';
import {useThemeContext} from '@/theme';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const GuardRestrictionScreen: React.FC = () => {
  const {logout} = useAuth();
  const {theme} = useThemeContext();

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}> 
      <Text style={[styles.title, {color: theme.colors.primary}]}>Access Restricted</Text>
      <Text style={[styles.message, {color: theme.colors.text}]}>Mobile app is for Guards only.</Text>
      <TouchableOpacity style={[styles.button, {backgroundColor: theme.colors.primary}]} onPress={logout}>
        <Text style={[styles.buttonLabel, {color: theme.colors.background}]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
