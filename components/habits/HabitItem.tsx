import React from 'react';
import type { User } from 'firebase/auth';
import type { Habit } from '../../types.ts';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import { TrashIcon } from '../ui/Icons.tsx';

interface HabitItemProps {
    habit: Habit;
    user: User;
    onDelete: () => void;
}

const getISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const HabitItem: React.FC<HabitItemProps> = ({ habit, user, onDelete }) => {
    
    const today = new Date();
    const todayKey = getISODate(today);
    
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - (6 - i));
        return date;
    });

    const handleToggleComplete = async (dateKey: string) => {
        const habitRef = doc(db, 'users', user.uid, 'habits', habit.id);
        const isCompleted = habit.logs?.[dateKey];
        const newLogValue = isCompleted ? deleteField() : true;

        try {
            await updateDoc(habitRef, {
                [`logs.${dateKey}`]: newLogValue
            });
        } catch (error) {
            console.error("Error updating habit log:", error);
        }
    };
    
    return (
        <article className="w-full bg-sky-900/40 rounded-lg p-4 border border-sky-700/50 space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">{habit.icon}</span>
                    <h3 className="text-lg font-semibold text-sky-200">{habit.name}</h3>
                </div>
                <button 
                    onClick={onDelete} 
                    className="p-2 text-red-500 hover:text-red-300 hover:bg-white/10 rounded-full transition-colors"
                    aria-label={`حذف عادة ${habit.name}`}
                >
                    <TrashIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <div className="flex justify-around items-center bg-black/30 p-2 rounded-md">
                {weekDays.map((date, index) => {
                    const dateKey = getISODate(date);
                    const isCompleted = habit.logs?.[dateKey];
                    const isToday = dateKey === todayKey;

                    return (
                        <div key={index} className="flex flex-col items-center gap-1">
                            <span className={`text-xs ${isToday ? 'text-sky-300 font-bold' : 'text-sky-500'}`}>
                                {date.toLocaleDateString('ar-EG', { weekday: 'short' })}
                            </span>
                            <button
                                onClick={() => isToday && handleToggleComplete(dateKey)}
                                disabled={!isToday}
                                className={`w-6 h-6 rounded-full border-2 transition-colors duration-200 focus:outline-none ${
                                    isCompleted 
                                        ? 'bg-teal-500 border-teal-300'
                                        : 'bg-transparent border-sky-600'
                                } ${
                                    isToday 
                                        ? 'cursor-pointer hover:border-sky-300 ring-offset-sky-950/50 focus:ring-2 focus:ring-sky-400'
                                        : 'cursor-not-allowed'
                                }`}
                                aria-label={`Mark habit as ${isCompleted ? 'incomplete' : 'complete'} for ${date.toLocaleDateString()}`}
                            />
                        </div>
                    );
                })}
            </div>
        </article>
    );
};

export default HabitItem;