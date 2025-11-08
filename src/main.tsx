import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// -- 1. Supabase/Sonner 클라이언트 설정 (수정됨) --

// [CPO 최종 수정]
// 'window' 글로벌 방식 대신,
// package.json을 통해 'npm install'된 '진짜' 라이브러리를 import합니다.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";


// Vercel 환경 변수에서 Supabase URL과 Key를 읽어옵니다.
// (vite.config.ts의 'define' 설정을 통해 주입됩니다)
// @ts-ignore // (TypeScript가 이 전역 변수를 모르기 때문에 경고를 무시합니다)
const supabaseUrl = __SUPABASE_URL__;
// @ts-ignore
const supabaseKey = __SUPABASE_KEY__;

// PO님의 `utils/supabase/client.ts` 파일을 여기에 합쳤습니다.
const createClient = () => {
  if (!supabaseUrl || !supabaseKey || !createSupabaseClient) {
    console.error("Supabase URL/Key 또는 클라이언트가 로드되지 않았습니다.");
    // Vercel 배포 환경에서는 목업(Mock)이 아닌, 실제 클라이언트가 생성되어야 합니다.
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
    } as any; // 목업이므로 any 타입 사용
  }
  // 실제 Supabase 클라이언트 생성
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// -- 2. PO님의 `App.tsx` 코드 (본체) --
// (PO님의 Figma 코드 로직)

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
    
    // 1. 세션 체크
    const checkSession = async () => {
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

    // 2. 인증 상태 변경 리스너
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
        redirectTo: window.location.origin, // Vercel 배포 주소로 돌아옴
      },
    });
    
    if (error) {
      console.error(`${provider} login error:`, error.message);
      sonnerToast.error('로그인 실패', { description: error.message });
    }
  };

  // 이메일 인증 성공 시 호출
  const handleAuthSuccess = (sessionUser: any) => {
    const newUser: User = {
      id: sessionUser.id,
      name: sessionUser.user_metadata?.name || sessionUser.email!,
      email: sessionUser.email!,
    };
    setUser(newUser);
    // 새 유저이므로 리마인더 설정으로 보냅니다.
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
        onConflict: 'user_id,date' // user_id와 date가 동일한 경우 덮어씁니다.
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
    setSelectedDate(null); // 오늘 날짜로 에디터 열기
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
        />
      )}
      
      {currentScreen === 'email-auth' && (
        <EmailAuthScreen 
          onBack={() => setCurrentScreen('login')}
          onSuccess={handleAuthSuccess} // 이메일 인증 성공 시 콜백
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
          selectedDate={selectedDate} // 과거 날짜 또는 null(오늘)
        />
      )}
      
      {currentScreen === 'home' && user && (
        <HomeScreen 
          key={refreshTrigger} // 저장 후 홈 화면이 새로고침(데이터 다시 불러오기)되도록 key 추가
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
// (이전과 동일)

// 공용 컴포넌트 (디자인 개선)
// CPO 수정: Tailwind CDN이 삭제되었으므로, 'style' 속성을 사용한 인라인 스타일로 변경
const PlaceholderComponent = ({ name, onBack, children }: { name: string; onBack?: () => void; children?: React.ReactNode }) => (
  <div style={{ minHeight: '100vh', padding: '24px', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '448px', margin: 'auto' }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      {onBack && (
        <button onClick={onBack} style={{ color: '#4B5563', padding: '8px', borderRadius: '9999px', marginRight: '8px' }}>
          &lt; {/* (SVG 아이콘 대신 텍스트) */}
        </button>
      )}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>{name}</h1>
    </div>
    <div style={{ flexGrow: 1, padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <p style={{ fontSize: '0.875rem', color: '#6B7280', fontStyle: 'italic', marginBottom: '16px' }}>('{name}' 컴포넌트 목업)</p>
      {children}
    </div>
  </div>
);

// WelcomeScreen (애니메이션 코드 제거됨)
const WelcomeScreen = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', backgroundColor: '#3B82F6', color: 'white', textAlign: 'center' }}>
    <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '16px' }}>모닝 페이지</h1>
    <p style={{ fontSize: '1.125rem', marginBottom: '32px' }}>매일 아침, 생각을 비우고 하루를 시작하세요.</p>
    <button 
      onClick={onGetStarted} 
      style={{ backgroundColor: 'white', color: '#3B82F6', fontWeight: '600', padding: '12px 32px', borderRadius: '9999px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
    >
      시작하기
    </button>
  </div>
);

// LoginScreen
const LoginScreen = ({ onLogin, onEmailLogin }: {
  onLogin: (provider: 'google' | 'kakao' | 'apple') => void;
  onEmailLogin: () => void;
}) => (
  <PlaceholderComponent name="로그인">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={() => onLogin('google')} style={{ width: '100%', backgroundColor: '#DC2626', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>Google 로그인</button>
      <button onClick={() => onLogin('kakao')} style={{ width: '100%', backgroundColor: '#FEE500', color: 'black', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>Kakao 로그인</button>
      <button onClick={() => onLogin('apple')} style={{ width: '100%', backgroundColor: '#000000', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>Apple 로그인</button>
      <button onClick={onEmailLogin} style={{ width: '100%', backgroundColor: '#6B7280', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>Email 로그인</button>
    </div>
  </PlaceholderComponent>
);

// EmailAuthScreen
const EmailAuthScreen = ({ onBack, onSuccess }: { onBack: () => void; onSuccess: (user: any) => void; }) => {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [message, setMessage] = useState('');

  const handleAuth = async () => {
    setMessage('처리 중...');
    if (isSignUp) {
      // 회원가입
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.user) {
        setMessage('회원가입 성공! 홈으로 이동합니다.');
        onSuccess(data.user);
      }
    } else {
      // 로그인
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else if (data.user) {
        setMessage('로그인 성공! 홈으로 이동합니다.');
        onSuccess(data.user);
      }
    }
  };
  
  return (
    <PlaceholderComponent name="Email 로그인/가입" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={{ border: '1px solid #D1D5DB', padding: '12px', borderRadius: '8px' }} />
        <input type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={e => setPassword(e.target.value)} style={{ border: '1px solid #D1D5DB', padding: '12px', borderRadius: '8px' }} />
        <button onClick={handleAuth} style={{ width: '100%', backgroundColor: '#3B82F6', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>
          {isSignUp ? '가입하기' : '로그인'}
        </button>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ fontSize: '0.875rem', color: '#3B82F6', textDecoration: 'underline' }}>
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 가입하기'}
        </button>
        {message && <p style={{ color: '#EF4444', fontSize: '0.875rem', marginTop: '8px' }}>{message}</p>}
      </div>
    </PlaceholderComponent>
  );
};

// ReminderSetupScreen
const ReminderSetupScreen = ({ onSetReminder, onSkip }: { onSetReminder: (time: string) => void; onSkip: () => void; }) => (
  <PlaceholderComponent name="알림 설정">
    <p style={{ marginBottom: '16px' }}>매일 알림 받을 시간을 선택하세요.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={() => onSetReminder('07:00')} style={{ width: '100%', backgroundColor: '#3B82F6', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>오전 7:00</button>
      <button onClick={() => onSetReminder('08:00')} style={{ width: '100%', backgroundColor: '#3B82F6', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>오전 8:00</button>
      <button onClick={() => onSetReminder('09:00')} style={{ width: '100%', backgroundColor: '#3B82F6', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>오전 9:00</button>
      <button onClick={onSkip} style={{ width: '100%', backgroundColor: '#E5E7EB', color: '#1F2937', padding: '12px', borderRadius: '8px', fontWeight: '600', marginTop: '32px' }}>나중에 설정하기</button>
    </div>
  </PlaceholderComponent>
);

// EditorScreen (Figma 코드 기반으로 복원)
const EditorScreen = ({ user, onSave, onBack, selectedDate }: {
  user: User;
  onSave: (content: string, date: string) => void;
  onBack: () => void;
  selectedDate: string | null;
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [entryDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px', backgroundColor: 'white', maxWidth: '448px', margin: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ color: '#4B5563', padding: '8px', borderRadius: '9999px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{ height: '24px', width: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>{entryDate}</h1>
        <button onClick={() => onSave(content, entryDate)} style={{ color: '#3B82F6', fontWeight: '600', padding: '8px', borderRadius: '8px' }}>
          저장
        </button>
      </div>
      <div style={{ flexGrow: 1 }}>
        {isLoading ? <p>로딩 중...</p> : (
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', height: '100%', fontSize: '1.125rem', padding: '8px', borderRadius: '8px', border: 'none', outline: 'none', resize: 'none' }}
            placeholder="오늘의 생각을 자유롭게 적어보세요..."
          />
        )}
      </div>
    </div>
  );
};

// HomeScreen (Figma 코드 기반으로 복원)
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
    <div style={{ backgroundColor: '#F3F4F6', padding: '16px', borderRadius: '8px' }}>
      <p style={{ fontWeight: '600', marginBottom: '8px' }}>임시 캘린더 뷰</p>
      {entries.length > 0 ? (
        entries.map(date => (
          <button key={date} onClick={() => onViewEntry(date)} style={{ color: '#3B82F6', display: 'block', textDecoration: 'underline' }}>
            {date} (기록 있음)
          </button>
        ))
      ) : <p>기록이 없습니다.</p>}
    </div>
  );

  return (
    <PlaceholderComponent name="홈">
      <p style={{ fontSize: '1.125rem', marginBottom: '8px' }}>{user.name}님, 안녕하세요!</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>🔥 {streak}일 연속</p>
      <MockCalendar />
      <button onClick={onWriteToday} style={{ width: '100%', marginTop: '24px', backgroundColor: '#3B82F6', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>
        오늘 일기 쓰기
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button onClick={onNavigateToSettings} style={{ color: '#4B5563', textDecoration: 'underline' }}>설정</button>
        <button onClick={onLogout} style={{ color: '#EF4444', textDecoration: 'underline' }}>로그아웃</button>
      </div>
    </PlaceholderComponent>
  );
};

// PastEntryScreen (Figma 코드 기반으로 복원)
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px', backgroundColor: 'white', maxWidth: '448px', margin: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ color: '#4B5563', padding: '8px', borderRadius: '9999px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{ height: '24px', width: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>{date}</h1>
      </div>
      <div style={{ flexGrow: 1, padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
        {isLoading ? <p>로딩 중...</p> : <p style={{ fontSize: '1.125rem', whiteSpace: 'pre-wrap' }}>{content}</p>}
      </div>
    </div>
  );
};

// SettingsScreen
const SettingsScreen = ({ onBack, onNavigateToAccount }: { onBack: () => void; onNavigateToAccount: () => void; }) => (
  <PlaceholderComponent name="설정" onBack={onBack}>
    <button onClick={onNavigateToAccount} style={{ width: '100%', textAlign: 'left', backgroundColor: '#F3F4F6', padding: '12px', borderRadius: '8px' }}>
      계정 설정
    </button>
  </PlaceholderComponent>
);

// AccountScreen
const AccountScreen = ({ email, onBack, onLogout }: { email: string; onBack: () => void; onLogout: () => void; }) => (
  <PlaceholderComponent name="계정 설정" onBack={onBack}>
    <p style={{ marginBottom: '16px' }}>로그인된 계정: {email}</p>
    <button onClick={onLogout} style={{ width: '100%', backgroundColor: '#EF4444', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600' }}>
      로그아웃
    </button>
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
