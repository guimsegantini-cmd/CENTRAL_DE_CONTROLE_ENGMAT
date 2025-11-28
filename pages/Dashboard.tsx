import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { FACTORY_OPTIONS, format, parseISO, startOfMonth, endOfMonth, differenceInDays } from '../constants';
import { QuoteStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import { Select } from '../components/ui/Select';
import { Maximize2, Minimize2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { orders, quotes, settings } = useData();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterFactory, setFilterFactory] = useState('');
  const [targetViewMode, setTargetViewMode] = useState<'percent' | 'value'>('percent');
  const [quoteViewMode, setQuoteViewMode] = useState<'count' | 'value'>('count');
  const [salesMixViewMode, setSalesMixViewMode] = useState<'value' | 'quantity'>('value');

  // Fullscreen Logic
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        dashboardRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Data Preparation ---

  const filteredOrders = useMemo(() => {
      return orders.filter(o => {
          const d = o.sendDate;
          return d >= startDate && d <= endDate;
      });
  }, [orders, startDate, endDate]);

  const filteredQuotes = useMemo(() => {
      return quotes.filter(q => {
          const d = q.date;
          return d >= startDate && d <= endDate;
      });
  }, [quotes, startDate, endDate]);

  // Calculate days in range to prorate target
  const daysInRange = useMemo(() => {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const diff = differenceInDays(end, start) + 1;
      return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  // 1. Factory Performance (Target vs Actual)
  const factoryPerformance = useMemo(() => {
    return FACTORY_OPTIONS.map(factory => {
      if (filterFactory && filterFactory !== factory) return null;

      const sales = filteredOrders
        .filter(o => o.factory === factory)
        .reduce((sum, o) => sum + o.value, 0);
      
      const monthlyTarget = settings.targets[factory]?.monthlyTarget || 0;
      
      // Prorate target based on days selected.
      const target = (monthlyTarget / 30) * daysInRange;
      
      const percentage = target > 0 ? (sales / target) * 100 : 0;

      return {
        name: factory,
        sales,
        target,
        percentage: parseFloat(percentage.toFixed(1))
      };
    }).filter(Boolean) as any[];
  }, [filteredOrders, settings, filterFactory, daysInRange]);

  // 2. Total Target Achievement
  const totalPerformance = useMemo(() => {
      const totalSales = factoryPerformance.reduce((acc, curr) => acc + curr.sales, 0);
      const totalTarget = factoryPerformance.reduce((acc, curr) => acc + curr.target, 0);
      const percentage = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;
      
      return { 
          sales: totalSales, 
          target: totalTarget, 
          percentage: Math.min(percentage, 100), // For radial bar cap
          realPercentage: percentage
      };
  }, [factoryPerformance]);

  // 3. Forecast Quantity (Based on System Forecast date)
  const forecastByProduct = useMemo(() => {
      const data: Record<string, number> = {};
      orders.forEach(o => {
          if (!o.systemForecast) return;
          const d = o.systemForecast;
          // Check if forecast date is in range
          if (d >= startDate && d <= endDate) {
             if (filterFactory && o.factory !== filterFactory) return;
             data[o.product] = (data[o.product] || 0) + o.quantity;
          }
      });
      return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [orders, startDate, endDate, filterFactory]);


  // 4. Sales by Product (Value and Quantity)
  const salesByProduct = useMemo(() => {
      const data: Record<string, { value: number; quantity: number }> = {};
      filteredOrders.forEach(o => {
          if (filterFactory && o.factory !== filterFactory) return;
          
          if (!data[o.product]) {
            data[o.product] = { value: 0, quantity: 0 };
          }
          data[o.product].value += o.value;
          data[o.product].quantity += o.quantity;
      });
      return Object.entries(data).map(([name, stats]) => ({ name, ...stats }));
  }, [filteredOrders, filterFactory]);

  // 5. Quotes by Factory (Volume & Value)
  const quotesByFactory = useMemo(() => {
    const data: Record<string, { count: number; value: number }> = {};
    filteredQuotes.forEach(q => {
        if (filterFactory && q.factory !== filterFactory) return;
        
        if (!data[q.factory]) data[q.factory] = { count: 0, value: 0 };
        data[q.factory].count += 1;
        data[q.factory].value += q.value;
    });
    return Object.entries(data).map(([name, stats]) => ({ name, ...stats }));
  }, [filteredQuotes, filterFactory]);

  // Conversion Rate
  const conversionRate = useMemo(() => {
      if (filteredQuotes.length === 0) return 0;
      const closedCount = filteredQuotes.filter(q => q.status === QuoteStatus.FECHADO).length;
      return (closedCount / filteredQuotes.length) * 100;
  }, [filteredQuotes]);

  // Colors
  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div 
        ref={dashboardRef} 
        className={`space-y-8 bg-gray-50 transition-all duration-300 ${isFullscreen ? 'p-8 overflow-y-auto h-screen w-screen' : ''}`}
    >
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Dashboard de Vendas
            {isFullscreen && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-normal">Ao Vivo</span>}
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border rounded-md">
              <span className="text-xs text-gray-500 font-medium">Período:</span>
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
          <Select 
             options={FACTORY_OPTIONS.map(f => ({ value: f, label: f }))}
             value={filterFactory}
             onChange={e => setFilterFactory(e.target.value)}
             placeholder="Todas as Representadas"
             className="w-full sm:w-48"
          />
          <button 
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-primary bg-gray-50 border border-gray-200 rounded-md transition-colors hover:bg-gray-100"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
             {isFullscreen ? <Minimize2 className="w-5 h-5"/> : <Maximize2 className="w-5 h-5"/>}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-medium">Total Vendas (Período)</h3>
            <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(filteredOrders.reduce((acc, o) => acc + o.value, 0))}
            </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-medium">Total Orçamentos (Período)</h3>
            <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(filteredQuotes.reduce((acc, q) => acc + q.value, 0))}
            </p>
            <p className="text-xs text-gray-400 mt-1">{filteredQuotes.length} orçamentos</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm font-medium">Taxa de Conversão</h3>
            <p className="text-2xl font-bold text-gray-800">
                {conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Fechados / Total no período</p>
        </div>
      </div>

      {/* Section 2: Goals & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Total Target Achievement */}
          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center justify-center">
             <h3 className="text-lg font-bold mb-2 text-center w-full border-b pb-2">Atingimento Geral de Metas</h3>
             <div className="relative w-56 h-56 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                        innerRadius="70%" 
                        outerRadius="100%" 
                        barSize={24} 
                        data={[{ name: 'Total', value: totalPerformance.percentage, fill: totalPerformance.percentage >= 100 ? '#22c55e' : '#0ea5e9' }]} 
                        startAngle={180} 
                        endAngle={0}
                    >
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={12}
                        />
                    </RadialBarChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pt-14">
                     <span className="text-4xl font-bold text-gray-800">
                        {totalPerformance.realPercentage.toFixed(1)}%
                     </span>
                     <span className="text-xs text-gray-500 mt-1 px-4 text-center">
                         {formatCurrency(totalPerformance.sales)} / {formatCurrency(totalPerformance.target)}
                     </span>
                 </div>
             </div>
          </div>

           {/* Forecast Quantity - Card Grid */}
          <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-2">
             <h3 className="text-lg font-bold mb-2 border-b pb-2">Previsão de Faturamento (Produtos)</h3>
             <p className="text-xs text-gray-500 mb-4">Quantidades baseadas na previsão do sistema para o período selecionado.</p>
            
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {forecastByProduct.map((item) => (
                    <div key={item.name} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col items-center text-center hover:bg-white hover:shadow-md transition-all group">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
                           <span className="text-accent font-bold text-xs">{item.name.charAt(0)}</span>
                        </div>
                        <span className="text-xs text-gray-600 font-semibold line-clamp-2 h-8 flex items-center justify-center w-full mb-1">{item.name}</span>
                        <span className="text-2xl font-bold text-slate-800">{item.value}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">unidades</span>
                    </div>
                ))}
                {forecastByProduct.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                        <p>Sem previsões para este período.</p>
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Section 3: Detailed Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
         <div className="flex justify-between items-center mb-6 border-b pb-2">
            <h3 className="text-lg font-bold">Performance por Representada</h3>
            <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                    onClick={() => setTargetViewMode('percent')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${targetViewMode === 'percent' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Percentual (%)
                </button>
                <button 
                    onClick={() => setTargetViewMode('value')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${targetViewMode === 'value' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Valor (R$)
                </button>
            </div>
         </div>
         
         <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                {targetViewMode === 'percent' ? (
                     <BarChart data={factoryPerformance} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 'auto']} unit="%" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Atingimento']} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="percentage" name="Atingimento" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20}>
                            {factoryPerformance.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.percentage >= 100 ? '#22c55e' : '#0ea5e9'} />
                            ))}
                        </Bar>
                    </BarChart>
                ) : (
                    <BarChart data={factoryPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis tickFormatter={(val) => `R$${val/1000}k`} />
                        <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="sales" name="Vendas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="target" name="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                )}
            </ResponsiveContainer>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Vendas por Produto (Mix de Vendas) */}
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold">Mix de Vendas</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button 
                        onClick={() => setSalesMixViewMode('value')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${salesMixViewMode === 'value' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Valor (R$)
                    </button>
                    <button 
                        onClick={() => setSalesMixViewMode('quantity')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${salesMixViewMode === 'quantity' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Qtd
                    </button>
                </div>
            </div>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={salesByProduct}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey={salesMixViewMode}
                        >
                            {salesByProduct.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => salesMixViewMode === 'value' ? formatCurrency(value) : `${value} un.`} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

         {/* Volume de Orçamentos */}
         <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold">Orçamentos por Fábrica</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button 
                        onClick={() => setQuoteViewMode('count')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${quoteViewMode === 'count' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Qtd
                    </button>
                    <button 
                        onClick={() => setQuoteViewMode('value')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${quoteViewMode === 'value' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Valor (R$)
                    </button>
                </div>
            </div>
            
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotesByFactory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis allowDecimals={false} tickFormatter={quoteViewMode === 'value' ? (val) => `R$${val/1000}k` : undefined} />
                        <Tooltip formatter={quoteViewMode === 'value' ? (val: number) => formatCurrency(val) : undefined} />
                        <Bar 
                            dataKey={quoteViewMode} 
                            name={quoteViewMode === 'count' ? 'Quantidade' : 'Valor Total'} 
                            fill="#6366f1" 
                            radius={[4, 4, 0, 0]} 
                            barSize={40} 
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};
