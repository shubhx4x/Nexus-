import React, { useState, useEffect } from 'react';
import { UserProfile, Conversation } from '../types';
import Sidebar from './Sidebar';
import ChatRoom from './ChatRoom';
import GlobalSearch from './GlobalSearch';
import ProfileSettings from './ProfileSettings';
import AdminPanel from './AdminPanel';
import GamesHub from './GamesHub';
import Home from './Home';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Clock, User, Heart, MessageCircle } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface MessengerProps {
  profile: UserProfile;
  activeTab?: string;
}

export default function Messenger({ profile, activeTab = 'chat' }: MessengerProps) {
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', profile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(convs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home profile={profile} />;
      case 'chat':
        return (
          <div className="flex h-full">
            <Sidebar 
              conversations={conversations} 
              onSelect={setSelectedChat} 
              selectedId={selectedChat?.id}
              profile={profile}
            />
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {selectedChat ? (
                  <ChatRoom 
                    conversation={selectedChat} 
                    currentUser={profile}
                  />
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                       <MessageSquare className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">Select a conversation to start messaging</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      case 'profile':
        return <ProfileSettings profile={profile} />;
      case 'admin':
        return <AdminPanel />;
      case 'games':
        return <GamesHub />;
      default:
        return <Home profile={profile} />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
}
