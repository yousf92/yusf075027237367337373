import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import type { JournalEntry } from '../types.ts';
import { BookIcon, CloseIcon, PlusIcon, TrashIcon, EditIcon } from './ui/Icons.tsx';
import JournalEntryForm from './journal/JournalEntryForm.tsx';

const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "الآن";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    return months < 12 ? `قبل ${months} شهر` : `قبل ${Math.floor(months / 12)} سنة`;
};

const Journal: React.FC<{ user: User }> = ({ user }) => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<JournalEntry | null>(null);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'users', user.uid, 'journalEntries'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry));
            setEntries(fetchedEntries);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching journal entries:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleDelete = async () => {
        if (showDeleteConfirm) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'journalEntries', showDeleteConfirm.id));
                setShowDeleteConfirm(null);
                setSelectedEntry(null);
            } catch (error) {
                console.error("Error deleting entry:", error);
            }
        }
    };
    
    const handleCloseSelectedEntry = () => {
        setSelectedEntry(null);
        setShowOptionsMenu(false);
    };

    const handleAddClick = () => {
        setEntryToEdit(null);
        setShowForm(true);
    };

    const handleEditClick = (entry: JournalEntry) => {
        setSelectedEntry(null);
        setEntryToEdit(entry);
        setShowForm(true);
    };

    return (
        <div className="text-white pb-24">
            <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-10 flex justify-between items-center p-4 bg-sky-950/80 backdrop-blur-sm">
                <div className="w-10"></div> {/* Spacer */}
                <h1 className="text-2xl font-bold text-white text-shadow text-center">اليوميات</h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>
            <main className="space-y-4 p-4 pt-20">
                {loading ? (
                    <p className="text-center text-sky-300 py-10">جارِ تحميل اليوميات...</p>
                ) : entries.length > 0 ? (
                    entries.map(entry => (
                        <article key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-right bg-sky-900/30 rounded-lg hover:bg-sky-800/50 transition-all duration-300 hover:border-sky-600 border border-transparent cursor-pointer p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <p className="font-bold text-sky-200">{entry.timestamp ? entry.timestamp.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                                        <p className="text-xs text-sky-500">{entry.timestamp ? formatTimeAgo(entry.timestamp.toDate()) : ''}</p>
                                    </div>
                                    <span className="text-4xl">{entry.mood}</span>
                                </div>
                            </div>
                            <p className="text-sky-300 line-clamp-3 whitespace-pre-wrap break-words">{entry.text}</p>
                        </article>
                    ))
                ) : (
                    <div className="text-center py-16 px-4">
                        <BookIcon className="w-24 h-24 mx-auto text-sky-700" />
                        <h3 className="mt-4 text-xl font-semibold text-sky-300">لم تكتب شيئاً بعد</h3>
                        <p className="mt-2 text-sky-400">ابدأ بتدوين يومياتك بالضغط على زر الإضافة.</p>
                    </div>
                )}
            </main>

            {showForm && <JournalEntryForm onClose={() => setShowForm(false)} user={user} entryToEdit={entryToEdit} />}
            
            {selectedEntry && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md bg-gradient-to-br from-[#fdf6e3] to-[#f7f0d8] border-4 border-double border-[#d4b996] rounded-lg flex flex-col h-[90vh] shadow-2xl">
                        <header className="flex items-center justify-between p-4 border-b border-[#d4b996] flex-shrink-0">
                           <div className="flex items-center gap-3">
                               <span className="text-3xl">{selectedEntry.mood}</span>
                               <h2 className="text-xl font-bold text-[#8c7862]">{selectedEntry.timestamp.toDate().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                           </div>
                           <button onClick={handleCloseSelectedEntry} className="p-2 rounded-full hover:bg-black/10 transition-colors">
                                <CloseIcon className="w-6 h-6 text-[#5a4635]" />
                           </button>
                        </header>
                        <main className="flex-grow p-6 overflow-y-auto cursor-pointer" onClick={() => setShowOptionsMenu(true)}>
                            <p className="text-[#5a4635] whitespace-pre-wrap break-words leading-relaxed text-lg">{selectedEntry.text}</p>
                        </main>
                    </div>
                </div>
            )}
            
            {selectedEntry && showOptionsMenu && (
                 <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowOptionsMenu(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-sky-900 rounded-t-2xl p-2 max-w-md mx-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col pt-1">
                            <button onClick={() => { setShowOptionsMenu(false); handleEditClick(selectedEntry); }} className="flex items-center gap-4 p-3 text-right rounded-lg hover:bg-sky-800/50 transition-colors">
                              <EditIcon className="w-6 h-6 text-yellow-300" />
                              <span className="text-yellow-300">تعديل</span>
                            </button>
                            <button onClick={() => { setShowOptionsMenu(false); setShowDeleteConfirm(selectedEntry); }} className="flex items-center gap-4 p-3 text-right rounded-lg hover:bg-sky-800/50 transition-colors">
                              <TrashIcon className="w-6 h-6 text-red-400" />
                              <span className="text-red-400">حذف</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
                        <h3 className="text-xl font-bold text-red-400 text-center">تأكيد الحذف</h3>
                        <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذه اليومية؟</p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={() => setShowDeleteConfirm(null)} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">إلغاء</button>
                            <button onClick={handleDelete} className="px-6 py-2 font-semibold text-white rounded-md bg-red-600 hover:bg-red-500">حذف</button>
                        </div>
                    </div>
                </div>
            )}

            <button onClick={handleAddClick} className="fixed z-40 left-6 bottom-20 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950/50 focus:ring-teal-400" aria-label="إضافة يومية جديدة">
                <PlusIcon className="w-8 h-8" />
            </button>
        </div>
    );
};

export default Journal;