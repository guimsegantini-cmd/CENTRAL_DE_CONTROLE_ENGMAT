import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Quote, Factory, QuoteStatus, FollowUp } from '../types';
import { FACTORY_OPTIONS, FACTORY_PRODUCTS, QUOTE_STATUS_OPTIONS, format, parseISO, startOfMonth, endOfMonth } from '../constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Search, MessageSquare, Phone, Mail, Trash2, Edit2, Calendar, X } from 'lucide-react';

export const Quotes: React.FC = () => {
  const { quotes, addQuote, updateQuote, deleteQuote } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [selectedQuoteForFollowUp, setSelectedQuoteForFollowUp] = useState<Quote | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFactory, setFilterFactory] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Form State
  const initialFormState: Partial<Quote> = {
    factory: Factory.ALUMBRA,
    status: QuoteStatus.ENVIADO,
    date: format(new Date(), 'yyyy-MM-dd'),
    followUps: []
  };
  const [formData, setFormData] = useState<Partial<Quote>>(initialFormState);
  const [followUpNote, setFollowUpNote] = useState('');

  // Derived Data
  const filteredQuotes = useMemo(() => {
    const filtered = quotes.filter(q => {
      const qDate = q.date; // ISO string YYYY-MM-DD
      const matchDate = qDate >= startDate && qDate <= endDate;
      
      const matchSearch = 
        q.constructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.product.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus ? q.status === filterStatus : true;
      const matchFactory = filterFactory ? q.factory === filterFactory : true;

      return matchDate && matchSearch && matchStatus && matchFactory;
    });

    return filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [quotes, startDate, endDate, searchTerm, filterStatus, filterFactory, sortOrder]);

  const totalValue = filteredQuotes.reduce((acc, q) => acc + Number(q.value), 0);
  const totalCount = filteredQuotes.length;

  const handleOpenModal = (quote?: Quote) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData(quote);
    } else {
      setEditingQuote(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const quoteToSave = {
      ...formData,
      id: editingQuote ? editingQuote.id : crypto.randomUUID(),
      value: Number(formData.value)
    } as Quote;

    if (editingQuote) {
      updateQuote(quoteToSave);
    } else {
      addQuote(quoteToSave);
    }
    setIsModalOpen(false);
  };

  const handleAddFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteForFollowUp || !followUpNote) return;

    const newFollowUp: FollowUp = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      note: followUpNote
    };

    const updatedQuote = {
      ...selectedQuoteForFollowUp,
      followUps: [...selectedQuoteForFollowUp.followUps, newFollowUp]
    };

    updateQuote(updatedQuote);
    setSelectedQuoteForFollowUp(updatedQuote); // Keep modal updated
    setFollowUpNote('');
  };

  const clearFilters = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    setSearchTerm('');
    setFilterStatus('');
    setFilterFactory('');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Orçamentos</h2>
          <div className="text-sm text-gray-500 mt-1">
             <span className="font-semibold text-primary">{totalCount}</span> registros | Total: <span className="font-semibold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="flex items-center gap-2 bg-white px-3 py-2 border rounded-md shadow-sm">
              <span className="text-xs text-gray-500">De:</span>
              <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none"
              />
              <span className="text-xs text-gray-500">Até:</span>
              <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none"
              />
            </div>
            <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Busca</label>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Construtora, Obra..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          <Select 
              options={FACTORY_OPTIONS.map(f => ({ value: f, label: f }))}
              value={filterFactory}
              onChange={(e) => setFilterFactory(e.target.value)}
              placeholder="Todas as Fábricas"
              label="Filtro Fábrica"
          />
          <Select 
              options={QUOTE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="Todos os Status"
              label="Filtro Status"
          />
          <Select 
              label="Ordenação"
              options={[
                  { value: 'desc', label: 'Mais recentes' },
                  { value: 'asc', label: 'Mais antigos' }
              ]}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              placeholder="Selecione..."
          />
          <Button 
            variant="secondary" 
            onClick={clearFilters}
            className="w-full md:w-auto"
            title="Limpar todos os filtros"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Data", "Construtora / Obra", "Fábrica / Produto", "Valor", "Contato", "Status", "Ações"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredQuotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(parseISO(quote.date), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{quote.constructorName}</div>
                  <div className="text-sm text-gray-500">{quote.workName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm text-gray-900">{quote.factory}</div>
                   <div className="text-sm text-gray-500">{quote.product}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{quote.contactName}</div>
                  <div className="flex space-x-2 mt-1">
                    {quote.phone && (
                        <a href={`https://wa.me/55${quote.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-600">
                            <Phone className="w-4 h-4" />
                        </a>
                    )}
                    {quote.email && (
                        <a href={`mailto:${quote.email}`} className="text-blue-500 hover:text-blue-600">
                            <Mail className="w-4 h-4" />
                        </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${quote.status === QuoteStatus.FECHADO ? 'bg-green-100 text-green-800' : 
                      quote.status === QuoteStatus.PERDIDO ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button onClick={() => { setSelectedQuoteForFollowUp(quote); setIsFollowUpModalOpen(true); }} className="text-gray-400 hover:text-primary">
                        <MessageSquare className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleOpenModal(quote)} className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteQuote(quote.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </td>
              </tr>
            ))}
            {filteredQuotes.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Nenhum orçamento encontrado para este período.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingQuote ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input label="Construtora" required value={formData.constructorName || ''} onChange={e => setFormData({...formData, constructorName: e.target.value})} />
               <Input label="Obra" required value={formData.workName || ''} onChange={e => setFormData({...formData, workName: e.target.value})} />
               <Input type="date" label="Data" required value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
               <Input type="number" step="0.01" label="Valor R$" required value={formData.value || ''} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
               
               <Select 
                 label="Fábrica" 
                 required
                 options={FACTORY_OPTIONS.map(f => ({ value: f, label: f }))}
                 value={formData.factory || ''}
                 onChange={e => setFormData({...formData, factory: e.target.value as Factory, product: ''})} // Reset product
               />
               
               <Select 
                 label="Produto" 
                 required
                 options={formData.factory ? FACTORY_PRODUCTS[formData.factory as Factory].map(p => ({ value: p, label: p })) : []}
                 value={formData.product || ''}
                 onChange={e => setFormData({...formData, product: e.target.value})}
               />

               <Select 
                 label="Status" 
                 required
                 options={QUOTE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
                 value={formData.status || ''}
                 onChange={e => setFormData({...formData, status: e.target.value as QuoteStatus})}
               />

               <Input label="Nome Contato" required value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} />
               <Input label="Telefone" placeholder="(xx) xxxxx-xxxx" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
               <Input type="email" label="E-mail" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />

               <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-4">
                 <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                 <Button type="submit">Salvar</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {isFollowUpModalOpen && selectedQuoteForFollowUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-4">Follow-up: {selectedQuoteForFollowUp.constructorName}</h3>
            
            <div className="bg-gray-50 rounded-md p-4 mb-4 max-h-60 overflow-y-auto space-y-3">
              {selectedQuoteForFollowUp.followUps.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Sem histórico.</p>
              ) : (
                selectedQuoteForFollowUp.followUps.map(fu => (
                    <div key={fu.id} className="border-b pb-2 last:border-0">
                        <div className="text-xs text-gray-400 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(parseISO(fu.date), 'dd/MM/yyyy HH:mm')}
                        </div>
                        <p className="text-sm text-gray-800">{fu.note}</p>
                    </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddFollowUp}>
                <textarea 
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    placeholder="Adicionar nova observação..."
                    value={followUpNote}
                    onChange={e => setFollowUpNote(e.target.value)}
                    required
                ></textarea>
                <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsFollowUpModalOpen(false)}>Fechar</Button>
                    <Button type="submit">Adicionar</Button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
