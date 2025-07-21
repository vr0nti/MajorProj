import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { askDoubtSolver } from '../api/academicChat';
import '../styles/ai-chat.css';

const collapseBlanks = (text) => {
  // Replace 3+ newlines with 2
  let collapsed = text.replace(/\n{3,}/g, '\n\n');
  // Remove blank lines between numbered or bullet lists
  collapsed = collapsed.replace(/\n\s*\n(\s*(?:\d+\.|[-*]))/g, '\n$1');
  return collapsed;
};

const cleanAssistantText = (text) => {
  if (!text) return '';
  let cleaned = text.replace(/<\/?\s*think[^>]*>/gi, '').trim();
  cleaned = collapseBlanks(cleaned);
  return cleaned;
};

const AiChatBot = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your academic doubt solver. Ask me any academic question.' },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Optimistic UI update
    const newUserMsg = { role: 'user', content: collapseBlanks(trimmed) };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput('');
    setLoading(true);

    try {
      const { answer } = await askDoubtSolver(trimmed);
      const botMsg = { role: 'assistant', content: cleanAssistantText(answer) };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const botMsg = { role: 'assistant', content: 'Sorry, I could not get an answer right now. Please try again later.' };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat-container">
      <h2 className="ai-chat-title">AI Doubt Solver</h2>
      <div className="ai-chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' ? (
              <ReactMarkdown className="markdown-content">{msg.content}</ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && <div className="chat-bubble assistant">Typing…</div>}
        <div ref={bottomRef} />
      </div>
      <div className="ai-chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask your academic doubt…"
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}>Send</button>
      </div>
    </div>
  );
};

export default AiChatBot; 