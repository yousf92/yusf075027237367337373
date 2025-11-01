import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile, Tab } from '../types.ts';
import { db } from '../services/firebase.ts';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getPlural, getTimeDifference } from '../utils/time.ts';

import { SettingsIcon, ChatIcon, BellIcon, UserIcon as ProfileIcon, CounterIcon, LeaderboardIcon, MedalIcon } from './ui/Icons.tsx';
import EmergencyButton from './home/EmergencyButton.tsx';
import IntenseUrgeButton from './home/IntenseUrgeButton.tsx';
import FaithDoseButton from './home/FaithDoseButton.tsx';
import CommitmentDocument from './home/CommitmentDocument.tsx';
import ProgressBar from './ui/ProgressBar.tsx';

interface HomeProps {
  user: User;
  userProfile: UserProfile;
  setActiveTab: (tab: Tab) => void;
  setShowNotifications: (show: boolean) => void;
  setShowChat: (show: boolean) => void;
  setShowLeaderboard: (show: boolean) => void;
  setShowBadges: (show: boolean) => void;
  hasUnreadPrivateMessages: boolean;
}

const Home: React.FC<HomeProps> = ({
  user,
  setActiveTab,
  setShowNotifications,
  setShowChat,
  setShowLeaderboard,
  setShowBadges,
  hasUnreadPrivateMessages,
  userProfile
}) => {
    const startDate = userProfile.startDate?.toDate();
    const [globalCounterImage, setGlobalCounterImage] = useState<string | null>(null);
    const [now, setNow] = useState(() => new Date());
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const configDocRef = doc(db, "app_config", "global_settings");
        const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().counterImage) {
                setGlobalCounterImage(docSnap.data().counterImage);
            } else {
                setGlobalCounterImage(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let frameId: number;
        const tick = () => {
            setNow(new Date());
            frameId = requestAnimationFrame(tick);
        };
        if (startDate) {
            frameId = requestAnimationFrame(tick);
            animationFrameId.current = frameId;
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [startDate]);

    const handleStartCounter = () => {
        const nowTimestamp = new Date();
        setDoc(doc(db, "users", user.uid), { startDate: nowTimestamp }, { merge: true });
    };

    const diff = startDate ? getTimeDifference(startDate, now) : { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
    const today = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const containerStyle = globalCounterImage ? { backgroundImage: `url(${globalCounterImage})` } : {};
    const containerClasses = `w-full max-w-sm mx-auto p-4 rounded-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${globalCounterImage ? "bg-cover bg-center" : "bg-gradient-to-br from-teal-500/30 to-sky-600/30 backdrop-blur-sm"}`;


    if (!startDate) {
      return (
          <div className="text-white">
            <header className="flex justify-between items-center w-full pt-4">
                <div>
                    <h1 className="text-xl font-bold text-shadow">مرحباً، {user.displayName || 'زائر'}</h1>
                    <p className="text-sm text-sky-300">{today}</p>
                </div>
                 <div className="flex items-center gap-1">
                    <button onClick={() => setShowBadges(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><MedalIcon className="w-6 h-6" /></button>
                    <button onClick={() => setShowLeaderboard(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><LeaderboardIcon className="w-6 h-6" /></button>
                    <button onClick={() => setShowNotifications(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><BellIcon className="w-6 h-6" /></button>
                    <button onClick={() => setShowChat(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChatIcon className="w-6 h-6" />
                        {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className="p-2 rounded-full hover:bg-white/10 transition-colors"><ProfileIcon className="w-6 h-6" /></button>
                </div>
            </header>
            <main className="pt-8">
              <div style={containerStyle} className={containerClasses}>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <CounterIcon className="w-36 h-36 text-white/10" />
                  </div>
                  <div className="relative z-10">
                      <div className="space-y-3">
                          <div className="flex items-center justify-end pl-2">
                              <button onClick={() => setActiveTab('counter-settings')} className="p-2 rounded-full hover:bg-white/10"><SettingsIcon className="w-6 h-6 text-white" /></button>
                          </div>
                          <ProgressBar label={`0 ${getPlural(0, 'month')}`} progress={0} colorClass="bg-orange-500" />
                          <ProgressBar label={`0 ${getPlural(0, 'day')}`} progress={0} colorClass="bg-lime-500" />
                          <ProgressBar label={`0 ${getPlural(0, 'hour')}`} progress={0} colorClass="bg-blue-500" />
                          <ProgressBar label={`0 ${getPlural(0, 'minute')}`} progress={0} colorClass="bg-pink-500" />
                          <ProgressBar label={`0 ${getPlural(0, 'second')}`} progress={0} colorClass="bg-yellow-500" />
                      </div>
                  </div>
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                <EmergencyButton user={user} userProfile={userProfile} />
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                <IntenseUrgeButton user={user} userProfile={userProfile} />
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                <FaithDoseButton user={user} userProfile={userProfile} />
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                  <CommitmentDocument user={user} initialText={userProfile?.commitmentDocument}/>
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                <button
                    onClick={handleStartCounter}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                >
                    هل تريد بدء حساب الأيام؟
                </button>
              </div>
            </main>
          </div>
      );
    }
    
    return (
        <div className="text-white">
            <header className="flex justify-between items-center w-full pt-4">
                 <div>
                    <h1 className="text-xl font-bold text-shadow">مرحباً، {user.displayName || 'زائر'}</h1>
                    <p className="text-sm text-sky-300">{today}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowBadges(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><MedalIcon className="w-6 h-6" /></button>
                    <button onClick={() => setShowLeaderboard(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><LeaderboardIcon className="w-6 h-6" /></button>
                    <button onClick={() => setShowNotifications(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><BellIcon className="w-6 h-6" /></button>
                     <button onClick={() => setShowChat(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChatIcon className="w-6 h-6" />
                        {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className="p-2 rounded-full hover:bg-white/10 transition-colors"><ProfileIcon className="w-6 h-6" /></button>
                </div>
            </header>
            <main className="pt-8">
                <div style={containerStyle} className={containerClasses}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <CounterIcon className="w-36 h-36 text-white/10" />
                    </div>
                    <div className="relative z-10">
                        <div className="space-y-3">
                            <div className="flex items-center justify-end pl-2">
                               <button onClick={() => setActiveTab('counter-settings')} className="p-2 rounded-full hover:bg-white/10"><SettingsIcon className="w-6 h-6 text-white" /></button>
                            </div>
                            <ProgressBar label={`${diff.months} ${getPlural(diff.months, 'month')}`} progress={((diff.months % 12) / 12) * 100} colorClass="bg-orange-500" />
                            <ProgressBar label={`${diff.days} ${getPlural(diff.days, 'day')}`} progress={(diff.days / 30) * 100} colorClass="bg-lime-500" />
                            <ProgressBar label={`${diff.hours} ${getPlural(diff.hours, 'hour')}`} progress={(diff.hours / 24) * 100} colorClass="bg-blue-500" />
                            <ProgressBar label={`${diff.minutes} ${getPlural(diff.minutes, 'minute')}`} progress={(diff.minutes / 60) * 100} colorClass="bg-pink-500" />
                            <ProgressBar label={`${diff.seconds} ${getPlural(diff.seconds, 'second')}`} progress={(diff.seconds / 60) * 100} colorClass="bg-yellow-500" />
                        </div>
                    </div>
                </div>
                 <div className="mt-8 max-w-sm mx-auto">
                    <EmergencyButton user={user} userProfile={userProfile} />
                </div>
                <div className="mt-8 max-w-sm mx-auto">
                    <IntenseUrgeButton user={user} userProfile={userProfile} />
                </div>
                <div className="mt-8 max-w-sm mx-auto">
                    <FaithDoseButton user={user} userProfile={userProfile} />
                </div>
                <div className="mt-8 max-w-sm mx-auto">
                    <CommitmentDocument user={user} initialText={userProfile?.commitmentDocument}/>
                </div>
            </main>
        </div>
    );
};

export default Home;