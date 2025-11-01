import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../services/firebase.ts';
import type { UserProfile } from '../types.ts';
import { ErrorAlert } from './ui/Alert.tsx';
import { CameraIcon, LogoutIcon, TrashIcon, ShieldCheckIcon } from './ui/Icons.tsx';
import SetPinModal from './modals/SetPinModal.tsx';
import BlockedUsers from './settings/BlockedUsers.tsx';
import { getErrorMessage } from '../constants.tsx';


declare const uploadcare: any;

interface SettingsProps {
    user: User;
    userProfile: UserProfile;
    handleSignOut: () => void;
    setAppLocked: (locked: boolean) => void;
    showAlert: (message: string, type: 'success' | 'error') => void;
    isDeveloper: boolean;
}

const Settings: React.FC<SettingsProps> = ({ user, userProfile, handleSignOut, setAppLocked, showAlert, isDeveloper }) => {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [photoURL, setPhotoURL] = useState<string | null>(user.photoURL || null);
    const [loading, setLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileError, setProfileError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [appLockEnabled, setAppLockEnabled] = useState(!!localStorage.getItem('appLockPin'));
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [showGuestSignOutConfirm, setShowGuestSignOutConfirm] = useState(false);
    
    useEffect(() => {
        setDisplayName(user.displayName || '');
        setPhotoURL(user.photoURL || null);
    }, [user]);

    const handlePhotoChange = () => {
        const dialog = uploadcare.openDialog(null, {
            publicKey: 'e5cdcd97e0e41d6aa881',
            imagesOnly: true,
            crop: '1:1',
        });
        dialog.done((fileGroup: any) => {
            fileGroup.promise().done((fileInfo: any) => {
                setPhotoURL(fileInfo.cdnUrl);
            });
        });
    };

    const handleProfileUpdate = async () => {
        if (displayName === (user.displayName || '') && photoURL === (user.photoURL || null)) {
            setProfileSuccess("لم يتم إجراء أي تغييرات.");
            setTimeout(() => setProfileSuccess(''), 3000);
            return;
        }
        setLoading(true);
        setProfileSuccess('');
        setProfileError('');
        try {
            await updateProfile(user, { displayName, photoURL });
            await updateDoc(doc(db, 'users', user.uid), { displayName, photoURL });
            setProfileSuccess('تم تحديث الملف الشخصي بنجاح!');
            setTimeout(() => setProfileSuccess(''), 3000);
        } catch (error: any) {
            console.error("Error updating profile: ", error);
            setProfileError("حدث خطأ أثناء تحديث الملف الشخصي.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleSignOutClick = () => {
        if (user.isAnonymous) {
            setShowGuestSignOutConfirm(true);
        } else {
            handleSignOut();
        }
    };
    
    const confirmSignOut = () => {
        setShowGuestSignOutConfirm(false);
        handleSignOut();
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'حذف') {
            setProfileError('الرجاء كتابة "حذف" للتأكيد.');
            return;
        }
        setLoading(true);
        setProfileError('');
        setProfileSuccess('');
        try {
            await user.delete();
            // Sign out will be handled by onAuthStateChanged
        } catch (error: any) {
            setProfileError(getErrorMessage(error.code));
            setShowDeleteConfirm(false); // Close modal on error to show message
        } finally {
            setLoading(false);
        }
    };
    
    const handleAppLockToggle = () => {
        if (appLockEnabled) {
            localStorage.removeItem('appLockPin');
            setAppLockEnabled(false);
        } else {
            setShowSetPinModal(true);
        }
    };

    const handlePinSet = (pin: string) => {
        localStorage.setItem('appLockPin', pin);
        setAppLockEnabled(true);
        setShowSetPinModal(false);
    };
    
    const handleUnblockUser = async (uidToUnblock: string) => {
        if (!userProfile.blockedUsers?.includes(uidToUnblock)) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                blockedUsers: arrayRemove(uidToUnblock)
            });
            showAlert('تم إلغاء حظر المستخدم بنجاح.', 'success');
        } catch (error) {
            console.error("Error unblocking user: ", error);
            showAlert('حدث خطأ أثناء إلغاء الحظر.', 'error');
        }
    };
    

    return (
        <div className="text-white space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-center text-white text-shadow">الإعدادات</h1>
            </header>

            {profileError && <ErrorAlert message={profileError} />}
            
            <div className="space-y-6 p-6 bg-sky-900/30 rounded-lg">
                <h2 className="text-xl font-semibold text-sky-200 border-b border-sky-400/30 pb-2">الملف الشخصي</h2>
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <img
                            src={photoURL || `https://ui-avatars.com/api/?name=${displayName || 'زائر'}&background=0ea5e9&color=fff&size=128`}
                            alt="الملف الشخصي"
                            className="w-32 h-32 rounded-full object-cover border-4 border-sky-400/50"
                        />
                        <button onClick={handlePhotoChange} className="absolute bottom-0 right-0 bg-sky-600 p-2 rounded-full hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300" aria-label="تغيير الصورة">
                            <CameraIcon className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                <div className="relative z-0 pt-4">
                    <input id="displayName" type="text" className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer" placeholder=" " value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    <label htmlFor="displayName" className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-7 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">الاسم</label>
                </div>

                <button onClick={handleProfileUpdate} disabled={loading} className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100">
                    {loading ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
                </button>
                {profileSuccess && <p className="text-center text-green-300 mt-2 text-sm">{profileSuccess}</p>}
            </div>
            
            <div className="p-4 bg-sky-900/30 rounded-lg space-y-2">
                <h3 className="text-lg font-semibold text-sky-200 px-2">الأمان</h3>
                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <ShieldCheckIcon className="w-6 h-6 text-sky-300"/>
                        <span>قفل التطبيق</span>
                    </div>
                    <label htmlFor="app-lock-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="app-lock-toggle" className="sr-only peer" checked={appLockEnabled} onChange={handleAppLockToggle} />
                        <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                </div>
                 <button onClick={handleSignOutClick} className="flex justify-between items-center w-full p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <LogoutIcon className="w-6 h-6 text-sky-300"/>
                        <span>تسجيل الخروج</span>
                    </div>
                </button>
            </div>
            
            <BlockedUsers blockedUids={userProfile.blockedUsers || []} onUnblock={handleUnblockUser} />

            {!user.isAnonymous && (
                <div className="p-4 bg-red-900/30 rounded-lg space-y-2">
                    <h3 className="text-lg font-semibold text-red-300 px-2">منطقة الخطر</h3>
                    <button onClick={() => setShowDeleteConfirm(true)} className="flex justify-between items-center w-full p-2 rounded-lg hover:bg-red-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <TrashIcon className="w-6 h-6 text-red-400" />
                            <span className="text-red-400">حذف الحساب</span>
                        </div>
                    </button>
                </div>
            )}
            
            {showGuestSignOutConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-yellow-500/50 rounded-lg p-6 space-y-4 text-white">
                        <h3 className="text-xl font-bold text-yellow-400 text-center">تنبيه تسجيل الخروج</h3>
                        <p className="text-sky-200 text-center">
                            هل أنت متأكد؟ إذا قمت بتسجيل الخروج، ستفقد حساب الزائر الحالي بشكل دائم.
                            في المرة القادمة التي تدخل فيها كزائر، سيتم إنشاء حساب جديد لك ولن تتمكن من الوصول إلى بياناتك الحالية.
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={() => setShowGuestSignOutConfirm(false)} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">إلغاء</button>
                            <button onClick={confirmSignOut} className="px-6 py-2 font-semibold text-white rounded-md bg-yellow-600 hover:bg-yellow-500">تأكيد الخروج</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4">
                        <h3 className="text-xl font-bold text-red-400">تأكيد حذف الحساب</h3>
                        <p className="text-sky-200">هل أنت متأكد من رغبتك في حذف حسابك؟ سيتم حذف جميع بياناتك بشكل دائم ولا يمكن التراجع عن هذا الإجراء.</p>
                        <p className="text-sm text-sky-300">للتأكيد، يرجى كتابة <span className="font-bold text-red-400">حذف</span> في المربع أدناه.</p>
                        <input type="text" className="w-full bg-black/30 border border-red-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
                        <div className="flex justify-end gap-4">
                             <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">إلغاء</button>
                             <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'حذف' || loading} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100">
                                {loading ? 'جارِ الحذف...' : 'تأكيد الحذف'}
                             </button>
                        </div>
                    </div>
                 </div>
            )}
             {showSetPinModal && <SetPinModal onPinSet={handlePinSet} onClose={() => setShowSetPinModal(false)} />}
        </div>
    );
};

export default Settings;