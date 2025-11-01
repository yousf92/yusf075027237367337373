import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import type { UserProfile } from '../../types.ts';
import { ErrorAlert } from '../ui/Alert';
import { urgeContent } from '../../services/urge_content.ts';

interface IntenseUrgeButtonProps {
    user: User;
    userProfile: UserProfile;
}

const IntenseUrgeButton: React.FC<IntenseUrgeButtonProps> = ({ user, userProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isThrottled, setIsThrottled] = useState(false);

    const getNewSolution = async () => {
        setIsLoading(true);
        setError('');
        setResponse('');
        
        try {
            if (urgeContent.length === 0) {
                setResponse("لا يوجد محتوى متوفر حالياً.");
                return;
            }

            const currentIndex = userProfile.urgeIndex || 0;
            let contentToShow = urgeContent[currentIndex % urgeContent.length];
            
            if(contentToShow.trim() === 'لا يوجد محتوى') {
                contentToShow = "لا يوجد محتوى هنا بعد. الرجاء إضافة نص.";
            }
            
            setResponse(contentToShow);
            
            const nextIndex = currentIndex + 1;
            await updateDoc(doc(db, "users", user.uid), { urgeIndex: nextIndex });
        } catch (e) {
            console.error("Error fetching solution or updating index:", e);
            setError("هەڵەیەک ڕوویدا لە وەرگرتنی چارەسەر.");
        } finally {
            setIsLoading(false);
        }
    };

    const getAnotherSolutionWithDelay = () => {
        if (isThrottled || isLoading) return;

        setIsThrottled(true);
        setIsLoading(true);
        setResponse('');

        setTimeout(() => {
            getNewSolution();
            setIsThrottled(false);
        }, 4000);
    };

    const handleOpen = () => {
        setIsOpen(true);
        getNewSolution();
    };

    const handleClose = () => {
        setIsOpen(false);
        setResponse('');
        setError('');
        setIsThrottled(false); // Reset throttle state on close
    };

    return (
        <>
            <button onClick={handleOpen} className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-indigo-500 to-purple-700 hover:from-indigo-400 hover:to-purple-600 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-purple-400">
                <span className="tracking-wider">💪 عندي رغبة شديدة، اعطني حلاً 💡</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 text-white text-center">
                    <div className="max-w-md w-full flex-grow flex flex-col items-center justify-start overflow-y-auto py-8 min-h-0">
                        {isLoading && <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>}
                        {error && <ErrorAlert message={error} />}
                        {!isLoading && response && <p className="text-xl font-semibold leading-relaxed text-shadow whitespace-pre-wrap">{response}</p>}
                    </div>
                    <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                        <button onClick={getAnotherSolutionWithDelay} disabled={isLoading || isThrottled} className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                            أبغى حل ثاني
                        </button>
                        <button onClick={handleClose} className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default IntenseUrgeButton;