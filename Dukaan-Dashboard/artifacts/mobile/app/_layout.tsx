import React,{useEffect}from'react';
import{SafeAreaProvider}from'react-native-safe-area-context';
import*as SplashScreen from'expo-splash-screen';
import{ErrorBoundary}from'@/components/ErrorBoundary';
import{AppProvider}from'@/context/AppContext';
import{DatabaseProvider}from'@/context/DatabaseContext';
import{SyncRunner}from'@/sync/SyncRunner';
import{Stack}from'expo-router';

function RootLayoutNav(){return <AppProvider><DatabaseProvider><SyncRunner/><Stack screenOptions={{headerBackTitle:'Back'}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/></Stack></DatabaseProvider></AppProvider>}

export default function RootLayout(){useEffect(()=>{SplashScreen.hide();},[]);return <SafeAreaProvider><ErrorBoundary><RootLayoutNav/></ErrorBoundary></SafeAreaProvider>}
