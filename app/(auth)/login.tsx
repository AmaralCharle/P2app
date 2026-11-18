import type { ThemeColors } from '../../theme';
import { useTheme } from '../../ThemeContext';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';

export default function Login() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { entrar, usuario, saving } = useAuth();
  if (usuario && !saving) return <Redirect href="/" />;

  return (
    <ImageBackground
      source={require('../../assets/biblioteca-bk.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Academy Notes</Text>
          <Text style={styles.subtitle}>
            Entre para acessar o painel acadêmico.
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.button}
            disabled={saving}
            onPress={() => {
              void entrar();
            }}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Salvando sessão...' : 'Entrar no Academy Notes'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(10, 15, 30, 0.82)',
    },
    screen: {
      flex: 1,
      width: '100%',
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 24,
      padding: 40,
      alignItems: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSoft,
      fontSize: 16,
      marginBottom: 32,
      textAlign: 'center',
    },
    button: {
      width: '100%',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
    },
    buttonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
