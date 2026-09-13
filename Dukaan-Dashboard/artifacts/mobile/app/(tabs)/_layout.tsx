import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * Stable cross-platform navigation.
 *
 * Avoids the experimental native-tabs / glass-effect / symbols stack on Android.
 * The shop only needs the regular Expo Router tabs and Feather icons here.
 */
export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, React.ComponentProps<typeof Feather>['name']> = {
            index: 'home',
            sales: 'shopping-cart',
            products: 'package',
            khata: 'book-open',
            more: 'more-horizontal',
          };
          return <Feather name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales' }} />
      <Tabs.Screen name="products" options={{ title: 'Stock' }} />
      <Tabs.Screen name="khata" options={{ title: 'Khata' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
