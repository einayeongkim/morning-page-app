import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Supabase 라이브러리를 CDN에서 직접 가져옵니다.
import { createClient as createSupabaseClient } from "https://unpkg.com/@supabase/supabase-js@2.44.2/dist/module/index.js";

// sonner(알림) 라이브러리를 CDN에서 가져옵니다.
// 'sonner@2.0.3'는 특정 버전이라 CDN에서 찾기 어려워, 호환되는 최신 버전을 사용합니다.
import { Toaster as SonnerToaster, toast as sonnerToast } from "https://unpkg.com/sonner@1.5.0/dist/index.mjs";

// -- 1. Supabase 클라이언트 설정 --
// Vercel 환경 변수에서 Supabase URL과 Key를 읽어옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// PO님의 `utils/supabase/client.ts` 파일을 여기에 합쳤습니다.
const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL/Key가 없습니다. Vercel 환경변수를 확인하세요.");
    // Vercel 배포 환경에서는 목업(Mock)이 아닌, 실제 클라이언트가 생성되어야 합니다.
    // 임시 목업 대신, 오류를 방지하기 위해 최소한의 객체를 반환합니다.
    return { 
      auth: { 
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ error: { message: "Supabase Key 없음" } }),
        signOut: async () => ({})
      },
      from: () => ({ 
        upsert: async () => ({ error: { message: "Supabase Key 없음" } }) 
      }) 
    };
  }
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// -- 2. PO님의 `App.tsx` 코드 (본체) --
// PO님께서 Figma에서 가져오신 `App` 코드가 여기에 포함됩니다.

type Screen = 'welcome' | 'login' | 'email-auth' | 'reminder-setup' | 'editor' | 'home' | 'past-entry' | 'settings' | 'account';

interface User {
  id: string;
  email: string;
  name: string;
  reminderTime?: string;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const { data: { session } } = supabase.auth.getSession();
    
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
          // 로그인/가입 시 'home'으로 바로 보내지 않고, 세션이 생겼을 때의 상태를 유지
          // (checkSession에서 이미 'home'으로 보냈거나, 로그인 후 'reminder-setup'으로 가야 함)
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

  const handleLogin = async (provider: 'kakao' | 'apple' | 'google') => { // google 추가
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin, // Vercel 배포 주소로 돌아옴
      },
    });
    
    if (error) {
      console.error(`${provider} login error:`, error.message);
      sonnerToast.error('로그인 실패', { description: error.message });
    }
  };

  const handleAuthSuccess = (sessionUser: any) => {
    const newUser: User = {
      id: sessionUser.id,
      name: sessionUser.user_metadata?.name || sessionUser.email!,
      email: sessionUser.email!,
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
      sonnerToast.error('알림 설정 실패', { description: error.message });
    } else {
      setUser({ ...user, reminderTime: time });
      sonnerToast.success('알림이 설정되었습니다.');
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
      sonnerToast.error('저장 실패', {
        description: '모닝 페이지를 저장하는 중 오류가 발생했습니다.',
      });
    } else {
      sonnerToast.success('저장 완료', {
        description: '모닝 페이지가 저장되었습니다.',
      });
      setRefreshTrigger(prev => prev + 1); // 홈 화면 새로고침 트리거
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

  // -- 렌더링 로직 --
  return (
    <div className="min-h-screen bg-gray-50">
      <SonnerToaster /> {/* 'sonner' 알림창 컴포넌트 */}
      
      {currentScreen === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setCurrentScreen('login')} />
      )}
      
      {currentScreen === 'login' && (
        <LoginScreen 
          onLogin={handleLogin}
          onEmailLogin={() => setCurrentScreen('email-auth')}
          onSocialLoginSuccess={handleAuthSuccess} // 이메일이 아닌 소셜 로그인 성공 시
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
          selectedDate={selectedDate} // HomeScreen에서 날짜를 선택한 경우
        />
      )}
      
      {currentScreen === 'home' && user && (
        <HomeScreen 
          key={refreshTrigger} // 저장 후 홈 화면이 새로고침되도록 key 추가
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


// -- 3. 목업(Mockup) 컴포넌트 --
// PO님의 `src/components` 폴더 안의 파일들을 여기에 임시로 합쳤습니다.
// Vercel이 이 파일들을 찾지 못해 빌드 에러가 났던 것입니다.

const PlaceholderComponent = ({ name, onBack, children }: { name: string; onBack?: () => void; children?: React.ReactNode }) => (
  <div className="p-4">
    <h1 className="text-xl font-bold mb-4">{name}</h1>
    {onBack && <button onClick={onBack} className="text-blue-500 mb-4">&lt; 뒤로가기</button>}
    <div className="p-4 bg-gray-200 rounded-lg min-h-[200px]">
      <p className="text-gray-600">이것은 '{name}' 컴포넌트의 임시 목업(Mockup)입니다.</p>
      {children}
    </div>
  </div>
);

// PO님의 `App.tsx`가 필요로 하는 모든 컴포넌트들을 임시로 만듭니다.
const WelcomeScreen = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <PlaceholderComponent name="WelcomeScreen">
    <button onClick={onGetStarted} className="mt-4 bg-blue-500 text-white p-2 rounded">시작하기</button>
  </PlaceholderComponent>
);

const LoginScreen = ({ onLogin, onEmailLogin, onSocialLoginSuccess }: {
  onLogin: (provider: any) => void;
  onEmailLogin: () => void;
  onSocialLoginSuccess: (user: any) => void;
}) => (
  <PlaceholderComponent name="LoginScreen">
    <button onClick={() => onLogin('google')} className="mt-4 bg-red-500 text-white p-2 rounded">Google 로그인</button>
    <button onClick={onEmailLogin} className="mt-4 bg-gray-500 text-white p-2 rounded">Email 로그인</button>
  </PlaceholderComponent>
);

const EmailAuthScreen = ({ onBack, onSuccess }: { onBack: () => void; onSuccess: (user: any) => void; }) => (
  <PlaceholderComponent name="EmailAuthScreen" onBack={onBack}>
    <button onClick={() => onSuccess({ id: 'email-user-123', email: 'email@test.com', user_metadata: { name: 'Email User' } })} className="mt-4 bg-green-500 text-white p-2 rounded">가짜 이메일 인증 성공</button>
  </PlaceholderComponent>
);

const ReminderSetupScreen = ({ onSetReminder, onSkip }: { onSetReminder: (time: string) => void; onSkip: () => void; }) => (
  <PlaceholderComponent name="ReminderSetupScreen">
    <button onClick={() => onSetReminder('09:00')} className="mt-4 bg-blue-500 text-white p-2 rounded">09:00로 설정</button>
    <button onClick={onSkip} className="mt-4 bg-gray-300 p-2 rounded">건너뛰기</button>
  </PlaceholderComponent>
);

// EditorScreen은 실제 로직이 필요할 수 있으므로 조금 더 구현
const EditorScreen = ({ user, onSave, onBack, selectedDate }: {
  user: User;
  onSave: (content: string, date: string) => void;
  onBack: () => void;
  selectedDate: string | null;
}) => {
  const [content, setContent] = useState('');
  const [entryDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  
  // (실제 앱에서는 Supabase에서 기존 데이터를 fetch해야 함)

  return (
    <PlaceholderComponent name="EditorScreen" onBack={onBack}>
      <p>{entryDate}의 일기</p>
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-40 border"
        placeholder="오늘의 생각을 적어보세요..."
      />
      <button onClick={() => onSave(content, entryDate)} className="mt-4 bg-blue-500 text-white p-2 rounded">저장</button>
    </PlaceholderComponent>
  );
};

// HomeScreen은 실제 로직이 필요할 수 있으므로 조금 더 구현
const HomeScreen = ({ user, onWriteToday, onViewEntry, onLogout, onNavigateToSettings }: {
  user: User;
  onWriteToday: () => void;
  onViewEntry: (date: string) => void;
  onLogout: () => void;
  onNavigateToSettings: () => void;
}) => {
  // (실제 앱에서는 Supabase에서 스트릭/캘린더 데이터를 fetch해야 함)
  
  return (
    <PlaceholderComponent name="HomeScreen">
      <p>{user.name}님, 안녕하세요!</p>
      <p>🔥 0일 연속</p>
      <button onClick={onWriteToday} className="mt-4 bg-green-500 text-white p-2 rounded">오늘 일기 쓰기</button>
      <button onClick={() => onViewEntry(new Date().toISOString().split('T')[0])} className="mt-4 bg-gray-300 p-2 rounded">오늘 일기 보기</button>
      <button onClick={onNavigateToSettings} className="mt-4 bg-gray-500 text-white p-2 rounded">설정</button>
      <button onClick={onLogout} className="mt-4 bg-red-500 text-white p-2 rounded">로그아웃</button>
    </PlaceholderComponent>
  );
};

const PastEntryScreen = ({ user, date, onBack }: { user: User; date: string; onBack: () => void; }) => (
  <PlaceholderComponent name="PastEntryScreen" onBack={onBack}>
    <p>{date}의 일기입니다.</p>
    <p>... (Supabase에서 불러온 내용) ...</p>
  </PlaceholderComponent>
);

const SettingsScreen = ({ onBack, onNavigateToAccount }: { onBack: () => void; onNavigateToAccount: () => void; }) => (
  <PlaceholderComponent name="SettingsScreen" onBack={onBack}>
    <button onClick={onNavigateToAccount} className="mt-4 bg-gray-500 text-white p-2 rounded">계정 설정</button>
  </PlaceholderComponent>
);

const AccountScreen = ({ email, onBack, onLogout }: { email: string; onBack: () => void; onLogout: () => void; }) => (
  <PlaceholderComponent name="AccountScreen" onBack={onBack}>
    <p>계정: {email}</p>
    <button onClick={onLogout} className="mt-4 bg-red-500 text-white p-2 rounded">로그아웃</button>
  </PlaceholderComponent>
);


// -- 4. React 앱 마운트 --
// index.html의 'root' div에 App 컴포넌트를 렌더링합니다.
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
