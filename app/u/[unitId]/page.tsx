'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Play, PlayCircle, ArrowUp } from 'react-feather';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Page({ params }: { params: { unitId: string } }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial fetch of messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('unit_id', params.unitId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      setMessages(data || []);
    };

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('transcriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcriptions',
          filter: `unit_id=eq.${params.unitId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((current: any) => [...current, payload.new]);
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.unitId, supabase]);

  return (
    <div className="flex h-screen w-full bg-[#1D1D1D]">
      <div className="flex w-2/3 flex-col justify-between">
        <div className="h-screen overflow-y-auto bg-white p-4">
          {messages.map((message) => (
            <div
              key={message.transcript_id}
              className="mb-4 flex flex-col space-x-4 rounded-lg px-2"
            >
              <div className="flex flex-row space-x-2">
                <div
                  className={`text-sm ${message.user === 'Alpha' ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  {message.user}
                </div>
                <div className="text-sm text-gray-400">
                  {message.created_at}
                </div>
              </div>
              <div className="text-black">{message.message}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-screen w-1/3 flex-col items-center bg-black">
        <div className="h-screen"></div>
        <form className="relative w-[95%] pb-4" onSubmit={() => {}}>
          <input
            name="message"
            type="text"
            autoComplete="off"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message here..."
            className="w-full rounded-md border border-[#2E2E2E] bg-[#1D1D1D] px-2 py-6 font-sans text-sm font-light text-white placeholder-gray-500 focus:border-[0.75px] focus:border-pink-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute right-3 top-[40%] -translate-y-1/2"
            disabled={isLoading}
          >
            <ArrowUp
              strokeWidth={1}
              className="rounded-full border border-[#2E2E2E] bg-white text-[#1D1D1D]"
              size={20}
            />
          </button>
        </form>
      </div>
    </div>
  );
}
