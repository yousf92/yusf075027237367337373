import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './services/firebase.ts';
import type { UserProfile } from './types.ts';
import Auth from './components/Auth.tsx';
import MainScreen from './components/MainScreen.tsx';
import { Spinner } from './components/ui/Icons.tsx';
import PinLock from './components/ui/PinLock.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appLocked, setAppLocked] = useState(!!localStorage.getItem("appLockPin"));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile({ uid: user.uid, ...docSnap.data() } as UserProfile);
            setLoading(false);
          } else {
            // This is a new user, create their profile document
            const newProfileData = {
              displayName: user.isAnonymous 
                ? `زائر ${user.uid.substring(0, 5)}` 
                : (user.displayName || "مستخدم جديد"),
              createdAt: serverTimestamp(),
              isAdmin: false,
              isMuted: false,
              role: null,
              commitmentDocument: "",
              blockedUsers: [],
              emergencyIndex: 0,
              urgeIndex: 0,
              storyIndex: 0,
              ...(user.email && { email: user.email }),
              ...(user.photoURL && { photoURL: user.photoURL }),
            };
            
            setDoc(userDocRef, newProfileData).catch(error => {
              console.error("Failed to create user profile:", error);
              // If profile creation fails, we might be in a bad state.
              setLoading(false);
            });
            // NOTE: The snapshot listener will be called again once the document is created, 
            // and the `if (docSnap.exists())` block will then handle setting the profile and loading state.
          }
        }, (error) => {
          console.error("Error in profile snapshot listener:", error);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Guest login failed:", error);
      setLoading(false); // Ensure loading is stopped on error
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // setUser(null) will be handled by onAuthStateChanged
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Spinner className="w-16 h-16 text-sky-400" />
      </main>
    );
  }

  if (appLocked) {
    return <PinLock onUnlock={() => setAppLocked(false)} />;
  }

  return (
     <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {user && userProfile ? (
          <MainScreen user={user} userProfile={userProfile} handleSignOut={handleSignOut} setAppLocked={setAppLocked} />
        ) : (
          <Auth handleGuestLogin={handleGuestLogin} />
        )}
      </div>
    </main>
  );
};

export default App;