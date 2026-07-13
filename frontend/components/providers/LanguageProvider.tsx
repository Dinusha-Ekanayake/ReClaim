'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type Locale, translations } from '@/lib/i18n';

const englishSurface = {
  'language.choose': 'Choose language',
  'language.english': 'English',
  'language.sinhala': 'Sinhala',
  'language.tamil': 'Tamil',
  'auth.email': 'Email address',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'Password',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.terms': 'Terms',
  'auth.privacy': 'Privacy Policy',
  'auth.and': 'and',
  'auth.legalSignIn': 'By signing in, you agree to our',
  'auth.legalRegister': 'By creating an account, you agree to our',
  'auth.redirecting': 'Taking you to your account…',
  'login.title': 'Welcome back',
  'login.subtitle': 'Sign in to continue to ReClaim.',
  'login.noAccount': "Don't have an account?",
  'login.signUp': 'Create one',
  'login.forgot': 'Forgot password?',
  'login.passwordPlaceholder': 'Enter your password',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.browse': 'Browse items without signing in',
  'login.error': 'Sign in failed. Please check your details and try again.',
  'login.expired': 'Your session expired. Sign in again to continue.',
  'login.resetSuccess': 'Your password was updated. Sign in with your new password.',
  'register.title': 'Create your account',
  'register.subtitle': 'Join ReClaim and help return lost items to their owners.',
  'register.hasAccount': 'Already have an account?',
  'register.signIn': 'Sign in',
  'register.name': 'Full name',
  'register.namePlaceholder': 'Your name',
  'register.passwordPlaceholder': 'Create a strong password',
  'register.submit': 'Create account',
  'register.submitting': 'Creating account…',
  'register.error': 'We could not create your account. Please try again.',
  'register.nameError': 'Enter a name with at least 2 characters.',
  'register.passwordError': 'Your password does not meet all requirements.',
  'register.ruleLength': 'At least 8 characters',
  'register.ruleUpper': 'One uppercase letter',
  'register.ruleLower': 'One lowercase letter',
  'register.ruleNumber': 'One number',
  'register.ruleBytes': 'No more than 72 bytes',
  'forgot.back': 'Back to sign in',
  'forgot.title': 'Reset your password',
  'forgot.subtitle': 'Enter your email and we will send a single-use reset link.',
  'forgot.submit': 'Send reset link',
  'forgot.submitting': 'Sending…',
  'forgot.error': 'We could not request a password reset. Please try again.',
  'forgot.success': 'If an account exists and email delivery is available, a reset link will arrive shortly.',
  'forgot.devLink': 'Open development reset link',
  'forgot.another': 'Use another email',
  'reset.invalidTitle': 'Invalid reset link',
  'reset.invalidBody': 'This link is incomplete, invalid, or expired. Request a new link to continue.',
  'reset.requestAnother': 'Request another link',
  'reset.successTitle': 'Password updated',
  'reset.successBody': 'Your previous sessions were signed out. You can now use your new password.',
  'reset.signIn': 'Sign in',
  'reset.title': 'Choose a new password',
  'reset.subtitle': 'This single-use link expires after 30 minutes.',
  'reset.newPassword': 'New password',
  'reset.confirmPassword': 'Confirm password',
  'reset.ruleError': 'Use 8–72 characters with uppercase, lowercase, and a number.',
  'reset.mismatch': 'The passwords do not match.',
  'reset.error': 'We could not reset your password. Request a new link if this one has expired.',
  'reset.submit': 'Update password',
  'reset.submitting': 'Updating…',
  'notFound.title': 'Page not found',
  'notFound.body': 'The page may have moved or the address may be incorrect.',
  'notFound.home': 'Go to home',
  'notFound.browse': 'Browse items',
  'loading.label': 'Loading ReClaim',
} as const;

type SurfaceTranslationKey = keyof typeof englishSurface;

const surfaceTranslations: Record<Locale, Record<SurfaceTranslationKey, string>> = {
  en: englishSurface,
  si: {
    'language.choose': 'භාෂාව තෝරන්න',
    'language.english': 'ඉංග්‍රීසි',
    'language.sinhala': 'සිංහල',
    'language.tamil': 'දෙමළ',
    'auth.email': 'විද්‍යුත් තැපෑල',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.password': 'මුරපදය',
    'auth.showPassword': 'මුරපදය පෙන්වන්න',
    'auth.hidePassword': 'මුරපදය සඟවන්න',
    'auth.terms': 'භාවිත නියමයන්',
    'auth.privacy': 'රහස්‍යතා ප්‍රතිපත්තිය',
    'auth.and': 'සහ',
    'auth.legalSignIn': 'පිවිසීමෙන්, ඔබ අපගේ',
    'auth.legalRegister': 'ගිණුමක් සෑදීමෙන්, ඔබ අපගේ',
    'auth.redirecting': 'ඔබේ ගිණුම වෙත යොමු කරමින්…',
    'login.title': 'නැවත සාදරයෙන් පිළිගනිමු',
    'login.subtitle': 'ReClaim වෙත ඉදිරියට යාමට පිවිසෙන්න.',
    'login.noAccount': 'ගිණුමක් නැද්ද?',
    'login.signUp': 'ගිණුමක් සාදන්න',
    'login.forgot': 'මුරපදය අමතකද?',
    'login.passwordPlaceholder': 'ඔබේ මුරපදය ඇතුළත් කරන්න',
    'login.submit': 'පිවිසෙන්න',
    'login.submitting': 'පිවිසෙමින්…',
    'login.browse': 'පිවිසීමෙන් තොරව අයිතම බලන්න',
    'login.error': 'පිවිසීමට නොහැකි විය. තොරතුරු පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
    'login.expired': 'ඔබේ සැසිය කල් ඉකුත් වී ඇත. ඉදිරියට යාමට නැවත පිවිසෙන්න.',
    'login.resetSuccess': 'මුරපදය යාවත්කාලීන විය. නව මුරපදයෙන් පිවිසෙන්න.',
    'register.title': 'ඔබේ ගිණුම සාදන්න',
    'register.subtitle': 'අහිමි අයිතම හිමිකරුවන්ට නැවත ලබා දීමට ReClaim සමඟ එක්වන්න.',
    'register.hasAccount': 'දැනටමත් ගිණුමක් තිබේද?',
    'register.signIn': 'පිවිසෙන්න',
    'register.name': 'සම්පූර්ණ නම',
    'register.namePlaceholder': 'ඔබේ නම',
    'register.passwordPlaceholder': 'ශක්තිමත් මුරපදයක් සාදන්න',
    'register.submit': 'ගිණුම සාදන්න',
    'register.submitting': 'ගිණුම සාදමින්…',
    'register.error': 'ගිණුම සෑදීමට නොහැකි විය. නැවත උත්සාහ කරන්න.',
    'register.nameError': 'අවම වශයෙන් අක්ෂර 2ක් සහිත නමක් ඇතුළත් කරන්න.',
    'register.passwordError': 'ඔබේ මුරපදය සියලු අවශ්‍යතා සපුරා නැත.',
    'register.ruleLength': 'අක්ෂර 8ක් හෝ වැඩි',
    'register.ruleUpper': 'එක් ඉංග්‍රීසි ලොකු අකුරක්',
    'register.ruleLower': 'එක් ඉංග්‍රීසි කුඩා අකුරක්',
    'register.ruleNumber': 'එක් අංකයක්',
    'register.ruleBytes': 'බයිට් 72කට නොවැඩි',
    'forgot.back': 'පිවිසුම වෙත ආපසු',
    'forgot.title': 'මුරපදය යළි සකසන්න',
    'forgot.subtitle': 'ඔබේ විද්‍යුත් තැපෑල ඇතුළත් කරන්න. එක් වරක් භාවිත කළ හැකි සබැඳියක් එවන්නෙමු.',
    'forgot.submit': 'යළි සැකසුම් සබැඳිය එවන්න',
    'forgot.submitting': 'යවමින්…',
    'forgot.error': 'මුරපද යළි සැකසුම ඉල්ලීමට නොහැකි විය. නැවත උත්සාහ කරන්න.',
    'forgot.success': 'ගිණුමක් තිබේ නම් සහ විද්‍යුත් තැපැල් සේවාව ලබා ගත හැකි නම්, යළි සැකසුම් සබැඳියක් ඉක්මනින් ලැබෙනු ඇත.',
    'forgot.devLink': 'සංවර්ධන යළි සැකසුම් සබැඳිය විවෘත කරන්න',
    'forgot.another': 'වෙනත් විද්‍යුත් තැපෑලක් භාවිත කරන්න',
    'reset.invalidTitle': 'වලංගු නොවන යළි සැකසුම් සබැඳිය',
    'reset.invalidBody': 'මෙම සබැඳිය අසම්පූර්ණ, වලංගු නොවන හෝ කල් ඉකුත් වී ඇත. නව සබැඳියක් ඉල්ලන්න.',
    'reset.requestAnother': 'වෙනත් සබැඳියක් ඉල්ලන්න',
    'reset.successTitle': 'මුරපදය යාවත්කාලීන විය',
    'reset.successBody': 'ඔබේ පෙර සැසි අවසන් කර ඇත. දැන් නව මුරපදය භාවිත කළ හැක.',
    'reset.signIn': 'පිවිසෙන්න',
    'reset.title': 'නව මුරපදයක් තෝරන්න',
    'reset.subtitle': 'මෙම එක්-වරක් සබැඳිය මිනිත්තු 30කින් කල් ඉකුත් වේ.',
    'reset.newPassword': 'නව මුරපදය',
    'reset.confirmPassword': 'මුරපදය තහවුරු කරන්න',
    'reset.ruleError': 'ලොකු අකුරක්, කුඩා අකුරක් සහ අංකයක් සහිත අක්ෂර 8–72ක් භාවිත කරන්න.',
    'reset.mismatch': 'මුරපද දෙක ගැළපෙන්නේ නැත.',
    'reset.error': 'මුරපදය යළි සැකසීමට නොහැකි විය. සබැඳිය කල් ඉකුත් වී ඇත්නම් නව එකක් ඉල්ලන්න.',
    'reset.submit': 'මුරපදය යාවත්කාලීන කරන්න',
    'reset.submitting': 'යාවත්කාලීන කරමින්…',
    'notFound.title': 'පිටුව හමු නොවීය',
    'notFound.body': 'පිටුව වෙනත් තැනකට ගෙන ගොස් තිබිය හැකිය, නැතිනම් ලිපිනය වැරදිය.',
    'notFound.home': 'මුල් පිටුවට යන්න',
    'notFound.browse': 'අයිතම බලන්න',
    'loading.label': 'ReClaim පූරණය වෙමින්',
  },
  ta: {
    'language.choose': 'மொழியைத் தேர்ந்தெடுக்கவும்',
    'language.english': 'ஆங்கிலம்',
    'language.sinhala': 'சிங்களம்',
    'language.tamil': 'தமிழ்',
    'auth.email': 'மின்னஞ்சல் முகவரி',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.password': 'கடவுச்சொல்',
    'auth.showPassword': 'கடவுச்சொல்லைக் காட்டு',
    'auth.hidePassword': 'கடவுச்சொல்லை மறை',
    'auth.terms': 'விதிமுறைகள்',
    'auth.privacy': 'தனியுரிமைக் கொள்கை',
    'auth.and': 'மற்றும்',
    'auth.legalSignIn': 'உள்நுழைவதன் மூலம், எங்கள்',
    'auth.legalRegister': 'கணக்கை உருவாக்குவதன் மூலம், எங்கள்',
    'auth.redirecting': 'உங்கள் கணக்கிற்கு அழைத்துச் செல்கிறோம்…',
    'login.title': 'மீண்டும் வரவேற்கிறோம்',
    'login.subtitle': 'ReClaim-ஐத் தொடர உள்நுழையவும்.',
    'login.noAccount': 'கணக்கு இல்லையா?',
    'login.signUp': 'கணக்கை உருவாக்கவும்',
    'login.forgot': 'கடவுச்சொல் மறந்துவிட்டதா?',
    'login.passwordPlaceholder': 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்',
    'login.submit': 'உள்நுழைக',
    'login.submitting': 'உள்நுழைகிறது…',
    'login.browse': 'உள்நுழையாமல் பொருட்களைப் பார்க்கவும்',
    'login.error': 'உள்நுழைய முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயலவும்.',
    'login.expired': 'உங்கள் அமர்வு காலாவதியானது. தொடர மீண்டும் உள்நுழையவும்.',
    'login.resetSuccess': 'கடவுச்சொல் புதுப்பிக்கப்பட்டது. புதிய கடவுச்சொல்லுடன் உள்நுழையவும்.',
    'register.title': 'உங்கள் கணக்கை உருவாக்கவும்',
    'register.subtitle': 'தொலைந்த பொருட்களை உரிமையாளர்களிடம் சேர்க்க ReClaim-இல் இணையவும்.',
    'register.hasAccount': 'ஏற்கனவே கணக்கு உள்ளதா?',
    'register.signIn': 'உள்நுழைக',
    'register.name': 'முழுப் பெயர்',
    'register.namePlaceholder': 'உங்கள் பெயர்',
    'register.passwordPlaceholder': 'வலுவான கடவுச்சொல்லை உருவாக்கவும்',
    'register.submit': 'கணக்கை உருவாக்கவும்',
    'register.submitting': 'கணக்கு உருவாகிறது…',
    'register.error': 'கணக்கை உருவாக்க முடியவில்லை. மீண்டும் முயலவும்.',
    'register.nameError': 'குறைந்தது 2 எழுத்துகள் உள்ள பெயரை உள்ளிடவும்.',
    'register.passwordError': 'உங்கள் கடவுச்சொல் அனைத்து தேவைகளையும் பூர்த்தி செய்யவில்லை.',
    'register.ruleLength': 'குறைந்தது 8 எழுத்துகள்',
    'register.ruleUpper': 'ஒரு ஆங்கில பெரிய எழுத்து',
    'register.ruleLower': 'ஒரு ஆங்கில சிறிய எழுத்து',
    'register.ruleNumber': 'ஒரு எண்',
    'register.ruleBytes': '72 பைட்டுகளுக்கு மிகாமல்',
    'forgot.back': 'உள்நுழைவுக்குத் திரும்பு',
    'forgot.title': 'கடவுச்சொல்லை மீட்டமைக்கவும்',
    'forgot.subtitle': 'உங்கள் மின்னஞ்சலை உள்ளிடவும். ஒருமுறை பயன்படுத்தும் இணைப்பை அனுப்புவோம்.',
    'forgot.submit': 'மீட்டமைப்பு இணைப்பை அனுப்பு',
    'forgot.submitting': 'அனுப்புகிறது…',
    'forgot.error': 'கடவுச்சொல் மீட்டமைப்பைக் கோர முடியவில்லை. மீண்டும் முயலவும்.',
    'forgot.success': 'கணக்கு இருந்து மின்னஞ்சல் சேவை கிடைத்தால், மீட்டமைப்பு இணைப்பு விரைவில் வரும்.',
    'forgot.devLink': 'மேம்பாட்டு மீட்டமைப்பு இணைப்பைத் திறக்கவும்',
    'forgot.another': 'வேறு மின்னஞ்சலைப் பயன்படுத்தவும்',
    'reset.invalidTitle': 'செல்லாத மீட்டமைப்பு இணைப்பு',
    'reset.invalidBody': 'இந்த இணைப்பு முழுமையற்றது, செல்லாதது அல்லது காலாவதியானது. புதிய இணைப்பைக் கோரவும்.',
    'reset.requestAnother': 'மற்றொரு இணைப்பைக் கோரவும்',
    'reset.successTitle': 'கடவுச்சொல் புதுப்பிக்கப்பட்டது',
    'reset.successBody': 'உங்கள் முந்தைய அமர்வுகள் முடிக்கப்பட்டன. இப்போது புதிய கடவுச்சொல்லைப் பயன்படுத்தலாம்.',
    'reset.signIn': 'உள்நுழைக',
    'reset.title': 'புதிய கடவுச்சொல்லைத் தேர்ந்தெடுக்கவும்',
    'reset.subtitle': 'ஒருமுறை பயன்படுத்தும் இந்த இணைப்பு 30 நிமிடங்களில் காலாவதியாகும்.',
    'reset.newPassword': 'புதிய கடவுச்சொல்',
    'reset.confirmPassword': 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    'reset.ruleError': 'பெரிய எழுத்து, சிறிய எழுத்து மற்றும் எண்ணுடன் 8–72 எழுத்துகளைப் பயன்படுத்தவும்.',
    'reset.mismatch': 'கடவுச்சொற்கள் பொருந்தவில்லை.',
    'reset.error': 'கடவுச்சொல்லை மீட்டமைக்க முடியவில்லை. இணைப்பு காலாவதியானால் புதிய ஒன்றைக் கோரவும்.',
    'reset.submit': 'கடவுச்சொல்லைப் புதுப்பிக்கவும்',
    'reset.submitting': 'புதுப்பிக்கிறது…',
    'notFound.title': 'பக்கம் கிடைக்கவில்லை',
    'notFound.body': 'பக்கம் நகர்த்தப்பட்டிருக்கலாம் அல்லது முகவரி தவறாக இருக்கலாம்.',
    'notFound.home': 'முகப்புக்குச் செல்',
    'notFound.browse': 'பொருட்களைப் பார்க்கவும்',
    'loading.label': 'ReClaim ஏற்றப்படுகிறது',
  },
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const HTML_LANG: Record<Locale, string> = { en: 'en-LK', si: 'si-LK', ta: 'ta-LK' };
const VALID_LOCALES: readonly Locale[] = ['en', 'si', 'ta'];

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && VALID_LOCALES.includes(value as Locale);
}

function readableKey(key: string) {
  const segment = key.split('.').pop() || '';
  const words = segment.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').trim();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : 'Text unavailable';
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: (key, fallback) => fallback ?? readableKey(key),
  formatNumber: value => String(value),
  formatDate: value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  },
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('locale');
      if (saved && !isLocale(saved)) localStorage.removeItem('locale');
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }

    if (!isLocale(saved)) {
      const cookieValue = document.cookie
        .split('; ')
        .find(entry => entry.startsWith('reclaim_locale='))
        ?.split('=')[1];
      try {
        saved = cookieValue ? decodeURIComponent(cookieValue) : null;
      } catch {
        saved = null;
      }
    }

    if (isLocale(saved)) {
      setLocaleState(saved);
      return;
    }

    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('si')) setLocaleState('si');
    else if (browserLanguage.startsWith('ta')) setLocaleState('ta');
  }, []);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem('locale', next);
    } catch {
      // The in-memory choice still works when storage is unavailable.
    }
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `reclaim_locale=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    } catch {
      // Cookie persistence is optional when a browser blocks it.
    }
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const surfaceKey = key as SurfaceTranslationKey;
    return surfaceTranslations[locale][surfaceKey]
      ?? translations[locale]?.[key]
      ?? surfaceTranslations.en[surfaceKey]
      ?? translations.en[key]
      ?? fallback
      ?? readableKey(key);
  }, [locale]);

  const intlLocale = HTML_LANG[locale];
  const formatNumber = useCallback(
    (value: number) => new Intl.NumberFormat(intlLocale).format(value),
    [intlLocale]
  );
  const formatDate = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(intlLocale, options ?? { dateStyle: 'medium' }).format(date);
  }, [intlLocale]);

  const contextValue = useMemo(
    () => ({ locale, setLocale, t, formatNumber, formatDate }),
    [formatDate, formatNumber, locale, setLocale, t]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
