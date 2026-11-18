import type { ThemeColors } from '../../theme';
import { useTheme } from '../../ThemeContext';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../AuthContext';
import { StudentsProvider } from '../../StudentsContext';
import { AcademicProvider } from '../../AcademicContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenOrder = [
  { label: 'Dashboard', route: '/' },
  { label: 'Alunos', route: '/alunos' },
  { label: 'Adicionar', route: '/novo-aluno' },
  { label: 'Notas', route: '/notas' },
  { label: 'Relatórios', route: '/relatorios' },
  { label: 'Disciplinas', route: '/disciplinas' },
  { label: 'Agenda', route: '/agenda' },
  { label: 'Estudos', route: '/plano-estudos' },
  { label: 'Clima', route: '/clima' },
  { label: 'Config', route: '/config' },
] as const;

export default function AppLayout() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { usuario } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!usuario) {
    return <Redirect href="/login" />;
  }

  return (
    <StudentsProvider>
      <AcademicProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.sidebarContainer}>
            <View style={styles.brand}>
              <Text style={styles.eyebrow}>Sistema acadêmico</Text>
              <Text style={styles.title}>Academy Notes</Text>
              <Text style={styles.subtitle}>Painel de desempenho e notas</Text>
            </View>

            <ScrollView
              style={styles.navigation}
              showsVerticalScrollIndicator={Platform.OS === 'web'}
              contentContainerStyle={{
                paddingBottom: 10,
              }}
            >
              {screenOrder.map(({ label, route }) => {
                const isActive =
                  route === '/'
                    ? pathname === '/'
                    : pathname === route ||
                      pathname.startsWith(`${route}/`) ||
                      (route === '/disciplinas' &&
                        pathname.startsWith('/disciplina/')) ||
                      (route === '/clima' && pathname.startsWith('/previsao/'));

                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`Ir para ${label}`}
                    accessibilityState={{ selected: isActive }}
                    style={[
                      styles.tabButton,
                      isActive
                        ? styles.tabButtonActive
                        : styles.tabButtonInactive,
                    ]}
                    onPress={() => router.replace(route)}
                  >
                    <Text
                      style={[styles.tabText, isActive && styles.tabTextActive]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.content}>
            <Slot />
          </View>
        </SafeAreaView>
      </AcademicProvider>
    </StudentsProvider>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
    },
    sidebarContainer: {
      width: 260,
      backgroundColor: '#0A0F1E',
      borderRightWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      paddingTop: 40,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    navigation: {
      flex: 1,
    },
    brand: {
      flexShrink: 0,
      marginBottom: 32,
    },
    eyebrow: {
      color: colors.info,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      fontSize: 12,
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 4,
      flexShrink: 1,
    },
    subtitle: {
      color: colors.textSoft,
      fontSize: 15,
    },
    tabButton: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
    },
    tabButtonActive: {
      backgroundColor: '#2563EB',
    },
    tabButtonInactive: {
      backgroundColor: 'transparent',
    },
    tabText: {
      color: '#9CA3AF',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'left',
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      backgroundColor: '#050811',
    },
  });
