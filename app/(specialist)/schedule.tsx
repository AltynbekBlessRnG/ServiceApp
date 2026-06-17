import { Icon, Text, useTheme } from '@rneui/themed';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useHaptics } from '../../hooks/useHaptics'; // Не забудь про вибрацию

// Настройка календаря (Русский)
LocaleConfig.locales['ru'] = {
  monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  monthNamesShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
  dayNames: ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
  dayNamesShort: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

// Рабочие часы (можно потом вынести в настройки)
const WORK_HOURS = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export default function SpecialistScheduleScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Данные
  const [bookings, setBookings] = useState<any[]>([]);     // Реальные заказы
  const [manualBlocks, setManualBlocks] = useState<string[]>([]); // Ручные блокировки (массив времени)
  const [loading, setLoading] = useState(false);

  // Обновляем данные при смене даты или фокусе
  useFocusEffect(
    useCallback(() => {
        fetchSchedule(selectedDate);
    }, [selectedDate])
  );

  async function fetchSchedule(date: string) {
    if (!user) return;
    setLoading(true);
    
    try {
        // 1. Грузим ЗАКАЗЫ (Bookings) на этот день
        // Берем и confirmed, и pending (pending тоже занимает место пока не отклонен)
        const { data: bookingData } = await supabase
            .from('bookings')
            .select('date_time, status, client:profiles!client_id(full_name)')
            .eq('specialist_id', user.id)
            .ilike('date_time', `${date}%`) // Фильтр по дате "YYYY-MM-DD%"
            .neq('status', 'rejected'); // Отклоненные не считаем занятыми

        setBookings(bookingData || []);

        // 2. Грузим РУЧНЫЕ БЛОКИРОВКИ (Busy Times)
        const { data: busyData } = await supabase
            .from('busy_times')
            .select('time')
            .eq('specialist_id', user.id)
            .eq('date', date);
            
        setManualBlocks(busyData?.map(b => b.time) || []);

    } catch (e) {
        console.log(e);
    } finally {
        setLoading(false);
    }
  }

  // ОБРАБОТКА НАЖАТИЯ НА СЛОТ
  async function handleSlotPress(time: string) {
      haptics.light();

      // 1. Проверяем, есть ли там ЗАКАЗ
      const booking = bookings.find(b => b.date_time.includes(time));
      if (booking) {
          Alert.alert(
              "Занято клиентом", 
              `На это время записан: ${booking.client?.full_name}\nСтатус: ${booking.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}`
          );
          return;
      }

      // 2. Проверяем, заблокировано ли ВРУЧНУЮ
      const isBlocked = manualBlocks.includes(time);

      if (isBlocked) {
          // РАЗБЛОКИРОВАТЬ
          const { error } = await supabase
            .from('busy_times')
            .delete()
            .eq('specialist_id', user?.id)
            .eq('date', selectedDate)
            .eq('time', time);
            
          if (!error) {
              setManualBlocks(prev => prev.filter(t => t !== time));
          }
      } else {
          // ЗАБЛОКИРОВАТЬ
          const { error } = await supabase
            .from('busy_times')
            .insert({ specialist_id: user?.id, date: selectedDate, time: time });
            
          if (!error) {
              setManualBlocks(prev => [...prev, time]);
          }
      }
  }

  // Рендер одного слота времени
  const renderTimeSlot = (time: string) => {
      // Ищем заказ на это время
      const booking = bookings.find(b => b.date_time.includes(time));
      // Ищем ручную блокировку
      const isManualBusy = manualBlocks.includes(time);

      let bgColor = '#1E2329'; // Дефолт (Свободно)
      let borderColor = '#2B3139';
      let textColor = '#fff';
      let icon = null;
      let statusText = 'Свободно';

      if (booking) {
          bgColor = 'rgba(255, 71, 87, 0.15)'; // Красный фон
          borderColor = '#FF4757';             // Красная рамка
          textColor = '#FF4757';
          icon = 'user';
          statusText = booking.status === 'pending' ? 'Заявка' : 'Занято';
      } else if (isManualBusy) {
           bgColor = '#2B3139';                 // Серый фон
          borderColor = '#6B6675';
          textColor = '#6B6675';
          icon = 'lock';
          statusText = 'Закрыто вами';
      } else {
          // Свободно
          textColor = '#F0B90B';
          borderColor = 'rgba(240, 185, 11, 0.3)';
      }

      return (
          <TouchableOpacity 
            key={time} 
            style={[styles.slot, { backgroundColor: bgColor, borderColor: borderColor }]}
            onPress={() => handleSlotPress(time)}
            activeOpacity={0.7}
          >
              <View style={styles.slotHeader}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{time}</Text>
                  {icon && <Icon name={icon} type="feather" size={14} color={textColor} />}
              </View>
              <Text style={{ fontSize: 12, color: textColor, fontWeight: '600', marginTop: 4 }}>
                  {statusText}
              </Text>
          </TouchableOpacity>
      );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader title="Управление временем" showBack={false} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* КАЛЕНДАРЬ */}
          <View style={styles.calendarContainer}>
              <Calendar 
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={{
                    [selectedDate]: { selected: true, selectedColor: theme.colors.primary, selectedTextColor: '#fff' }
                }}
                theme={{ 
                    calendarBackground: 'transparent', 
                    dayTextColor: '#fff', 
                    monthTextColor: '#fff', 
                    arrowColor: theme.colors.primary,
                    textSectionTitleColor: '#6B6675',
                    selectedDayBackgroundColor: theme.colors.primary,
                    todayTextColor: theme.colors.secondary,
                }}
              />
          </View>

          <View style={styles.divider} />

          {/* СЕТКА ЧАСОВ */}
          <View style={styles.gridContainer}>
              <View style={styles.legend}>
                  <Text style={styles.legendTitle}>РАСПИСАНИЕ НА {selectedDate.split('-').reverse().join('.')}</Text>
                  <View style={{flexDirection: 'row', gap: 10}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.dot, {backgroundColor: '#FF4757'}]}/><Text style={styles.legendText}>Клиент</Text></View>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.dot, {backgroundColor: '#6B6675'}]}/><Text style={styles.legendText}>Блок</Text></View>
                  </View>
              </View>

              {loading ? (
                  <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 30 }} />
              ) : (
                  <View style={styles.slotsGrid}>
                      {WORK_HOURS.map(time => renderTimeSlot(time))}
                  </View>
              )}
          </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  calendarContainer: { paddingHorizontal: 10, paddingBottom: 10 },
  divider: { height: 1, backgroundColor: '#2D2638', marginVertical: 10, marginHorizontal: 20 },
  
  gridContainer: { padding: 20 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  legendTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  legendText: { color: '#6B6675', fontSize: 12, marginLeft: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  
  slot: { 
      width: '31%', // Три в ряд
      padding: 12, 
      borderRadius: 12, 
      borderWidth: 1,
      minHeight: 70,
      justifyContent: 'center'
  },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});