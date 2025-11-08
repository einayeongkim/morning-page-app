import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// -- 1. 라이브러리 Import (package.json에 설치되어야 함) --
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
// PO님의 'sonner@2.0.3' 버전을 존중하여 import합니다.
import { toast, Toaster as SonnerToaster } from "sonner"; 

// -- 2. Supabase 클라이언트 설정 (PO님의 `utils/supabase/client` 대체) --

// Vercel 환경 변수에서 Supabase URL과 Key를 읽어옵니다.
// (vite.config.ts의 'define' 설정을 통해 주입됩니다)
// @ts-ignore
const supabaseUrl = __SUPABASE_URL__;
// @ts-ignore
const supabaseKey = __SUPABASE_KEY__;

// PO님의 `utils/supabase/client` 파일을 여기에 합쳤습니다.
const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL/Key가 없습니다. Vercel 환경변수(VITE_...)를 확인하세요.");
    // 흰 화면 오류를 방지하기 위해 최소한의 목업 객체를 반환합니다.
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
  // 실제 Supabase 클라이언트 생성
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// -- 3. PO님의 `src/components` 목업 (Mockup) --
// PO님의 `App.tsx`가 'import'하는 9개의 컴포넌트를 임시로 만듭니다.

// (목업용 공용 컴포넌트)
const PlaceholderComponent = ({ name, onBack, children }: { name: string; onBack?: () => void; children?: React.ReactNode }) => (
  <div className="flex flex-col min-h-screen p-6 bg-white shadow-lg max-w-md mx-auto">
    <div className="flex items-center mb-6">
      {onBack && (
        <button onClick={onBack} className="text-gray-600 p-2 rounded-full hover:bg-gray-100 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <h1 className="text-2xl font-bold text-gray-800">{name}</h1>
    </div>
    <div className="flex-grow p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500 italic mb-4">('{name}' 컴포넌트 목업)</p>
      {children}
    </div>
  </div>
);

// 1. WelcomeScreen
const WelcomeScreen = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-blue-500 text-white text-center">
    <h1 className="text-4xl font-bold mb-4">모닝 페이지</h1>
    <p className="text-lg mb-8">매일 아침, 생각을 비우고 하루를 시작하세요.</p>
    <button onClick={onGetStarted} className="bg-white text-blue-500 font-semibold py-3 px-8 rounded-full shadow-lg">
      시작하기
    </button>
  </div>
);

// 2. LoginScreen
const LoginScreen = ({ onLogin, onEmailLogin }: {
  onLogin: (provider: 'google' | 'kakao' | 'apple') => void;
  onEmailLogin: () => void;
}) => (
  <PlaceholderComponent name="로그인">
    <div className="flex flex-col space-y-4">
      <button onClick={() => onLogin('google')} className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold hover:bg-red-600">Google 로그인</button>
      <button onClick={() => onLogin('kakao')} className="w-full bg-yellow-400 text-black p-3 rounded-lg font-semibold hover:bg-yellow-500">Kakao 로그인</button>
      <button onClick={() => onLogin('apple')} className="w-full bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800">Apple 로그인</button>
      <button onClick={onEmailLogin} className="w-full bg-gray-500 text-white p-3 rounded-lg font-semibold hover:bg-gray-600">Email 로그인</button>
    </div>
  </PlaceholderComponent>
);

// 3. EmailAuthScreen
const EmailAuthScreen = ({ onBack, onSuccess }: { onBack: () => void; onSuccess: (user: any) => void; }) => {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [message, setMessage] = useState('');

  const handleAuth = async () => {
    setMessage('처리 중...');
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.user) {
        setMessage('회원가입 성공!');
        onSuccess(data.user);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else if (data.user) {
        setMessage('로그인 성공!');
        onSuccess(data.user);
      }
    }
  };
  
  return (
    <PlaceholderComponent name="Email 로그인/가입" onBack={onBack}>
      <div className="flex flex-col space-y-4">
        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} className="border p-3 rounded-lg" />
        <input type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={e => setPassword(e.target.value)} className="border p-3 rounded-lg" />
        <button onClick={handleAuth} className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600">
          {isSignUp ? '가입하기' : '로그인'}
        </button>
        <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-blue-500 hover:underline">
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 가입하기'}
        </button>
        {message && <p className="text-red-500 text-sm mt-2">{message}</p>}
      </div>
    </PlaceholderComponent>
  );
};

// 4. ReminderSetupScreen
const ReminderSetupScreen = ({ onSetReminder, onSkip }: { onSetReminder: (time: string) => void; onSkip: () => void; }) => (
  <PlaceholderComponent name="알림 설정">
    <p className="mb-4">매일 알림 받을 시간을 선택하세요.</p>
    <div className="flex flex-col space-y-4">
      <button onClick={() => onSetReminder('07:00')} className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600">오전 7:00</button>
      <button onClick={() => onSetReminder('08:00')} className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600">오전 8:00</button>
      <button onClick={onSkip} className="w-full bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold hover:bg-gray-400 mt-8">나중에 설정하기</button>
    </div>
  </PlaceholderComponent>
);

// 5. EditorScreen (Supabase 연동)
const EditorScreen = ({ user, onSave, onBack }: {
  user: User;
  onSave: (content: string, date: string) => void;
  onBack: () => void;
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [entryDate] = useState(new Date().toISOString().split('T')[0]);
  const supabase = createClient();

  useEffect(() => {
    const fetchEntry = async () => {
       setIsLoading(true);
       const { data } : { data: { content: string } | null } = await supabase.from('journal_entries')
         .select('content')
         .eq('user_id', user.id)
         .eq('date', entryDate)
         .single();
       if (data) setContent(data.content);
       setIsLoading(false);
    };
    fetchEntry();
  }, [user, entryDate, supabase]);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-gray-600 p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">{entryDate}</h1>
        <button onClick={() => onSave(content, entryDate)} className="text-blue-500 font-semibold p-2 rounded-lg hover:bg-blue-50">
          저장
        </button>
      </div>
      <div className="flex-grow">
        {isLoading ? <p>로딩 중...</p> : (
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full text-lg p-2 rounded-lg border-none focus:ring-0"
            placeholder="오늘의 생각을 자유롭게 적어보세요..."
          />
        )}
      </div>
    </div>
  );
};

// 6. HomeScreen (Supabase 연동)
const HomeScreen = ({ user, onWriteToday, onViewEntry, onLogout, onNavigateToSettings }: {
  user: User;
  onWriteToday: () => void;
  onViewEntry: (date: string) => void;
  onLogout: () => void;
  onNavigateToSettings: () => void;
}) => {
  const [streak, setStreak] = useState(0);
  const [entries, setEntries] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } : { data: { date: string }[] | null } = await supabase.from('journal_entries').select('date').eq('user_id', user.id);
      if(data) {
        setStreak(data.length); // CPO Note: 단순 카운트 목업
        setEntries(data.map(e => e.date));
      }
    };
    fetchData();
  }, [user, supabase]);
  
  const MockCalendar = () => (
    <div className="bg-gray-100 p-4 rounded-lg">
      <p className="font-semibold mb-2">임시 캘린더 뷰</p>
      {entries.length > 0 ? (
        entries.map(date => (
          <button key={date} onClick={() => onViewEntry(date)} className="text-blue-500 block hover:underline">
            {date} (기록 있음)
          </button>
        ))
      ) : <p>기록이 없습니다.</p>}
    </div>
  );

  return (
    <PlaceholderComponent name="홈">
      <p className="text-lg mb-2">{user.name}님, 안녕하세요!</p>
      <p className="text-2xl font-bold mb-6">🔥 {streak}일 연속</p>
      <MockCalendar />
      <button onClick={onWriteToday} className="w-full mt-6 bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600">
        오늘 일기 쓰기
      </button>
      <div className="flex justify-between mt-4">
        <button onClick={onNavigateToSettings} className="text-gray-600 hover:underline">설정</button>
        <button onClick={onLogout} className="text-red-500 hover:underline">로그아웃</button>
      </div>
    </PlaceholderComponent>
  );
};

// 7. PastEntryScreen (Supabase 연동)
const PastEntryScreen = ({ user, date, onBack }: { user: User; date: string; onBack: () => void; }) => {
  const [content, setContent] = useState('로딩 중...');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchEntry = async () => {
       setIsLoading(true);
       const { data } : { data: { content: string } | null } = await supabase.from('journal_entries')
         .select('content')
         .eq('user_id', user.id)
         .eq('date', date)
         .single();
       if (data) setContent(data.content);
       else setContent('작성된 일기가 없습니다.');
       setIsLoading(false);
    };
    fetchEntry();
  }, [user, date, supabase]);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="text-gray-600 p-2 rounded-full hover:bg-gray-100 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{date}</h1>
      </div>
      <div className="flex-grow p-4 bg-gray-50 rounded-lg">
        {isLoading ? <p>로딩 중...</p> : <p className="text-lg whitespace-pre-wrap">{content}</p>}
      </div>
    </div>
  );
};

// 8. SettingsScreen
const SettingsScreen = ({ onBack, onNavigateToAccount }: { onBack: () => void; onNavigateToAccount: () => void; }) => (
  <PlaceholderComponent name="설정" onBack={onBack}>
    <button onClick={onNavigateToAccount} className="w-full text-left bg-gray-100 p-3 rounded-lg hover:bg-gray-200">
      계정 설정
    </button>
  </PlaceholderComponent>
);

// 9. AccountScreen
const AccountScreen = ({ email, onBack, onLogout }: { email: string; onBack: () => void; onLogout: () => void; }) => (
  <PlaceholderComponent name="계정 설정" onBack={onBack}>
    <p className="mb-4">로그인된 계정: {email}</p>
    <button onClick={onLogout} className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold hover:bg-red-600">
      로그아웃
    </button>
  </PlaceholderComponent>
);

// [CPO 수정] PO님의 Figma 코드에 있던 `Toaster` import를 여기서 처리합니다.
// sonner의 Toaster를 Toaster라는 이름으로 사용합니다.
const Toaster = SonnerToaster;

// -- 4. PO님의 `App.tsx` 코드 (본체) --
// CPO 수정: `export default`를 제거하고, `App` 함수로 만듭니다.
// CPO 수정: `import` 구문들은 이 파일의 맨 위(1번)로 이동시켰습니다.

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

  const handleLogin = async (provider: 'kakao' | 'apple' | 'google') => { // google 추가
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) {
      console.error(`${provider} login error:`, error.message);
      // CPO 수정: PO님의 코드에 있던 Mock User 로직은 Vercel 배포 시 필요 없으므로 제거
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
      // CPO 수정: PO님의 `toast`를 `sonnerToast`로 변경
      sonnerToast.error('저장 실패', {
        description: '모닝 페이지를 저장하는 중 오류가 발생했습니다.',
      });
    } else {
      // CPO 수정: PO님의 `toast`를 `sonnerToast`로 변경
      sonnerToast.success('저장 완료', {
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
      {/* CPO 수정: PO님의 <Toaster />를 <SonnerToaster />로 변경 */}
      <SonnerToaster />
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
          // CPO 수정: PO님의 Figma 코드에는 EditorScreen에 selectedDate가 없습니다.
          // 하지만 PO님의 App.tsx 렌더링 로직(line 233)에는 이 prop이 없습니다.
          // HomeScreen에서 '오늘 일기'가 아닌 '과거 일기'를 수정하는 시나리오를 위해
          // EditorScreen 목업에 이 prop을 추가하고, App.tsx 렌더링 로직도 수정합니다.
          // (PO님의 원본 코드에는 233라인에 `selectedDate` prop이 없었습니다)
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

// -- 5. React 앱 마운트 --
// index.html의 'root' div에 App 컴포넌트를 렌더링합니다.
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
