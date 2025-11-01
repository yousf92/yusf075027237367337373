import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile, Tab, AlertContent, Badge } from '../types.ts';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { BADGES } from '../services/badges.ts';

import Home from './Home.tsx';
import Journal from './Journal.tsx';
import Settings from './Settings.tsx';
import Chat from './Chat.tsx';
import CounterSettings from './CounterSettings.tsx';
import NotificationsModal from './modals/NotificationsModal.tsx';
import LeaderboardModal from './modals/LeaderboardModal.tsx';
import BadgesModal from './modals/BadgesModal.tsx';
import BadgeCelebrationModal from './modals/BadgeCelebrationModal.tsx';
import HabitsScreen from './habits/HabitsScreen.tsx';
import FollowUpScreen from './FollowUpScreen.tsx';
import Library from './Library.tsx';
import { HomeIcon, BookIcon, SettingsIcon, HabitsIcon, FollowUpIcon, LibraryIcon } from './ui/Icons.tsx';
import { ADMIN_UIDS } from '../constants.tsx';

interface MainScreenProps {
  user: User;
  userProfile: UserProfile;
  handleSignOut: () => void;
  setAppLocked: (locked: boolean) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  hasNotification?: boolean;
}> = ({ label, icon: Icon, isActive, onClick, hasNotification }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center space-y-1 w-full text-sm transition-colors duration-200 relative ${isActive ? "text-sky-300" : "text-sky-500 hover:text-sky-300"}`}
    aria-current={isActive ? "page" : undefined}
  >
    <Icon className="w-7 h-7" />
    <span>{label}</span>
    {hasNotification && <span className="absolute top-1 right-1/2 translate-x-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
  </button>
);


const MainScreen: React.FC<MainScreenProps> = ({ user, userProfile, handleSignOut, setAppLocked }) => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [badgeToCelebrate, setBadgeToCelebrate] = useState<Badge | null>(null);
  const [hasUnreadPrivateMessages, setHasUnreadPrivateMessages] = useState(false);
  const [alert, setAlert] = useState<AlertContent | null>(null);

  const isDeveloper = ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'conversations'), where('hasUnread', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setHasUnreadPrivateMessages(!snapshot.empty);
      });
      return () => unsubscribe();
    }
  }, [user]);
  
  useEffect(() => {
      if (!userProfile?.startDate) return;

      const startDate = userProfile.startDate.toDate();
      const now = new Date();
      const userDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const latestUncelebratedBadge = BADGES
        .slice()
        .reverse()
        .find(badge => {
            const isUnlocked = userDays >= badge.days;
            const hasBeenCelebrated = localStorage.getItem(`celebrated_${user.uid}_${badge.days}`) === 'true';
            return isUnlocked && !hasBeenCelebrated;
        });

      if (latestUncelebratedBadge) {
          // Set the badge to be celebrated
          setBadgeToCelebrate(latestUncelebratedBadge);
          
          // Mark this badge and all previous (lower-tier) ones as celebrated
          // to prevent them from showing up on subsequent app loads.
          BADGES.forEach(badge => {
              if (badge.days <= latestUncelebratedBadge.days) {
                  localStorage.setItem(`celebrated_${user.uid}_${badge.days}`, 'true');
              }
          });
      }
  }, [userProfile, user.uid]);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home user={user} userProfile={userProfile} setActiveTab={setActiveTab} setShowNotifications={setShowNotifications} setShowChat={setShowChat} setShowLeaderboard={setShowLeaderboard} setShowBadges={setShowBadges} hasUnreadPrivateMessages={hasUnreadPrivateMessages}/>;
      case 'journal':
        return <Journal user={user} />;
      case 'habits':
        return <HabitsScreen user={user} />;
      case 'follow-up':
        return <FollowUpScreen user={user} userProfile={userProfile} />;
      case 'library':
        return <Library user={user} isDeveloper={isDeveloper} />;
      case 'settings':
        return <Settings user={user} userProfile={userProfile} handleSignOut={handleSignOut} setAppLocked={setAppLocked} showAlert={showAlert} isDeveloper={isDeveloper}/>;
      case 'counter-settings':
        return <CounterSettings user={user} userProfile={userProfile} setActiveTab={setActiveTab} isDeveloper={isDeveloper}/>
      default:
        return <Home user={user} userProfile={userProfile} setActiveTab={setActiveTab} setShowNotifications={setShowNotifications} setShowChat={setShowChat} setShowLeaderboard={setShowLeaderboard} setShowBadges={setShowBadges} hasUnreadPrivateMessages={hasUnreadPrivateMessages}/>;
    }
  };

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: HomeIcon },
    { id: 'journal', label: 'اليوميات', icon: BookIcon },
    { id: 'habits', label: 'العادات', icon: HabitsIcon },
    { id: 'follow-up', label: 'المتابعة', icon: FollowUpIcon },
    { id: 'library', label: 'المكتبة', icon: LibraryIcon },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  return (
    <div className="w-full max-w-sm text-white flex flex-col h-screen">
      <div className="flex-grow overflow-y-auto pb-16">
        {renderContent()}
      </div>
      
      {alert && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
            <p className={`text-center p-3 rounded-lg text-sm ${alert.type === 'success' ? 'text-green-300 bg-green-900/50' : 'text-red-400 bg-red-900/50'}`}>
                {alert.message}
            </p>
        </div>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-sky-950/90 backdrop-blur-sm border-t border-sky-400/20 flex-shrink-0">
        <div className="flex justify-around items-center h-16">
          {navItems.map(item => (
            <NavItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              isActive={activeTab === item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              hasNotification={item.id === 'home' && hasUnreadPrivateMessages}
            />
          ))}
        </div>
      </nav>

      <Chat isOpen={showChat} onClose={() => setShowChat(false)} user={user} currentUserProfile={userProfile} showAlert={showAlert} isDeveloper={isDeveloper}/>
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} isDeveloper={isDeveloper} />
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} currentUser={user}/>
      <BadgesModal isOpen={showBadges} onClose={() => setShowBadges(false)} userProfile={userProfile} currentUser={user}/>
      {badgeToCelebrate && (
        <BadgeCelebrationModal 
            isOpen={!!badgeToCelebrate} 
            onClose={() => setBadgeToCelebrate(null)} 
            badge={badgeToCelebrate} 
        />
      )}
    </div>
  );
};

export default MainScreen;