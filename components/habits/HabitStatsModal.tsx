import React from 'react';
import type { Habit } from '../../types.ts';
import { CloseIcon, ChartBarIcon } from '../ui/Icons.tsx';

interface HabitStatsModalProps {
    onClose: () => void;
    habits: Habit[];
}

const HabitStatsModal: React.FC<HabitStatsModalProps> = ({ onClose, habits }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysPassed = today.getDate();

    const stats = habits.map(habit => {
        const logs = habit.logs || {};
        const monthCompletions = Object.keys(logs).filter(dateStr => {
            // Add a time to handle timezone offsets correctly
            const logDate = new Date(`${dateStr}T12:00:00.000Z`);
            return logDate.getUTCMonth() === currentMonth && logDate.getUTCFullYear() === currentYear;
        }).length;

        return {
            id: habit.id,
            name: habit.name,
            icon: habit.icon,
            count: monthCompletions,
            percentage: daysPassed > 0 ? (monthCompletions / daysPassed) * 100 : 0,
        };
    }).sort((a, b) => b.count - a.count);

    const monthName = today.toLocaleString('ar-EG', { month: 'long' });

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-sky-950/90 border border-sky-500/50 rounded-lg flex flex-col h-[90vh]">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <ChartBarIcon className="w-7 h-7 text-sky-300" />
                        <h2 className="text-xl font-bold text-sky-200">إحصائيات شهر {monthName}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><CloseIcon className="w-6 h-6" /></button>
                </header>
                <main className="flex-grow p-4 overflow-y-auto space-y-4">
                    {habits.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-full text-center text-sky-400">
                            <ChartBarIcon className="w-24 h-24 text-sky-700 mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold text-sky-300">لا توجد بيانات لعرضها</h3>
                            <p className="mt-2">ابدأ بتتبع عاداتك لترى إحصائياتك هنا.</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-sky-900/50 p-4 rounded-lg">
                                <h3 className="font-bold text-lg text-teal-300 mb-2">ملخص الأداء</h3>
                                {stats.slice(0, 3).map(stat => (
                                     <p key={stat.id} className="text-sky-200 leading-relaxed">
                                        <span className="text-lg">{stat.icon}</span> {stat.name} - 
                                        <span className="font-bold text-white"> {stat.count} مرة</span>
                                     </p>
                                ))}
                            </div>
                            {stats.map(stat => (
                                <div key={stat.id} className="bg-sky-800/40 p-3 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{stat.icon}</span>
                                            <span className="font-semibold">{stat.name}</span>
                                        </div>
                                        <span className="text-sm text-sky-300 font-mono">{stat.count} / {daysPassed}</span>
                                    </div>
                                    <div className="w-full bg-black/40 rounded-full h-2.5">
                                        <div 
                                            className="bg-gradient-to-r from-teal-500 to-green-400 h-2.5 rounded-full transition-all duration-500" 
                                            style={{ width: `${stat.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HabitStatsModal;