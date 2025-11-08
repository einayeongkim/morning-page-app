import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// -- 1. Supabase/Sonner 클라이언트 설정 (수정됨) --

// [CPO 최종 수정 1]
// 'import ... from "https-url"' 대신,
// index.html이 로드한 전역(window) 변수를 사용합니다.
// @ts-ignore
const { createClient: createSupabaseClient } = window.supabase;
// @ts-ignore
const { Toaster: SonnerToaster, toast: sonnerToast } = window.Sonner;


// Vercel 환경 변수에서 Supabase URL과 Key를 읽어옵니다.
// [CPO 최종 수정 2] 'import.meta.env' 대신 'vite.config.ts'가 주입해주는 전역 변수를 사용합니다.
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
// (이전과 동일 - PO님의 Figma 코드 로직)

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
    await supabase.
