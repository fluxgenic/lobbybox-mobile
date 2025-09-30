import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import dayjs from 'dayjs';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';

const mockHistory = [
  {id: 'h1', title: 'Package logged', date: dayjs().subtract(1, 'day').toISOString()},
  {id: 'h2', title: 'Maintenance escort', date: dayjs().subtract(2, 'day').toISOString()},
  {id: 'h3', title: 'Night patrol', date: dayjs().subtract(3, 'day').toISOString()},
];

export const HistoryScreen: React.FC = () => {
  const {theme} = useThemeContext();

  return (
    <ScreenContainer>
      <FlatList
        data={mockHistory}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}> 
            <Text style={[styles.cardTitle, {color: theme.colors.text}]}>{item.title}</Text>
            <Text style={{color: theme.colors.muted}}>{dayjs(item.date).format('MMM D, YYYY h:mm A')}</Text>
          </View>
        )}
        ListHeaderComponent={<Text style={[styles.heading, {color: theme.colors.text}]}>History</Text>}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
});
