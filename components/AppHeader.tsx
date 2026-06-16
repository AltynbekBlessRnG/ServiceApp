import { Icon, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showSettings?: boolean;
  rightComponent?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'Taptym',
  showBack = true,
  showSettings = true,
  rightComponent,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.btn, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]}
          >
            <Icon name="arrow-left" type="feather" color="#fff" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        <Text
          style={[styles.title, { color: '#fff', textShadowColor: theme.colors.primary, textShadowRadius: 10 }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {rightComponent
          ? rightComponent
          : showSettings && (
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={[styles.btn, { backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]}
              >
                <Icon name="settings" type="feather" color="#fff" size={18} />
              </TouchableOpacity>
            )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 10,
  },
  side: { width: 45 },
  center: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
