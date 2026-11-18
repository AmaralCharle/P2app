import type { ThemeColors } from '../../theme';
import { useTheme } from '../../ThemeContext';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const styles = createStyles(colors, isMobile);
  const [menuAberto, setMenuAberto] = useState(false);
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
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={styles.eyebrow}>Sistema acadêmico</Text>
                  <Text style={styles.title}>Academy Notes</Text>
                  <Text style={styles.subtitle}>
                    Painel de desempenho e notas
                  </Text>
                </View>
                {isMobile && (
                  <TouchableOpacity
                    onPress={() => setMenuAberto(!menuAberto)}
                    style={{ padding: 8 }}
                  >
                    <Feather
                      name={menuAberto ? 'x' : 'menu'}
                      size={28}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {(!isMobile || menuAberto) && (
              <ScrollView
                style={styles.navigation}
                horizontal={isMobile}
                showsVerticalScrollIndicator={!isMobile && Platform.OS === 'web'}
                showsHorizontalScrollIndicator={
                  isMobile && Platform.OS === 'web'
                }
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
                      onPress={() => {
                        setMenuAberto(false);
                        router.replace(route);
                      }}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          isActive && styles.tabTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.contentInner}>
              <Slot />
            </View>
          </View>
        </SafeAreaView>
      </AcademicProvider>
    </StudentsProvider>
  );
}

const createStyles = (colors: ThemeColors, isMobile: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: isMobile ? 'column' : 'row',
      backgroundColor: colors.background,
    },
    sidebarContainer: {
      width: isMobile ? '100%' : 260,
      backgroundColor: '#0A0F1E',
      borderRightWidth: isMobile ? 0 : 1,
      borderColor: 'rgba(255,255,255,0.05)',
      paddingTop: 40,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    navigation: {
      flex: isMobile ? 0 : 1,
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
      width: isMobile ? 'auto' : '100%',
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
    contentInner: {
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
      padding: isMobile ? 16 : 32,
      flex: 1,
    },
  });
