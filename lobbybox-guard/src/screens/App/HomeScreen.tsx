import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {useAuth} from '@/context/AuthContext';
import {AppStackParamList} from '@/navigation/AppNavigator';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useThemeContext} from '@/theme';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {user} = useAuth();
  const {theme} = useThemeContext();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={[styles.greeting, {color: theme.colors.text}]}>You are signed in.</Text>
        <Text style={[styles.meta, {color: theme.colors.muted}]}>Role: {user?.role ?? 'Unknown'}</Text>
      </View>
      <Button
        title="Go to Settings"
        onPress={() => navigation.navigate('Settings')}
        accessibilityLabel="Open settings"
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  meta: {
    fontSize: 16,
  },
});
