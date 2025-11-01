import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../../services/firebase.ts';
import { doc, setDoc } from 'firebase/firestore';
import { BookIcon, CloseIcon, EditIcon, StampIcon } from '../ui/Icons.tsx';

const CommitmentDocument: React.FC<{ user: User, initialText?: string }> = ({ user, initialText }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(initialText || "");
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState("");
    const hasBeenSaved = useRef(!!initialText);

    useEffect(() => {
        setText(initialText || "");
        hasBeenSaved.current = !!initialText;
    }, [initialText]);
    
    useEffect(() => {
        if (isOpen && !hasBeenSaved.current) {
            setIsEditing(true);
        }
    }, [isOpen]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
        setIsOpen(false);
        setIsEditing(false);
        setText(initialText || ""); // Revert changes if not saved
        setFeedback("");
    };
    const handleEdit = () => {
        setIsEditing(true);
        setFeedback("");
    };
    
    const handleSave = async () => {
        setIsLoading(true);
        setFeedback("");
        try {
            await setDoc(doc(db, 'users', user.uid), { commitmentDocument: text }, { merge: true });
            setFeedback("تم الحفظ بنجاح!");
            hasBeenSaved.current = true;
            setIsEditing(false);
            setTimeout(() => setFeedback(""), 3000);
        } catch (error) {
            console.error("Error saving commitment document:", error);
            setFeedback("حدث خطأ أثناء الحفظ.");
            setTimeout(() => setFeedback(""), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button onClick={handleOpen} className="w-full flex items-center justify-center text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-slate-500 to-slate-700 hover:from-slate-400 hover:to-slate-600 hover:shadow-xl hover:shadow-slate-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-slate-400">
                <span>✍️ وثيقة الالتزام 📜</span>
            </button>
            {isOpen && (
                 <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 text-white">
                    <div className="w-full max-w-md h-full flex flex-col">
                        <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                            <h2 className="text-xl font-bold text-sky-200 text-shadow">وثيقة الالتزام</h2>
                            <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>
                        <main className="flex-grow overflow-y-auto p-6 space-y-4">
                            {isEditing ? (
                                <>
                                    <p className="text-sm text-sky-200">اكتب هنا حالتك ومشاعرك الآن... لماذا تريد أن تترك؟ ما هو شعورك السيء؟ اجعلها رسالة لنفسك في المستقبل كلما فكرت في العودة.</p>
                                    <textarea
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="أنا ألتزم بترك هذا الفعل لأن..."
                                        className="w-full h-64 bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition resize-none"
                                    />
                                </>
                            ) : (
                                <div className="bg-gradient-to-br from-[#fdf6e3] to-[#f7f0d8] text-[#5a4635] p-6 rounded-lg shadow-2xl border-4 border-double border-[#d4b996] relative min-h-[20rem] flex flex-col justify-between">
                                    <div className="text-center">
                                        <h3 className="text-4xl font-bold text-[#8c7862] tracking-wide">وثيقة الالتزام</h3>
                                        <div className="w-2/3 h-px bg-[#d4b996] mx-auto my-4"></div>
                                    </div>
                                    <p className="text-lg whitespace-pre-wrap break-words leading-loose text-center my-4 flex-grow">{text}</p>
                                    <div className="mt-auto pt-4 text-center">
                                        <p className="text-2xl font-bold tracking-wider">{user.displayName}</p>
                                        <div className="w-1/2 h-px bg-[#d4b996] mx-auto mt-1"></div>
                                        <p className="text-sm text-[#8c7862]">التوقيع</p>
                                    </div>
                                    <div className="absolute bottom-4 left-4">
                                      <StampIcon className="w-16 h-16 text-[#b93c3c]" />
                                    </div>
                                </div>
                            )}
                             {feedback && <p className={`text-center text-sm ${feedback.includes('خطأ') ? 'text-red-400' : 'text-green-300'}`}>{feedback}</p>}
                        </main>
                        <footer className="w-full flex flex-col gap-4 p-4 flex-shrink-0">
                            {isEditing ? (
                                <div className="flex gap-4">
                                     {hasBeenSaved.current &&
                                        <button onClick={() => setIsEditing(false)} className="w-1/2 px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                                            إلغاء
                                        </button>
                                     }
                                    <button onClick={handleSave} disabled={isLoading} className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isLoading ? "جارِ الحفظ..." : "حفظ الوثيقة"}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleEdit} className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 hover:shadow-xl hover:shadow-yellow-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-yellow-400">
                                    <EditIcon className="w-6 h-6" />
                                    <span>تعديل الوثيقة</span>
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default CommitmentDocument;