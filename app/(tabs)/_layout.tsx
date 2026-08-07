import { Redirect, Tabs } from 'expo-router';
import { FloatingTabBar } from '../../src/components/FloatingTabBar';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabsLayout() {
  const { isAuthenticated, needsOnboarding, isLoading } = useAuth();

  if (!isLoading && isAuthenticated && needsOnboarding) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Catálogo' }} />
      <Tabs.Screen name="community" options={{ title: 'Comunidade' }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
