import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import type { Habit } from '../../types.ts';
import { PlusIcon, ChartBarIcon } from '../ui/Icons.tsx';
import AddHabitModal from './AddHabitModal.tsx';
import HabitItem from './HabitItem.tsx';
import HabitStatsModal from './HabitStatsModal.tsx';

const HabitsScreen: React.FC<{ user: User }> = ({ user }) => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'users', user.uid, 'habits'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
            setHabits(fetchedHabits);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching habits:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const confirmDeleteHabit = async () => {
        if (habitToDelete) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'habits', habitToDelete.id));
            } catch (error) {
                console.error("Error deleting habit:", error);
            } finally {
                setHabitToDelete(null);
            }
        }
    };

    return (
        <div className="text-white">
            <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-10 flex justify-between items-center p-4 bg-sky-950/80 backdrop-blur-sm">
                <div className="w-10"></div> {/* Spacer to center the title */}
                <h1 className="text-2xl font-bold text-white text-shadow text-center">العادات</h1>
                <button 
                    onClick={() => setShowStatsModal(true)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="إحصائيات العادات"
                >
                    <ChartBarIcon className="w-7 h-7 text-sky-300" />
                </button>
            </header>

            <main className="space-y-4 p-4 pt-20">
                {loading ? (
                    <p className="text-center text-sky-300 py-10">جارِ تحميل العادات...</p>
                ) : habits.length > 0 ? (
                    habits.map(habit => (
                        <HabitItem 
                            key={habit.id} 
                            habit={habit} 
                            user={user} 
                            onDelete={() => setHabitToDelete(habit)}
                        />
                    ))
                ) : (
                    <div className="text-center py-16 px-4">
                        <h3 className="mt-4 text-xl font-semibold text-sky-300">لم تقم بإضافة أي عادات بعد</h3>
                        <p className="mt-2 text-sky-400">ابدأ ببناء عادات إيجابية بالضغط على زر الإضافة.</p>
                    </div>
                )}
            </main>
            
            {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} user={user} />}
            {showStatsModal && <HabitStatsModal onClose={() => setShowStatsModal(false)} habits={habits} />}
            
            {habitToDelete && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
                        <h3 className="text-xl font-bold text-red-400 text-center">تأكيد الحذف</h3>
                        <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف عادة "{habitToDelete.name}"؟</p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={() => setHabitToDelete(null)} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">إلغاء</button>
                            <button onClick={confirmDeleteHabit} className="px-6 py-2 font-semibold text-white rounded-md bg-red-600 hover:bg-red-500">حذف</button>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setShowAddModal(true)} 
                className="fixed z-40 left-6 bottom-20 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950/50 focus:ring-teal-400" 
                aria-label="إضافة عادة جديدة"
            >
                <PlusIcon className="w-8 h-8" />
            </button>
        </div>
    );
};

export default HabitsScreen;