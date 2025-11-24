import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { OrderStatus } from '../types';
import { Select } from '../components/ui/Select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, addDays } from '../constants';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, ShieldCheck } from 'lucide-react';

export const Billing: React.FC = () => {
  // --- AUTH STATE ---
  // Verifica se já foi desbloqueado nesta sessão
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('engmat_billing_unlocked') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // SENHA DE ACESSO AO FATURAMENTO
    const BILLING_PASSWORD = 'Engmat'; 

    if (passwordInput === BILLING_PASSWORD) {
        setIsUnlocked(true);
        sessionStorage.setItem('engmat_billing_unlocked', 'true');
        setAuthError('');
    } else {
        setAuthError('Senha incorreta. Tente novamente.');
    }
  };

  // --- DATA LOGIC ---
  const { orders } = useData();
  
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterFactory, setFilterFactory] = useState('');

  // 1. Invoiced Revenue Logic (Faturamento)
  const invoicedOrders = useMemo(() => {
    return orders.filter(o => {
        if (o.status !== OrderStatus.FATURADO || !o.invoiceDate) return false;
        if (filterFactory && o.factory !== filterFactory) return false;
        
        const d = o.invoiceDate;
        return d >= startDate && d <= endDate;
    });
  }, [orders, startDate, endDate, filterFactory]);

  const revenueByFactory = useMemo(() => {
      const data: Record<string, number> = {};
      invoicedOrders.forEach(o => {
          data[o.factory] = (data[o.factory] || 0) + o.value;
      });
      return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [invoicedOrders]);

  const totalRevenue = invoicedOrders.reduce((acc, o) => acc + o.value, 0);

  // 2. Commission Forecast Logic
  const commissionData = useMemo(() => {
      const dataMap: Record<string, Record<string, number>> = {};
      
      const allInvoiced = orders.filter(o => o.status === OrderStatus.FATURADO && o.invoiceDate && o.paymentTerms);
      
      allInvoiced.forEach(o => {
          if (filterFactory && o.factory !== filterFactory) return;

          const totalComm = (o.value * (o.commissionRate || 0)) / 100;
          let installments: Date[] = [];

          if (o.paymentTerms === 'Antecipado') {
              installments.push(parseISO(o.sendDate));
          } else {
              const days = o.paymentTerms?.match(/\d+/g)?.map(Number) || [];
              if (days.length > 0) {
                  days.forEach(d => {
                      installments.push(addDays(parseISO(o.invoiceDate!), d));
                  });
              } else {
                  installments.push(addDays(parseISO(o.invoiceDate!), 30));
              }
          }

          const commPerInstallment = totalComm / installments.length;

          installments.forEach(date => {
             const monthKey = format(date, 'yyyy-MM'); // ISO YYYY-MM helper logic fallback usually
             // Ensure YYYY-MM key
             const mKey = date.toISOString().slice(0, 7);
             const isoDate = format(date, 'yyyy-MM-dd');
             
             // Check if this specific installment falls in the filter range?
             // Or usually commission forecast shows future. Let's keep it consistent with the view.
             // If the view is "This Month", we want to see what we receive THIS MONTH.
             if (isoDate >= startDate && isoDate <= endDate) {
                 if (!dataMap[mKey]) dataMap[mKey] = {};
                 dataMap[mKey][o.factory] = (dataMap[mKey][o.factory] || 0) + commPerInstallment;
             }
          });
      });

      return Object.entries(dataMap).map(([month, factories]) => {
          return {
              name: format(parseISO(month + '-01'), 'MMM/yyyy'),
              date: month,
              ...factories
          };
      }).sort((a, b) => a.date.localeCompare(b.date));

  }, [orders, startDate, endDate, filterFactory]);

  const totalCommissionInPeriod = commissionData.reduce((acc, item) => {
      let monthSum = 0;
      Object.keys(item).forEach(key => {
          if (key !== 'name' && key !== 'date') monthSum += (item as any)[key];
      });
      return acc + monthSum;
  }, 0);

  const factoriesInCommission = Array.from(new Set(
      commissionData.flatMap(item => Object.keys(item).filter(k => k !== 'name' && k !== 'date'))
  ));

  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // --- RENDER LOCK SCREEN ---
  if (!isUnlocked) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center border-t-4 border-primary">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
                <p className="text-sm text-gray-500 mb-6">
                    A área de faturamento contém informações sensíveis. Digite a senha de administrador para continuar.
                </p>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <Input 
                        type="password" 
                        placeholder="Senha de acesso" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="text-center text-lg tracking-widest"
                        autoFocus
                    />
                    {authError && (
                        <p className="text-red-500 text-sm font-medium">{authError}</p>
                    )}
                    <Button type="submit" className="w-full">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Desbloquear Visualização
                    </Button>
                </form>
            </div>
        </div>
      );
  }

  // --- RENDER CONTENT ---
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">Faturamento & Comissões</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border rounded-md">
              <span className="text-xs text-gray-500 font-medium">Visualização:</span>
              <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none text-gray-700"
              />
              <span className="text-xs text-gray-500">até</span>
              <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none text-gray-700"
              />
            </div>
            <button 
                onClick={() => {
                    setIsUnlocked(false);
                    sessionStorage.removeItem('engmat_billing_unlocked');
                }}
                className="text-gray-400 hover:text-red-500"
                title="Bloquear tela"
            >
                <Lock className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
            <h3 className="text-gray-500 text-sm font-medium">Faturamento Realizado (Período)</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">
                {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Baseado na data de faturamento</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
            <h3 className="text-gray-500 text-sm font-medium">Previsão de Comissões (Período)</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">
                {formatCurrency(totalCommissionInPeriod)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Baseado na condição de pagamento</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4 border-b pb-2">Faturamento por Indústria</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByFactory} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                        <Bar dataKey="value" name="Faturamento" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={30}>
                             {revenueByFactory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

           {/* Commission Chart */}
           <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4 border-b pb-2">Previsão de Recebimento de Comissões</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={commissionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(val) => `R$${val/1000}k`}/>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                        <Legend />
                        {factoriesInCommission.map((factory, index) => (
                            <Bar 
                                key={factory} 
                                dataKey={factory} 
                                stackId="a" 
                                fill={COLORS[index % COLORS.length]} 
                            />
                        ))}
                        {commissionData.length === 0 && (
                            <text x="50%" y="50%" textAnchor="middle" fill="#9ca3af">
                                Sem previsões para o período selecionado
                            </text>
                        )}
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

      </div>
    </div>
  );
};
