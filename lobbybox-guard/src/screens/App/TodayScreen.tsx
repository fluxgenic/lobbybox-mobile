import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import dayjs from 'dayjs';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';

const mockTasks = [
  {id: '1', title: 'Lobby patrol', time: '08:00'},
  {id: '2', title: 'Visitor check-in', time: '10:00'},
  {id: '3', title: 'Delivery escort', time: '14:00'},
];

export const TodayScreen: React.FC = () => {
  const {theme} = useThemeContext();

  return (
    <ScreenContainer>
      <Text style={[styles.heading, {color: theme.colors.text}]}>Today · {dayjs().format('MMM D, YYYY')}</Text>
      <FlatList
        data={mockTasks}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}> 
            <Text style={[styles.cardTitle, {color: theme.colors.text}]}>{item.title}</Text>
            <Text style={{color: theme.colors.muted}}>{item.time}</Text>
          </View>
        )}
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
    marginBottom: 4,
  },
});
