import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import type { UserProfile } from '../../types.ts';
import { CloseIcon, LeaderboardIcon } from '../ui/Icons.tsx';
import { ADMIN_UIDS } from '../../constants.tsx';
import BadgesModal from './BadgesModal.tsx';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
}

interface LeaderboardEntry {
    user: UserProfile;
    days: number;
}

const getDayPlural = (days: number): string => {
    if (days === 0) return '٠ أيام';
    if (days === 1) return 'يوم واحد';
    if (days === 2) return 'يومان';
    if (days >= 3 && days <= 10) return `${days} أيام`;
    return `${days} يومًا`;
};

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingBadgesFor, setViewingBadgesFor] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef);
                const querySnapshot = await getDocs(q);

                const now = new Date().getTime();
                const leaderboardData = querySnapshot.docs
                    .map(docSnap => {
                        const user = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
                        let days = 0;
                        if (user.startDate) {
                            const startDate = user.startDate.toDate().getTime();
                            days = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
                        }
                        return { user, days };
                    })
                    .filter(entry => 
                        entry.user.email &&
                        entry.user.displayName && 
                        !entry.user.displayName.startsWith('زائر') &&
                        !ADMIN_UIDS.includes(entry.user.uid)
                    );
                
                leaderboardData.sort((a, b) => b.days - a.days);
                
                setLeaderboard(leaderboardData);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [isOpen]);


    if (!isOpen) return null;

    const getRankContent = (rank: number) => {
        if (rank === 1) return <span className="text-2xl">🥇</span>;
        if (rank === 2) return <span className="text-2xl">🥈</span>;
        if (rank === 3) return <span className="text-2xl">🥉</span>;
        return <span className="font-bold">{rank}</span>;
    };
    
    const currentUserIndex = leaderboard.findIndex(entry => entry.user.uid === currentUser.uid);
    const totalParticipants = leaderboard.length;


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="w-full h-full max-w-md bg-sky-950/90 text-white flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <LeaderboardIcon className="w-7 h-7 text-yellow-300" />
                        <h2 className="text-xl font-bold text-sky-200 text-shadow">لوحة الصدارة</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="flex-grow overflow-y-auto p-2">
                    {currentUser.isAnonymous && (
                        <div className="bg-yellow-900/50 text-yellow-200 p-3 rounded-lg text-center text-sm m-2">
                            ملاحظة: إذا كنت تريد أن يظهر اسمك في لوحة الصدارة، يرجى إنشاء حساب.
                        </div>
                    )}
                    {loading ? (
                        <p className="text-center text-sky-400 py-10">جارِ تحميل القائمة...</p>
                    ) : leaderboard.length > 0 ? (
                        <ul className="space-y-2">
                            {leaderboard.map(({ user, days }, index) => {
                                const isCurrentUser = user.uid === currentUser.uid;
                                const rank = index + 1;
                                return (
                                    <li 
                                        key={user.uid}
                                        className={`flex items-center gap-4 p-2 rounded-lg transition-colors ${isCurrentUser ? 'bg-sky-600 border-2 border-sky-300' : 'bg-sky-800/50'}`}
                                    >
                                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-lg">
                                            {getRankContent(rank)}
                                        </div>
                                        <button onClick={() => setViewingBadgesFor(user)} className="flex items-center gap-4 flex-grow overflow-hidden text-right">
                                            <img
                                                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || ' '}&background=0284c7&color=fff&size=128`}
                                                alt={user.displayName || 'User Avatar'}
                                                className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-sky-500/50"
                                            />
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-semibold truncate">{user.displayName || 'مستخدم'}</p>
                                            </div>
                                        </button>
                                        <div className="flex-shrink-0 font-bold text-lg text-yellow-300">
                                            {getDayPlural(days)}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center text-sky-400 py-10">لا يوجد مستخدمون في لوحة الصدارة بعد. ابدأ عدادك لتظهر هنا!</p>
                    )}
                </main>
                 {currentUserIndex !== -1 && totalParticipants > 0 && (
                    <footer className="p-3 border-t border-sky-400/30 flex-shrink-0 text-center bg-sky-900">
                        <p className="font-semibold text-sky-200">
                            أنت في المرتبة 
                            <span className="text-yellow-300 font-bold mx-1">{currentUserIndex + 1}</span> 
                            من أصل 
                            <span className="text-yellow-300 font-bold mx-1">{totalParticipants}</span>
                        </p>
                    </footer>
                )}
            </div>
            {viewingBadgesFor && (
                <BadgesModal
                    isOpen={!!viewingBadgesFor}
                    onClose={() => setViewingBadgesFor(null)}
                    userProfile={viewingBadgesFor}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default LeaderboardModal;