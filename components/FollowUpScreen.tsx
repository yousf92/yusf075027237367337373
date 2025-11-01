import React, { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import type { FollowUpLog, FollowUpStatus, UserProfile } from '../types.ts';
import { Spinner, PlusIcon } from './ui/Icons.tsx';

// Helper to get local ISO date string (YYYY-MM-DD)
const getISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const STATUS_CONFIG: { [key in FollowUpStatus]: { label: string; color: string; textColor: string; borderColor: string; emoji: string; } } = {
    relapse: { label: 'انتكاسة', color: 'bg-red-500/80', textColor: 'text-red-300', borderColor: 'border-red-500', emoji: '💔' },
    slip_up: { label: 'زلة', color: 'bg-orange-500/80', textColor: 'text-orange-300', borderColor: 'border-orange-500', emoji: '🚶‍♂️' },
    success: { label: 'نجاح', color: 'bg-green-500/80', textColor: 'text-green-300', borderColor: 'border-green-500', emoji: '✅' },
    absent: { label: 'غائب', color: 'bg-yellow-500/80', textColor: 'text-yellow-300', borderColor: 'border-yellow-500', emoji: '❔' },
};

const SlipUpWarningModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-yellow-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-yellow-400 text-center">تنبيه</h3>
            <p className="text-sky-200 text-center">
                انتبه، إذا تعرضت لزلة أخرى، سيتم تصفير عدادك وأوسمتك.
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">الغاء</button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md bg-yellow-600 hover:bg-yellow-500">متابعة</button>
            </div>
        </div>
    </div>
);

const SlipUpConfirmModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد الزلة</h3>
            <p className="text-sky-200 text-center">
                هل أنت متأكد من المتابعة؟ سيؤدي هذا إلى تصفير عدادك وأوسمتك.
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">الغاء</button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md bg-red-600 hover:bg-red-500">نعم، أؤكد</button>
            </div>
        </div>
    </div>
);

interface FollowUpScreenProps {
    user: User;
    userProfile: UserProfile;
}

const FollowUpScreen: React.FC<FollowUpScreenProps> = ({ user, userProfile }) => {
    const [logs, setLogs] = useState<{ [key: string]: FollowUpLog }>({});
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showLogModal, setShowLogModal] = useState(false);
    const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);
    const [showSlipUpWarning, setShowSlipUpWarning] = useState(false);
    const [showSlipUpConfirm, setShowSlipUpConfirm] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'users', user.uid, 'followUpLogs'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: { [key: string]: FollowUpLog } = {};
            snapshot.forEach(doc => {
                fetchedLogs[doc.id] = doc.data() as FollowUpLog;
            });
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching follow-up logs:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const sessionStats = useMemo(() => {
        const counts: { [key in FollowUpStatus]: number } = { relapse: 0, slip_up: 0, success: 0, absent: 0 };
        const startDate = userProfile?.startDate?.toDate();
        if (startDate) {
            startDate.setHours(0, 0, 0, 0); 
        }

        Object.keys(logs).forEach((dateStr) => {
            const log = logs[dateStr];
            const logDate = new Date(`${dateStr}T12:00:00Z`);
            if (!startDate || logDate >= startDate) {
                if (log.status in counts) {
                    counts[log.status]++;
                }
            }
        });

        return counts;
    }, [logs, userProfile?.startDate]);
    
    const totalStats = useMemo(() => {
        const totalCounts: { [key in FollowUpStatus]: number } = { relapse: 0, slip_up: 0, success: 0, absent: 0 };
        const logKeys = Object.keys(logs);

        if (logKeys.length === 0) {
            return totalCounts;
        }

        // Replaced Object.values().forEach() with Object.keys().forEach() to ensure robust iteration
        // over the properties of the logs object and prevent potential issues with complex object structures.
        logKeys.forEach(key => {
            const log = logs[key];
            if (log && log.status && log.status in totalCounts) {
                totalCounts[log.status]++;
            }
        });

        const sortedKeys = logKeys.sort();
        const firstLogDateStr = sortedKeys[0];
        const [y, m, d] = firstLogDateStr.split('-').map(Number);
        const firstLogDate = new Date(y, m - 1, d);
        
        let currentDateIter = new Date(firstLogDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        while (currentDateIter < today) {
            const dateKey = getISODate(currentDateIter);
            if (!logs[dateKey]) {
                totalCounts.absent++;
            }
            currentDateIter.setDate(currentDateIter.getDate() + 1);
        }

        return totalCounts;
    }, [logs]);


    const handleLogStatus = async (status: FollowUpStatus) => {
        setShowLogModal(false);

        if (status === 'relapse') {
            setShowRelapseConfirm(true);
            return;
        }
        
        if (status === 'slip_up') {
            if (sessionStats.slip_up > 0) {
                setShowSlipUpConfirm(true);
            } else {
                setShowSlipUpWarning(true);
            }
            return;
        }

        const todayKey = getISODate(new Date());
        const logRef = doc(db, 'users', user.uid, 'followUpLogs', todayKey);
        try {
            await setDoc(logRef, {
                status,
                timestamp: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error logging status:", error);
        }
    };
    
    const handleConfirmRelapse = async () => {
        setShowRelapseConfirm(false);
        try {
            const todayKey = getISODate(new Date());
            const logRef = doc(db, 'users', user.uid, 'followUpLogs', todayKey);
            await setDoc(logRef, { status: 'relapse', timestamp: serverTimestamp() }, { merge: true });

            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { startDate: new Date() }, { merge: true });

            for (const key in localStorage) {
                if (key.startsWith(`celebrated_${user.uid}_`)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.error("Error confirming relapse:", error);
        }
    };
    
    const handleFirstSlipUp = async () => {
        setShowSlipUpWarning(false);
        const todayKey = getISODate(new Date());
        const logRef = doc(db, 'users', user.uid, 'followUpLogs', todayKey);
        try {
            await setDoc(logRef, {
                status: 'slip_up',
                timestamp: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error logging first slip-up:", error);
        }
    };

    const handleConfirmSlipUpReset = async () => {
        setShowSlipUpConfirm(false);
        try {
            const todayKey = getISODate(new Date());
            const logRef = doc(db, 'users', user.uid, 'followUpLogs', todayKey);
            await setDoc(logRef, { status: 'slip_up', timestamp: serverTimestamp() }, { merge: true });

            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { startDate: new Date() }, { merge: true });

            for (const key in localStorage) {
                if (key.startsWith(`celebrated_${user.uid}_`)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.error("Error confirming slip-up reset:", error);
        }
    };

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); 
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days: (Date | null)[] = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null); 
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    return (
        <div className="text-white pb-24">
            <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-10 flex justify-center items-center p-4 bg-sky-950/80 backdrop-blur-sm">
                <h1 className="text-2xl font-bold text-white text-shadow">المتابعة</h1>
            </header>
            
            <main className="space-y-6 pt-20 px-4">
                <section className="p-4 bg-sky-900/30 rounded-lg space-y-3">
                    <h2 className="text-lg font-semibold text-sky-200">ملخص المتابعة (الإجمالي)</h2>
                    {loading ? <Spinner className="w-8 h-8 mx-auto text-sky-400" /> : (
                        <div className="flex flex-col gap-3">
                            {(Object.keys(STATUS_CONFIG) as FollowUpStatus[]).map(status => {
                                const config = STATUS_CONFIG[status];
                                return (
                                    <div key={status} className={`p-3 rounded-lg flex justify-between items-center bg-sky-900/50 border-r-4 ${config.borderColor}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{config.emoji}</span>
                                            <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
                                        </div>
                                        <span className="font-bold text-xl text-white">{totalStats[status]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="p-4 bg-sky-900/50 backdrop-blur-sm border border-sky-400/20 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/10 text-xl font-bold">‹</button>
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg font-semibold text-sky-200">{currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</h2>
                             <button onClick={() => setCurrentDate(new Date())} className="text-xs font-semibold text-sky-300 hover:text-white hover:underline">
                                العودة لليوم
                            </button>
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/10 text-xl font-bold">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-sky-300 mb-2">
                        {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, index) => {
                            if (!day) return <div key={`empty-${index}`} />;
                            
                            const todayKey = getISODate(new Date());
                            const dateKey = getISODate(day);
                            const log = logs[dateKey];
                            const isToday = dateKey === todayKey;
                            const isPast = dateKey < todayKey;

                            let dayClasses = "h-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200";

                            if (isToday) {
                                dayClasses += " ring-2 ring-sky-300 ring-offset-2 ring-offset-sky-950/80 bg-sky-700/80";
                            }

                            if (log) {
                                dayClasses += ` ${STATUS_CONFIG[log.status].color}`;
                            } else if (isPast) {
                                dayClasses += ` ${STATUS_CONFIG.absent.color}`;
                            } else if (!isToday) {
                                dayClasses += " bg-black/20";
                            }

                            return (
                                <div key={dateKey} className={dayClasses}>
                                    {day.getDate()}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            {showLogModal && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 transition-opacity" 
                    onClick={() => setShowLogModal(false)}
                >
                    <div 
                        className="w-full max-w-md bg-sky-950/90 border-t-2 border-sky-500/50 rounded-t-2xl p-6 space-y-4" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-semibold text-sky-200 text-center mb-4">كيف كان يومك اليوم؟</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {(Object.keys(STATUS_CONFIG) as FollowUpStatus[])
                                .filter(status => status !== 'absent')
                                .map(status => {
                                    const config = STATUS_CONFIG[status];
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => handleLogStatus(status)}
                                            className={`p-4 rounded-lg text-center font-bold transition-all duration-200 border-2 border-transparent ${config.color.replace('/80', '/40')} hover:${config.color.replace('/80', '/60')}`}
                                        >
                                            {config.label}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
            
            {showRelapseConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-yellow-500/50 rounded-lg p-6 space-y-4 text-white">
                        <h3 className="text-xl font-bold text-yellow-400 text-center">تأكيد الانتكاسة</h3>
                        <p className="text-sky-200 text-center">
                            هل أنت متأكد؟ سيؤدي هذا إلى تصفير عداد الأيام الخاص بك وبدء العد من جديد.
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={() => setShowRelapseConfirm(false)} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">إلغاء</button>
                            <button onClick={handleConfirmRelapse} className="px-6 py-2 font-semibold text-white rounded-md bg-yellow-600 hover:bg-yellow-500">نعم، أؤكد</button>
                        </div>
                    </div>
                </div>
            )}

            {showSlipUpWarning && <SlipUpWarningModal onConfirm={handleFirstSlipUp} onClose={() => setShowSlipUpWarning(false)} />}
            {showSlipUpConfirm && <SlipUpConfirmModal onConfirm={handleConfirmSlipUpReset} onClose={() => setShowSlipUpConfirm(false)} />}

            <button
                onClick={() => setShowLogModal(true)}
                className="fixed z-40 left-6 bottom-20 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950/50 focus:ring-teal-400"
                aria-label="تسجيل حالة اليوم"
            >
                <PlusIcon className="w-8 h-8" />
            </button>
        </div>
    );
};

export default FollowUpScreen;