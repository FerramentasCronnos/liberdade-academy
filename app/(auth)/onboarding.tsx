import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import type {
  OnboardingNiche,
  PlatformGoal,
  RevenueRange,
} from '../../src/types';

const NICHES: { id: OnboardingNiche; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'beleza', label: 'Beleza', icon: 'flower' },
  { id: 'saude', label: 'Saúde', icon: 'fitness' },
  { id: 'fisico', label: 'Físicos', icon: 'cube' },
  { id: 'digital', label: 'Digital', icon: 'cloud-download' },
  { id: 'moda', label: 'Moda', icon: 'shirt' },
  { id: 'casa', label: 'Casa', icon: 'home' },
  { id: 'tech', label: 'Tech', icon: 'hardware-chip' },
  { id: 'fitness', label: 'Fitness', icon: 'barbell' },
];

const REVENUE: { id: RevenueRange; label: string }[] = [
  { id: 'ate_5k', label: 'Até R$ 5 mil/mês' },
  { id: '5k_15k', label: 'R$ 5 mil a R$ 15 mil' },
  { id: '15k_50k', label: 'R$ 15 mil a R$ 50 mil' },
  { id: '50k_mais', label: 'Mais de R$ 50 mil' },
];

const GOALS: { id: PlatformGoal; label: string; hint: string }[] = [
  { id: 'primeira_venda', label: 'Fazer a primeira venda', hint: 'Começar do zero com produtos validados' },
  { id: 'escalar', label: 'Escalar o faturamento', hint: 'Crescer com catálogo e comunidade' },
  { id: 'trocar_nicho', label: 'Trocar de nicho', hint: 'Testar produtos virais em outra área' },
  { id: 'comunidade', label: 'Entrar na comunidade', hint: 'Networking e troca de resultados' },
  { id: 'renda_extra', label: 'Gerar renda extra', hint: 'Vender sem estoque no tempo livre' },
];

type Step = 'intro' | 'niche' | 'selling' | 'revenue' | 'goal' | 'welcome';

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const layout = useLayout();
  const [step, setStep] = useState<Step>('intro');
  const [niche, setNiche] = useState<OnboardingNiche | null>(null);
  const [alreadySelling, setAlreadySelling] = useState<boolean | null>(null);
  const [revenueRange, setRevenueRange] = useState<RevenueRange | null>(null);
  const [goal, setGoal] = useState<PlatformGoal | null>(null);
  const [saving, setSaving] = useState(false);

  const progress = useMemo(() => {
    const map: Record<Step, number> = {
      intro: 0.12,
      niche: 0.3,
      selling: 0.48,
      revenue: 0.66,
      goal: 0.84,
      welcome: 1,
    };
    return map[step];
  }, [step]);

  const firstName = user?.name?.split(' ')[0] ?? 'Membro';
  const nicheLabel = NICHES.find((n) => n.id === niche)?.label ?? '';
  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? '';

  const goNextFromSelling = (selling: boolean) => {
    setAlreadySelling(selling);
    if (selling) setStep('revenue');
    else {
      setRevenueRange(null);
      setStep('goal');
    }
  };

  const finish = async () => {
    if (!niche || alreadySelling === null || !goal) {
      showAlert('Atenção', 'Complete todas as perguntas para continuar.');
      return;
    }
    if (alreadySelling && !revenueRange) {
      showAlert('Atenção', 'Selecione sua faixa de faturamento.');
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding({
        niche,
        alreadySelling,
        revenueRange: alreadySelling ? revenueRange ?? undefined : undefined,
        goal,
      });
      router.replace('/(tabs)');
    } catch {
      showAlert('Erro', 'Não foi possível salvar suas respostas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#EEF3FA', '#E4ECF7', '#F7F9FC']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.wrap, { paddingHorizontal: layout.horizontalPadding }]}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {step === 'intro' && (
              <View style={styles.introBox}>
                <View style={styles.introIcon}>
                  <Ionicons name="hand-left" size={32} color="#FFF" />
                </View>
                <Text style={styles.introEyebrow}>Liberdade Academy</Text>
                <Text style={[styles.title, styles.centeredText]}>
                  Bem-vindo(a), {firstName}!
                </Text>
                <Text style={[styles.subtitle, styles.centeredText]}>
                  Que bom ter você aqui. Antes de liberar o catálogo, a comunidade e o ranking,
                  queremos te conhecer um pouco melhor.
                </Text>
                <View style={styles.introCard}>
                  <View style={styles.introBullet}>
                    <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                    <Text style={styles.introBulletText}>
                      Personalizar produtos e nichos pra sua realidade
                    </Text>
                  </View>
                  <View style={styles.introBullet}>
                    <Ionicons name="people" size={18} color={COLORS.primary} />
                    <Text style={styles.introBulletText}>
                      Conectar você com conteúdos e pessoas no mesmo momento
                    </Text>
                  </View>
                  <View style={styles.introBullet}>
                    <Ionicons name="rocket" size={18} color={COLORS.primary} />
                    <Text style={styles.introBulletText}>
                      Melhorar sua experiência dentro do app desde o primeiro dia
                    </Text>
                  </View>
                </View>
                <Text style={[styles.introNote, styles.centeredText]}>
                  São só algumas perguntas rápidas. Leva menos de 1 minuto.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('niche')}>
                  <Text style={styles.primaryBtnText}>Vamos começar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'niche' && (
              <View style={styles.stepBlock}>
                <Text style={styles.title}>Qual é o seu nicho?</Text>
                <Text style={styles.subtitle}>
                  Com isso, personalizamos o catálogo e as recomendações pra você.
                </Text>
                <View style={styles.grid}>
                  {NICHES.map((item) => {
                    const active = niche === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.optionCard, active && styles.optionCardActive]}
                        onPress={() => setNiche(item.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={active ? '#FFF' : COLORS.primary}
                        />
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, !niche && styles.btnDisabled]}
                  disabled={!niche}
                  onPress={() => setStep('selling')}
                >
                  <Text style={styles.primaryBtnText}>Continuar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => setStep('intro')}>
                  <Text style={styles.backLinkText}>Voltar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'selling' && (
              <View style={styles.stepBlock}>
                <Text style={styles.title}>Você já vende hoje?</Text>
                <Text style={styles.subtitle}>
                  Isso nos ajuda a entender em que momento da jornada você está.
                </Text>
                <TouchableOpacity
                  style={[styles.bigOption, alreadySelling === true && styles.optionCardActive]}
                  onPress={() => goNextFromSelling(true)}
                >
                  <Ionicons
                    name="cart"
                    size={24}
                    color={alreadySelling === true ? '#FFF' : COLORS.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bigOptionTitle, alreadySelling === true && styles.optionTextActive]}>
                      Sim, já vendo
                    </Text>
                    <Text style={[styles.bigOptionHint, alreadySelling === true && styles.hintOnDark]}>
                      Já tenho operação rodando
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bigOption, alreadySelling === false && styles.optionCardActive]}
                  onPress={() => goNextFromSelling(false)}
                >
                  <Ionicons
                    name="rocket"
                    size={24}
                    color={alreadySelling === false ? '#FFF' : COLORS.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bigOptionTitle, alreadySelling === false && styles.optionTextActive]}>
                      Ainda não
                    </Text>
                    <Text style={[styles.bigOptionHint, alreadySelling === false && styles.hintOnDark]}>
                      Quero começar com a Academy
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => setStep('niche')}>
                  <Text style={styles.backLinkText}>Voltar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'revenue' && (
              <View style={styles.stepBlock}>
                <Text style={styles.title}>Qual seu faturamento atual?</Text>
                <Text style={styles.subtitle}>Pode ser uma faixa aproximada — sem julgamento.</Text>
                {REVENUE.map((item) => {
                  const active = revenueRange === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.listOption, active && styles.optionCardActive]}
                      onPress={() => setRevenueRange(item.id)}
                    >
                      <Text style={[styles.listOptionText, active && styles.optionTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.primaryBtn, !revenueRange && styles.btnDisabled]}
                  disabled={!revenueRange}
                  onPress={() => setStep('goal')}
                >
                  <Text style={styles.primaryBtnText}>Continuar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => setStep('selling')}>
                  <Text style={styles.backLinkText}>Voltar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'goal' && (
              <View style={styles.stepBlock}>
                <Text style={styles.title}>Qual seu objetivo aqui?</Text>
                <Text style={styles.subtitle}>
                  Vamos te guiar com conteúdos e produtos alinhados a isso.
                </Text>
                {GOALS.map((item) => {
                  const active = goal === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.bigOption, active && styles.optionCardActive]}
                      onPress={() => setGoal(item.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bigOptionTitle, active && styles.optionTextActive]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.bigOptionHint, active && styles.hintOnDark]}>
                          {item.hint}
                        </Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={22} color="#FFF" />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.primaryBtn, !goal && styles.btnDisabled]}
                  disabled={!goal}
                  onPress={() => setStep('welcome')}
                >
                  <Text style={styles.primaryBtnText}>Continuar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setStep(alreadySelling ? 'revenue' : 'selling')}
                >
                  <Text style={styles.backLinkText}>Voltar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'welcome' && (
              <View style={[styles.welcomeBox, styles.stepBlock]}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="sparkles" size={34} color="#FFF" />
                </View>
                <Text style={styles.welcomeTitle}>Tudo pronto, {firstName}!</Text>
                <Text style={styles.welcomeText}>
                  Sua jornada na Liberdade Academy começa agora. Montamos um caminho com base no
                  nicho <Text style={styles.welcomeStrong}>{nicheLabel}</Text>
                  {alreadySelling ? ', na sua operação atual' : ''} e no objetivo de{' '}
                  <Text style={styles.welcomeStrong}>{goalLabel.toLowerCase()}</Text>.
                </Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLine}>Nicho: {nicheLabel}</Text>
                  <Text style={styles.summaryLine}>
                    Já vende: {alreadySelling ? 'Sim' : 'Ainda não'}
                  </Text>
                  {alreadySelling && revenueRange && (
                    <Text style={styles.summaryLine}>
                      Faturamento: {REVENUE.find((r) => r.id === revenueRange)?.label}
                    </Text>
                  )}
                  <Text style={styles.summaryLine}>Objetivo: {goalLabel}</Text>
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={finish} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Começar agora</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  wrap: { flex: 1, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  introBox: {
    width: '100%',
    alignItems: 'center',
  },
  introIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    alignSelf: 'center',
    ...SHADOWS.medium,
  },
  introEyebrow: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    letterSpacing: 0.4,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  introCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  introBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  introBulletText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    lineHeight: 21,
  },
  introNote: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  stepBlock: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.xl,
  },
  optionCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.small,
  },
  optionCardActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
  optionTextActive: {
    color: '#FFF',
  },
  bigOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  bigOptionTitle: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
  },
  bigOptionHint: {
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  hintOnDark: {
    color: 'rgba(255,255,255,0.75)',
  },
  listOption: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  listOptionText: {
    fontFamily: FONTS.medium,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#FFF',
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.lg,
  },
  backLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  backLinkText: {
    color: COLORS.accent,
    fontFamily: FONTS.medium,
  },
  welcomeBox: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  welcomeIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  welcomeStrong: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: 8,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  summaryLine: {
    fontFamily: FONTS.medium,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
});
