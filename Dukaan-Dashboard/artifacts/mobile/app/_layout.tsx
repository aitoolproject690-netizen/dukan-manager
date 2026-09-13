import React from 'react';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider } from '@/context/AppContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { Stack } from 'expo-router';

const queryClient = new QueryClient();

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
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={styles.root}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
