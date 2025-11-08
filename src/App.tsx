import React, { useState, useEffect } from 'react';
// import { WelcomeScreen } from './components/WelcomeScreen'; // CPO: 우선 목업으로 대체
// import { LoginScreen } from './components/LoginScreen'; // CPO: 우선 목업으로 대체
// ... (다른 모든 컴포넌트 import를 목업으로 대체) ...
// import { createClient } from './utils/supabase/client'; // CPO: Supabase Client를 여기에 통합

// [CPO 수정] 'npm install'로 설치한 '진짜' 라이브러리를 import합니다.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Toaster, toast } from "sonner"; // 'sonner@2.0.3'는 무시하고 최신 버전을 import

// -- 1. Supabase 클라이언트 설정 (PO님의 `utils/supabase/client` 대체) --
// Vercel 환경 변수에서 Supabase URL과 Key를 읽어옵니다.
// (vite.config.ts의 'define' 설정을 통해 주입됩니다)
// @ts-ignore
const supabaseUrl = __SUPABASE_URL__;
// @ts-ignore
const supabaseKey = __SUPABASE_KEY__;

const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL/Key가 없습니다. Vercel 환경변수(VITE_...)를 확인하세요.");
    return { 
      auth: { 
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ error: { message: "Supabase Key 없음" } }),
        signOut: async () => ({}),
        updateUser: async () => ({ error: { message: "Supabase Key 없음" } }),
        signInWithPassword: async () => ({ error: { message: "Supabase Key 없음" } }),
        signUp: async () => ({ error: { message: "Supabase Key 없음" } }),
      },
      from: (tableName: string) => ({ 
        upsert: async () => ({ error: { message: "Supabase Key 없음" } }),
        select: () => ({ 
          eq: () => ({ 
            single: async () => ({ data: null, error: { message: "Supabase Key 없음" } }) 
          })
        })
      }) 
    } as any;
  }
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// -- 2. PO님의 `src/components` 목업 (Mockup) --
// PO님의 `App.tsx`가 'import'하는 9개의 컴포넌트를 임시로 만듭니다.

const PlaceholderComponent = ({ name, onBack, children }: { name: string; onBack?: () => void; children?: React.ReactNode }) => (
  <div style={{ padding: '20px', border: '2px dashed #ccc', margin: '10px' }}>
    <h2 style={{ fontWeight: 'bold' }}>{name} (목업)</h2>
    {onBack && <button onClick={onBack}>&lt; 뒤로가기</button>}
    <div>{children}</div>
  </div>
);
const WelcomeScreen = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <PlaceholderComponent name="WelcomeScreen"><button onClick={onGetStarted}>시작하기</button></PlaceholderComponent>
);
const LoginScreen = ({ onLogin, onEmailLogin }: { onLogin: (provider: any) => void; onEmailLogin: () => void; }) => (
  <PlaceholderComponent name="LoginScreen">
    <button onClick={() => onLogin('google')}>Google 로그인</button>
    <button onClick={onEmailLogin}>Email 로그인</button>
  </PlaceholderComponent>
);
const EmailAuthScreen = ({ onBack, onSuccess }: { onBack: () => void; onSuccess: (user: any) => void; }) => (
  <PlaceholderComponent name="EmailAuthScreen" onBack={onBack}>
    <button onClick={() => onSuccess({ id: 'email-user', email: 'test@email.com' })}>가짜 이메일 인증</button>
  </PlaceholderComponent>
);
const ReminderSetupScreen = ({ onSetReminder, onSkip }: { onSetReminder: (time: string) => void; onSkip: () => void; }) => (
  <PlaceholderComponent name="ReminderSetupScreen">
    <button onClick={() => onSetReminder('08:00')}>08:00 설정</button>
    <button onClick={onSkip}>건너뛰기</button>
  </PlaceholderComponent>
);
const EditorScreen = ({ user, onSave, onBack }: { user: User; onSave: (content: string, date: string) => void; onBack: () => void; }) => (
  <PlaceholderComponent name="EditorScreen" onBack={onBack}>
    <p>{user.name}님, 오늘 일기를 쓰세요.</p>
    <button onClick={() => onSave('테스트 일기', new Date().toISOString().split('T')[0])}>저장</button>
  </PlaceholderComponent>
);
const HomeScreen = ({ user, onWriteToday, onViewEntry, onLogout, onNavigateToSettings }: { user: User; onWriteToday: () => void; onViewEntry: (date: string) => void; onLogout: () => void; onNavigateToSettings: () => void; }) => (
  <PlaceholderComponent name="HomeScreen">
    <p>{user.name}님, 환영합니다.</p>
    <button onClick={onWriteToday}>오늘 일기 쓰기</button>
    <button onClick={() => onViewEntry('2025-01-01')}>과거 일기 보기 (목업)</button>
    <button onClick={onNavigateToSettings}>설정</button>
    <button onClick={onLogout}>로그아웃</button>
  </PlaceholderComponent>
);
const PastEntryScreen = ({ user, date, onBack }: { user: User; date: string; onBack: () => void; }) => (
  <PlaceholderComponent name="PastEntryScreen" onBack={onBack}><p>{date}의 일기 내용 (목업)</p></PlaceholderComponent>
);
const SettingsScreen = ({ onBack, onNavigateToAccount }: { onBack: () => void; onNavigateToAccount: () => void; }) => (
  <PlaceholderComponent name="SettingsScreen" onBack={onBack}>
    <button onClick={onNavigateToAccount}>계정 설정</button>
  </PlaceholderComponent>
);
const AccountScreen = ({ email, onBack, onLogout }: { email: string; onBack: () => void; onLogout: () => void; }) => (
  <PlaceholderComponent name="AccountScreen" onBack={onBack}>
    <p>계정: {email}</p>
    <button onClick={onLogout}>로그아웃</button>
  </PlaceholderComponent>
);

// -- 3. PO님의 `App.tsx` 코드 (본체) --
// (PO님께서 주신 코드 원본)

type Screen = 'welcome' | 'login' | 'email-auth' | 'reminder-setup' | 'editor' | 'home' | 'past-entry' | 'settings' | 'account';

interface User {
  id: string;
  email: string;
  name: string;
  reminderTime?: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check if user is already logged in with Supabase
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || '',
          reminderTime: session.user.user_metadata?.reminderTime,
        };
        setUser(userData);
        setCurrentScreen('home');
      }
    };

    checkSession();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || '',
            reminderTime: session.user.user_metadata?.reminderTime,
          };
          setUser(userData);
        } else {
          setUser(null);
          setCurrentScreen('welcome');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (provider: 'kakao' | 'apple' | 'google') => { // google 포함
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) {
      console.error(`${provider} login error:`, error.message);
      // (목업 로직 삭제)
    }
  };

  const handleAuthSuccess = (userData: { id: string; name: string; email: string }) => {
    const newUser: User = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
    };
    setUser(newUser);
    setCurrentScreen('reminder-setup');
  };

  const handleReminderSetup = async (time: string) => {
    if (!user) return;
    
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { reminderTime: time }
    });

    if (error) {
      console.error('Reminder setup error:', error.message);
    } else {
      setUser({ ...user, reminderTime: time });
    }
    
    setCurrentScreen('home');
  };

  const handleSkipReminder = () => {
    setCurrentScreen('home');
  };

  const handleSaveEntry = async (content: string, date: string) => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('journal_entries')
      .upsert({
        user_id: user.id,
        date: date,
        content: content,
      }, { 
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('Save entry error:', error.message);
      toast.error('저장 실패', {
        description: '모닝 페이지를 저장하는 중 오류가 발생했습니다.',
      });
    } else {
      toast.success('저장 완료', {
        description: '모닝 페이지가 저장되었습니다.',
      });
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
      setCurrentScreen('home');
    }
  };

  const handleViewPastEntry = (date: string) => {
    setSelectedDate(date);
    setCurrentScreen('past-entry');
  };

  const handleWriteToday = () => {
    setSelectedDate(null);
    setCurrentScreen('editor');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setCurrentScreen('welcome');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {currentScreen === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setCurrentScreen('login')} />
      )}
      
      {currentScreen === 'login' && (
        <LoginScreen 
          onLogin={handleLogin}
          onEmailLogin={() => setCurrentScreen('email-auth')}
          onSocialLoginSuccess={handleAuthSuccess}
        />
      )}
      
      {currentScreen === 'email-auth' && (
        <EmailAuthScreen 
          onBack={() => setCurrentScreen('login')}
          onSuccess={handleAuthSuccess}
        />
      )}
      
      {currentScreen === 'reminder-setup' && (
        <ReminderSetupScreen 
          onSetReminder={handleReminderSetup}
          onSkip={handleSkipReminder}
        />
      )}
      
      {currentScreen === 'editor' && user && (
        <EditorScreen 
          user={user}
          onSave={handleSaveEntry}
          onBack={handleBackToHome}
        />
      )}
      
      {currentScreen === 'home' && user && (
        <HomeScreen 
          key={refreshTrigger}
          user={user}
          onWriteToday={handleWriteToday}
          onViewEntry={handleViewPastEntry}
          onLogout={handleLogout}
          onNavigateToSettings={() => setCurrentScreen('settings')}
        />
      )}
      
      {currentScreen === 'past-entry' && user && selectedDate && (
        <PastEntryScreen 
          user={user}
          date={selectedDate}
          onBack={handleBackToHome}
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen 
          onBack={handleBackToHome}
          onNavigateToAccount={() => setCurrentScreen('account')}
        />
      )}

      {currentScreen === 'account' && user && (
        <AccountScreen 
          email={user.email}
          onBack={() => setCurrentScreen('settings')}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

// -- 4. React 앱 마운트 --
// index.html의 'root' div에 App 컴포넌트를 렌더링합니다.
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
