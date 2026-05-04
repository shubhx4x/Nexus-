import React from 'react';
import { Conversation, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { Search, Plus } from 'lucide-react';
import { APP_NAME } from '../constants';

interface SidebarProps {
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
  selectedId?: string;
  profile: UserProfile;
}

export default function Sidebar({ conversations, onSelect, selectedId, profile }: SidebarProps) {
  const [search, setSearch] = React.useState('');
  const [tab, setTab] = React.useState<'all' | 'requests'>('all');

  const filtered = conversations.filter(c => {
    if (tab === 'requests') {
       // Filter for messages that haven't been 'accepted' by current user if they aren't followers
       // For this demo, let's assume conversations with no lastMessage or specific meta are requests
       return c.metadata?.isRequest === true;
    }
    return c.metadata?.isRequest !== true;
  });

  return (
    <div className="w-80 h-full border-r border-zinc-800 flex flex-col glass">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight uppercase tracking-tighter font-black">{APP_NAME} Comms</h2>
          <button className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
           <button 
            onClick={() => setTab('all')}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
              tab === 'all' ? "bg-zinc-900 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
            )}
           >
              Inbox
           </button>
           <button 
            onClick={() => setTab('requests')}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all relative",
              tab === 'requests' ? "bg-zinc-900 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
            )}
           >
              Requests
              {conversations.some(c => c.metadata?.isRequest === true) && (
                <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
           </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter identity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-zinc-900 group",
              selectedId === conv.id ? "bg-indigo-500/10 border border-indigo-500/20" : "border border-transparent"
            )}
          >
            <div className="relative">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden">
                <img 
                  src={conv.metadata?.icon || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-zinc-950 rounded-full" />
            </div>

            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold truncate text-zinc-100">
                  {conv.metadata?.name || 'Direct Message'}
                </h3>
                <span className="text-[10px] text-zinc-500">
                  {formatDistanceToNow(new Date(conv.updatedAt))}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">
                {conv.lastMessage?.text || 'No messages yet'}
              </p>
            </div>
            
            {conv.lastMessage?.unreadCount > 0 && (
               <div className="w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
