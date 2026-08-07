import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { useLayout } from '../../src/constants/layout';
import { showAlert } from '../../src/utils/dialog';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { signIn } = useAuth();
  const layout = useLayout();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(logoScale, {
          toValue: 1.06,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      setShowForm(true);
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslate, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 850);

    return () => clearTimeout(timer);
  }, [formOpacity, formTranslate, logoOpacity, logoScale]);

  const goAfterAuth = (needsOnboarding: boolean) => {
    router.replace(needsOnboarding ? '/(auth)/onboarding' : '/(tabs)');
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      showAlert('Atenção', 'Por favor, informe seu e-mail.');
      return;
    }
    if (!password.trim()) {
      showAlert('Atenção', 'Por favor, informe sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      goAfterAuth(result.needsOnboarding);
    } catch (error: any) {
      showAlert('Erro', error.message || 'Não foi possível fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#EEF3FA', '#E4ECF7', '#F7F9FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingHorizontal: layout.horizontalPadding,
                paddingVertical: layout.isCompact ? 24 : 40,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.content, { maxWidth: layout.contentWidth }]}>
              <Animated.View
                style={[
                  styles.brandBlock,
                  {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <View style={styles.mark}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.markGradient}
                  >
                    <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={[styles.logo, { fontSize: layout.font(30) }]}>
                  Liberdade Academy
                </Text>
              </Animated.View>

              {showForm && (
                <Animated.View
                  style={[
                    styles.card,
                    {
                      opacity: formOpacity,
                      transform: [{ translateY: formTranslate }],
                    },
                  ]}
                >
                  <Text style={styles.cardTitle}>Entrar</Text>
                  <Text style={styles.cardHint}>Acesse a comunidade exclusiva</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={COLORS.accent}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="E-mail"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.accent}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Senha"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.loginButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.loginButtonText}>Entrar</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/register')}
                    style={styles.registerLink}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.registerText}>
                      Ainda não tem conta?{' '}
                      <Text style={styles.registerTextBold}>Criar conta</Text>
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(74, 111, 165, 0.16)',
  },
  blobBottom: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(27, 42, 74, 0.08)',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  mark: {
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  markGradient: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    ...SHADOWS.large,
  },
  cardTitle: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 56,
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.regular,
    outlineStyle: 'none' as unknown as undefined,
  },
  eyeButton: {
    padding: SPACING.sm,
  },
  loginButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.sm,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  registerTextBold: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
});
