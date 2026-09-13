import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider } from '@/context/AppContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { Stack } from 'expo-router';

function RootLayoutNav() {
  return (
    <AppProvider>
      <DatabaseProvider>
        <Stack screenOptions={{ headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </DatabaseProvider>
    </AppProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <RootLayoutNav />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
