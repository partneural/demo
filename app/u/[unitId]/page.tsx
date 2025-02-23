'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowUp, Circle } from 'react-feather';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Page({ params }: { params: { unitId: string } }) {
  const [transcription, setTranscription] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<any>([]);

  // First useEffect to fetch initial data
  useEffect(() => {
    const fetchTranscriptionMessages = async () => {
      const { data: transcription_data, error: transcription_error } =
        await supabase
          .from('transcriptions')
          .select('*')
          .eq('unit_id', params.unitId)
          .order('created_at', { ascending: false })
          .limit(1);

      if (transcription_error) {
        console.error('Error fetching transcription:', transcription_error);
        return;
      }

      // Should be the most recent transcription and not be empty, ideally
      const currentTranscriptionId = transcription_data[0].transcription_id;
      setTranscriptionId(currentTranscriptionId);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('transcription_id', currentTranscriptionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching transciption messages:', error);
        return;
      }
      setTranscription(data || []);
    };

    fetchTranscriptionMessages();
  }, [params.unitId]);

  // Separate useEffect for subscription that depends on transcriptId
  useEffect(() => {
    if (!transcriptionId) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `transcription_id=eq.${transcriptionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTranscription((current: any) => [...current, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transcriptionId]);

  useEffect(() => {
    const messages = [
      'Received background information',
      'Processing background',
      'Processed Background',
      `Subject Information:
Name: John Michael Smith
DOB: 03/15/1985
License #: D4589721
Address: 123 Oak Street, Springfield
Height: 5'11"
Weight: 180 lbs
Hair: Brown
Eyes: Blue
Prior Incidents: 2 traffic violations (2020, 2022)`,
    ];

    let currentMessageIndex = 0;
    let currentCharIndex = 0;
    let streamingInterval: NodeJS.Timeout;

    const streamNextMessage = () => {
      if (currentMessageIndex >= messages.length) return;

      const currentMessage = messages[currentMessageIndex];

      if (currentCharIndex === 0) {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setMessages((current: any) => [
          ...current,
          {
            message: '',
            role: 'assistant',
            timestamp,
          },
        ]);
      }

      streamingInterval = setInterval(() => {
        if (currentCharIndex < currentMessage.length) {
          setMessages((current: any) => {
            const newMessages = [...current];
            newMessages[newMessages.length - 1].message = currentMessage.slice(
              0,
              currentCharIndex + 1
            );
            return newMessages;
          });
          currentCharIndex++;
        } else {
          clearInterval(streamingInterval);
          currentMessageIndex++;
          currentCharIndex = 0;
          setTimeout(streamNextMessage, 1000); // Delay before starting next message
        }
      }, 30); // Adjust this value to control streaming speed
    };

    streamNextMessage();

    return () => {
      clearInterval(streamingInterval);
    };
  }, []);

  useEffect(() => {
    const makeAlertCall = async () => {
      try {
        const response = await fetch('/api/alert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: 'Officer Josh is in danger! Alerting dispatch.',
            phone_number: '+16145960099', // Use your actual phone number here
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to make alert call');
        }

        const data = await response.json();
        console.log('Alert call initiated:', data);
      } catch (error) {
        console.error('Error making alert call:', error);
      }
    };

    makeAlertCall();
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#1D1D1D]">
      <div className="flex w-2/3 flex-col justify-between p-10">
        <div className="h-screen w-full overflow-y-auto bg-white p-4">
          {transcription.map((transcription: any) => (
            <div
              key={transcription.transcription_id}
              className="mb-4 flex flex-col space-x-4 rounded-lg px-2"
            >
              <div className="flex flex-row space-x-2">
                <div
                  className={`text-sm ${transcription.user === 'Alpha' ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  {transcription.user}
                </div>
                <div className="text-sm text-gray-400">
                  {transcription.created_at}
                </div>
              </div>
              <div className="text-black">{transcription.message}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-screen w-1/3 flex-col justify-center p-10">
        <div className="flex h-[95%] w-full flex-col items-center rounded-md bg-black">
          <div className="mt-4 flex h-screen w-full flex-col items-center space-y-4 p-4">
            {messages.map((message: any, index: number) => (
              <div
                key={index}
                className="flex w-full flex-row items-start space-x-4"
              >
                <span className="text-sm text-gray-500">
                  {message.timestamp}
                </span>
                <div className="w-3/4">
                  <div
                    className={`${
                      message.role === 'assistant'
                        ? 'items-start text-white'
                        : 'items-end text-blue-500'
                    } whitespace-pre-wrap break-words`}
                  >
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}
