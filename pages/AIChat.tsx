import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

// Safer ID generator for non-secure contexts (http)
const generateId = () => Math.random().toString(36).substr(2, 9);

export const AIChat: React.FC = () => {
  const { quotes, orders, settings } = useData();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou seu analista virtual da Engmat. Tenho acesso aos dados de orçamentos e pedidos atuais. Como posso ajudar você a analisar seus resultados hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: generateId(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Safe access to API Key via window.process
      // We avoid using the bare 'process' keyword to prevent ReferenceErrors in strict browser ESM
      let apiKey = '';
      const win = window as any;
      if (win.process && win.process.env && win.process.env.API_KEY) {
          apiKey = win.process.env.API_KEY;
      }
      
      if (!apiKey) {
        throw new Error("Chave de API não configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare context data
      // We limit data to essential fields to save context window and tokens
      const contextData = {
        summary: {
           totalQuotes: quotes.length,
           totalOrders: orders.length,
           date: new Date().toISOString().split('T')[0]
        },
        quotes: quotes.map(q => ({
            client: q.constructorName,
            work: q.workName,
            value: q.value,
            status: q.status,
            date: q.date,
            factory: q.factory,
            product: q.product
        })),
        orders: orders.map(o => ({
            client: o.constructorName,
            po: o.poNumber,
            value: o.value,
            status: o.status,
            sendDate: o.sendDate,
            factory: o.factory,
            product: o.product,
            deliveryDate: o.deliveryDate
        })),
        targets: settings.targets
      };

      const systemInstruction = `
        Você é um analista de dados especialista em CRM para uma empresa de representação comercial chamada Engmat.
        
        Você tem acesso aos seguintes dados em formato JSON:
        ${JSON.stringify(contextData)}
        
        Sua missão é responder perguntas sobre vendas, orçamentos, performance de fábricas e metas.
        
        Diretrizes:
        1. Responda sempre em Português do Brasil.
        2. Seja conciso e direto, usando formatação Markdown (negrito, listas) para facilitar a leitura.
        3. Se for perguntado sobre valores, formate como moeda (R$ X.XXX,XX).
        4. Se perguntarem sobre "taxa de conversão", calcule baseando-se em (pedidos fechados / total orçado) ou a lógica que fizer mais sentido com os dados disponíveis.
        5. Se não encontrar a informação nos dados fornecidos, diga que não possui essa informação específica no momento.
        6. Analise tendências se solicitado (ex: qual fábrica vendeu mais).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            ...messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            })),
            { role: 'user', parts: [{ text: userMessage.text }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3, // Low temperature for more factual answers
        }
      });

      const text = response.text || "Desculpe, não consegui processar sua solicitação.";

      setMessages(prev => [...prev, { id: generateId(), role: 'model', text }]);

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message === "Chave de API não configurada." 
        ? "Erro de configuração: Chave da API não encontrada. Verifique suas variáveis de ambiente." 
        : "Ocorreu um erro ao consultar a IA. Por favor, tente novamente.";
      
      setMessages(prev => [...prev, { id: generateId(), role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Qual o valor total vendido este mês?",
    "Quais orçamentos estão em aberto há mais tempo?",
    "Qual a fábrica com melhor performance?",
    "Resuma a situação da construtora X"
  ];

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-2 shadow-sm z-10">
        <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg">
             <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-gray-800">Analista Engmat IA</h2>
            <p className="text-xs text-gray-500">Pergunte sobre seus dados de vendas</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'model' ? 'bg-white border border-gray-200' : 'bg-primary'
            }`}>
              {msg.role === 'model' ? <Bot className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-white" />}
            </div>
            
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
             </div>
             <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
         {/* Suggestions */}
         {messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                {suggestions.map((s, i) => (
                    <button 
                        key={i}
                        onClick={() => { setInput(s); }}
                        className="whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full transition-colors border border-gray-200"
                    >
                        {s}
                    </button>
                ))}
            </div>
         )}
         
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta sobre os dados..."
            className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 outline-none transition-all"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="w-12 px-0 flex items-center justify-center">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
};