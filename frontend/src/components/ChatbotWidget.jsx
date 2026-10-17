import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { chatbotAPI } from '../services/api';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ShieldCheck, 
  RotateCcw,
  ChevronDown,
  Minimize2,
  Maximize2
} from 'lucide-react';

const ROLE_BADGE_INFO = {
  SCOLARITE_ETABLISSEMENT: { label: 'Scolarité Établissement', color: '#00b4d8', bg: '#e0f7fa' },
  SCOLARITE_CENTRALE: { label: 'Scolarité Centrale', color: '#048b9a', bg: '#ccfbf1' },
  CHEF_SERVICE: { label: 'Chef de Service', color: '#0a3641', bg: '#e2e8f0' },
  IMPRIMEUR: { label: 'Concepteur / Imprimeur', color: '#1d70b8', bg: '#e0f2fe' },
  AGENT_TRANSMISSION: { label: 'Agent Transmission', color: '#6366f1', bg: '#e0e7ff' },
  PRESIDENCE: { label: 'Présidence', color: '#c0000c', bg: '#fee2e2' },
};

const ChatbotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const roleInfo = ROLE_BADGE_INFO[user?.role] || { 
    label: user?.role || 'Utilisateur', 
    color: '#070b19', 
    bg: '#e2e8f0' 
  };

  // Initial welcome message and suggestions when user is loaded
  useEffect(() => {
    if (user) {
      chatbotAPI.getSuggestions()
        .then((res) => {
          if (res.data?.suggestions) {
            setSuggestions(res.data.suggestions);
          }
        })
        .catch((err) => console.error('Erreur chargement suggestions:', err));

      const defaultWelcome = {
        sender: 'bot',
        text: `Bonjour 👋 !\nJe suis votre **Assistant Virtuel Sécurisé** pour la gestion des diplômes.\n\n🔒 *Vos échanges et vos données sont strictement confidentiels et protégés par votre rôle (${roleInfo.label}).*`,
        timestamp: new Date()
      };
      setMessages([defaultWelcome]);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : inputMessage;
    if (!text.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await chatbotAPI.ask(text.trim());
      const botMsg = {
        sender: 'bot',
        text: response.data.reply,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, botMsg]);
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSuggestions(response.data.suggestions);
      }
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      const errorMsg = {
        sender: 'bot',
        text: "Désolé, une erreur de communication est survenue. Veuillez vérifier votre connexion et réessayer.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    const resetMsg = {
      sender: 'bot',
      text: `Conversation réinitialisée. Comment puis-je vous aider ?`,
      timestamp: new Date()
    };
    setMessages([resetMsg]);
    chatbotAPI.getSuggestions()
      .then((res) => {
        if (res.data?.suggestions) setSuggestions(res.data.suggestions);
      })
      .catch(console.error);
  };

  // Helper to format rich markdown (bold, lists, backticks, tables, sub-items)
  const renderFormattedText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Markdown table parser
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
          const hasSeparator = tableLines[1].includes('---');
          const rowLines = hasSeparator ? tableLines.slice(2) : tableLines.slice(1);

          elements.push(
            <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '0.6rem 0', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#0a3641' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowLines.map((r, rIdx) => {
                    const cells = r.split('|').slice(1, -1).map(c => c.trim());
                    return (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#fbfcfd' }}>
                        {cells.map((c, cIdx) => (
                          <td key={cIdx} style={{ padding: '0.45rem 0.65rem', color: '#334155' }}>
                            <span dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 4px; font-family: monospace;">$1</code>') }} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Standard formatted line
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formattedLine = formattedLine.replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>');

      if (line.trim().startsWith('↳')) {
        elements.push(
          <div key={i} style={{ marginLeft: '1.25rem', fontSize: '0.84em', color: '#64748b', marginTop: '0.15rem' }}>
            <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          </div>
        );
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemContent = formattedLine.replace(/^[\s]*[-*]\s+/, '');
        elements.push(
          <div key={i} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
            <span style={{ color: '#048b9a', fontWeight: 'bold' }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: itemContent }} />
          </div>
        );
      } else if (/^\d+\.\s/.test(line.trim())) {
        elements.push(
          <div key={i} style={{ marginLeft: '0.2rem', marginTop: '0.2rem' }}>
            <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          </div>
        );
      } else if (!line.trim()) {
        elements.push(<div key={i} style={{ height: '0.4rem' }} />);
      } else {
        elements.push(
          <p key={i} style={{ margin: '0.25rem 0' }} dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      }
      i++;
    }

    return elements;
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Ouvrir l'Assistant Virtuel"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999,
            backgroundColor: '#070b19',
            backgroundImage: 'linear-gradient(135deg, #070b19 0%, #048b9a 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50px',
            padding: '0.85rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            boxShadow: '0 8px 25px rgba(4, 139, 154, 0.35)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(4, 139, 154, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(4, 139, 154, 0.35)';
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bot size={22} color="#00b4d8" />
            {hasUnread && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '10px',
                height: '10px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                border: '2px solid #ffffff'
              }} />
            )}
          </div>
          <span>Assistant IA</span>
          <span style={{
            fontSize: '0.7rem',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px'
          }}>
            {roleInfo.label}
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? '10px' : '24px',
            right: isExpanded ? '10px' : '24px',
            width: isExpanded ? 'calc(100vw - 20px)' : '420px',
            maxWidth: '100vw',
            height: isExpanded ? 'calc(100vh - 20px)' : '620px',
            maxHeight: '90vh',
            backgroundColor: '#ffffff',
            borderRadius: isExpanded ? '16px' : '20px',
            boxShadow: '0 20px 40px rgba(7, 11, 25, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            fontFamily: 'inherit',
            animation: 'fadeInUp 0.25s ease-out'
          }}
        >
          {/* Header */}
          <div style={{
            backgroundColor: '#070b19',
            backgroundImage: 'linear-gradient(135deg, #070b19 0%, #0a3641 100%)',
            color: '#ffffff',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 180, 216, 0.15)',
                border: '1px solid rgba(0, 180, 216, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00b4d8'
              }}>
                <Bot size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                    Assistant Diplômes
                  </h3>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: roleInfo.bg,
                    color: roleInfo.color,
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px'
                  }}>
                    {roleInfo.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <ShieldCheck size={12} color="#10b981" />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Données cloisonnées & sécurisées
                  </span>
                </div>
              </div>
            </div>

            {/* Header controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={handleResetChat}
                title="Effacer l'historique"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Réduire' : 'Agrandir'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Fermer"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isUser ? '#070b19' : '#048b9a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {isUser ? <User size={15} /> : <Bot size={15} />}
                  </div>

                  <div style={{
                    maxWidth: '82%',
                    backgroundColor: isUser ? '#070b19' : '#ffffff',
                    color: isUser ? '#ffffff' : '#1e293b',
                    padding: '0.75rem 1rem',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    boxShadow: isUser ? '0 2px 8px rgba(7, 11, 25, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    lineHeight: '1.45'
                  }}>
                    {renderFormattedText(msg.text)}
                    <span style={{
                      display: 'block',
                      fontSize: '0.65rem',
                      color: isUser ? 'rgba(255,255,255,0.6)' : '#94a3b8',
                      marginTop: '0.35rem',
                      textAlign: isUser ? 'right' : 'left'
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#048b9a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Bot size={15} />
                </div>
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '0.6rem 1rem',
                  borderRadius: '16px 16px 16px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  color: '#64748b'
                }}>
                  <Sparkles size={14} color="#048b9a" className="animate-spin" />
                  <span>Recherche & filtrage sécurisé...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {suggestions.length > 0 && !loading && (
            <div style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none'
            }}>
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sug)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#070b19',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e0f2fe';
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.color = '#0369a1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#070b19';
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Box Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Posez votre question sur les diplômes..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                color: '#0f172a'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#048b9a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              style={{
                backgroundColor: inputMessage.trim() && !loading ? '#048b9a' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                cursor: inputMessage.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
