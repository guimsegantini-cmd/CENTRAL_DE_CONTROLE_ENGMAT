import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Order, Factory, OrderStatus } from '../types';
import { FACTORY_OPTIONS, FACTORY_PRODUCTS, ORDER_STATUS_OPTIONS, PAYMENT_TERMS_OPTIONS, format, parseISO, differenceInDays, isAfter, startOfMonth, endOfMonth, addDays } from '../constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Search, Trash2, Edit2, AlertTriangle, FileCheck, X } from 'lucide-react';

export const Orders: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder, getLeadTime } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFactory, setFilterFactory] = useState('');

  // Form State
  const initialFormState: Partial<Order> = {
    factory: Factory.ALUMBRA,
    status: OrderStatus.AGUARDANDO_DIGITACAO,
    sendDate: format(new Date(), 'yyyy-MM-dd'),
    isManualDeliveryDate: false,
    statusDate: new Date().toISOString()
  };
  const [formData, setFormData] = useState<Partial<Order>>(initialFormState);

  // Billing Form State
  const [billingData, setBillingData] = useState({
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    paymentTerms: PAYMENT_TERMS_OPTIONS[0],
    commissionRate: 5
  });
  const [orderToBill, setOrderToBill] = useState<Order | null>(null);

  // Auto-calculate delivery date effect for form
  useEffect(() => {
    if (isModalOpen && !formData.isManualDeliveryDate && formData.product && formData.sendDate) {
        const days = getLeadTime(formData.product);
        const newDate = addDays(parseISO(formData.sendDate), days);
        setFormData(prev => ({
            ...prev,
            deliveryDate: format(newDate, 'yyyy-MM-dd')
        }));
    }
  }, [formData.product, formData.sendDate, formData.isManualDeliveryDate, isModalOpen, getLeadTime]);

  // Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const oDate = o.sendDate;
      const matchDate = oDate >= startDate && oDate <= endDate;

      const matchSearch = 
        o.constructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.product.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus ? o.status === filterStatus : true;
      const matchFactory = filterFactory ? o.factory === filterFactory : true;

      return matchDate && matchSearch && matchStatus && matchFactory;
    });
  }, [orders, startDate, endDate, searchTerm, filterStatus, filterFactory]);

  const totalValue = filteredOrders.reduce((acc, o) => acc + Number(o.value), 0);
  const totalQty = filteredOrders.reduce((acc, o) => acc + Number(o.quantity), 0);

  const getStatusAlert = (order: Order) => {
    const daysSinceStatus = differenceInDays(new Date(), parseISO(order.statusDate));
    if (order.status === OrderStatus.AGUARDANDO_DIGITACAO && daysSinceStatus > 5) {
        return <span title="Aguardando > 5 dias" className="flex items-center text-red-500 font-bold ml-2"><AlertTriangle className="w-4 h-4 mr-1"/>!</span>;
    }
    if (order.status === OrderStatus.CREDITO && daysSinceStatus > 2) {
        return <span title="Crédito > 2 dias" className="flex items-center text-red-500 font-bold ml-2"><AlertTriangle className="w-4 h-4 mr-1"/>!</span>;
    }
    return null;
  };

  const getDeliveryStatus = (order: Order) => {
      if (!order.systemForecast || !order.deliveryDate) return null;
      if (isAfter(parseISO(order.systemForecast), parseISO(order.deliveryDate))) {
          return <span className="text-red-500 font-bold ml-1" title="Atraso previsto!">(Atrasado)</span>
      }
      return null;
  };

  const handleOpenModal = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setFormData(order);
    } else {
      setEditingOrder(null);
      // Calculate initial date for new order
      const initialProduct = FACTORY_PRODUCTS[Factory.ALUMBRA][0];
      const initialSendDate = format(new Date(), 'yyyy-MM-dd');
      const leadTime = getLeadTime(initialProduct);
      
      setFormData({
          ...initialFormState,
          product: initialProduct,
          sendDate: initialSendDate,
          deliveryDate: format(addDays(parseISO(initialSendDate), leadTime), 'yyyy-MM-dd'),
          statusDate: new Date().toISOString()
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let statusDate = formData.statusDate;
    if (editingOrder && editingOrder.status !== formData.status) {
        statusDate = new Date().toISOString();
    }
    if (!editingOrder) {
        statusDate = new Date().toISOString();
    }

    const orderToSave = {
      ...formData,
      id: editingOrder ? editingOrder.id : crypto.randomUUID(),
      value: Number(formData.value),
      quantity: Number(formData.quantity),
      statusDate: statusDate
    } as Order;

    if (editingOrder) {
      updateOrder(orderToSave);
    } else {
      addOrder(orderToSave);
    }
    setIsModalOpen(false);
  };

  const openBillingModal = (order: Order) => {
    setOrderToBill(order);
    setBillingData({
        invoiceDate: format(new Date(), 'yyyy-MM-dd'),
        paymentTerms: PAYMENT_TERMS_OPTIONS[0],
        commissionRate: order.commissionRate || 3
    });
    setIsBillingModalOpen(true);
  };

  const handleBillingSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToBill) return;

    const updatedOrder: Order = {
        ...orderToBill,
        status: OrderStatus.FATURADO,
        statusDate: new Date().toISOString(),
        invoiceDate: billingData.invoiceDate,
        paymentTerms: billingData.paymentTerms,
        commissionRate: Number(billingData.commissionRate)
    };

    updateOrder(updatedOrder);
    setIsBillingModalOpen(false);
    setOrderToBill(null);
  };

  const clearFilters = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    setSearchTerm('');
    setFilterStatus('');
    setFilterFactory('');
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pedidos</h2>
          <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-4">
             <span>Registros: <strong className="text-primary">{filteredOrders.length}</strong></span>
             <span>Total: <strong className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</strong></span>
             <span>Qtd: <strong>{totalQty}</strong></span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
             <div className="flex items-center gap-2 bg-white px-3 py-2 border rounded-md shadow-sm">
              <div className="relative">
                  <span className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">De</span>
                  <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-sm bg-transparent focus:outline-none h-8"
                  />
              </div>
              <div className="relative">
                  <span className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">Até</span>
                  <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-sm bg-transparent focus:outline-none h-8"
                  />
              </div>
            </div>
            <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" /> Novo Pedido
            </Button>
        </div>
      </div>

       {/* Filters */}
       <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Busca</label>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Construtora, OC, Produto..." 
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
              options={ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="Todos os Status"
              label="Filtro Status"
          />
          <Button 
            variant="secondary" 
            onClick={clearFilters}
            className="w-full md:w-auto"
            title="Limpar todos os filtros"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </div>

       {/* Table */}
       <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Envio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OC / Construtora</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fábrica / Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtd / Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrega Prevista</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prev. Sistema</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(parseISO(order.sendDate), 'dd/MM/yyyy')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{order.poNumber}</div>
                  <div className="text-xs text-gray-500">{order.constructorName} - {order.workName}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                   <div className="text-sm text-gray-900">{order.factory}</div>
                   <div className="text-xs text-gray-500">{order.product}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{order.quantity} un.</div>
                  <div className="text-sm font-medium text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    <span className={order.isManualDeliveryDate ? 'text-blue-600 font-semibold' : ''}>
                        {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
                    </span>
                    {order.isManualDeliveryDate && <span title="Manual" className="ml-1 text-xs text-blue-400">(M)</span>}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold
                            ${order.status === OrderStatus.LIBERADO ? 'bg-green-100 text-green-800' : 
                            order.status === OrderStatus.CANCELADO ? 'bg-red-100 text-red-800' : 
                            order.status === OrderStatus.FATURADO ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                            {order.status}
                        </span>
                        {getStatusAlert(order)}
                   </div>
                   <div className="text-xs text-gray-400 mt-1">
                       Desde: {format(parseISO(order.statusDate), 'dd/MM')}
                   </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    {order.systemForecast ? format(parseISO(order.systemForecast), 'dd/MM/yyyy') : '-'}
                    {getDeliveryStatus(order)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    {order.status !== OrderStatus.FATURADO && order.status !== OrderStatus.CANCELADO && (
                        <button 
                            onClick={() => openBillingModal(order)} 
                            className="text-green-600 hover:text-green-900"
                            title="Faturar Pedido"
                        >
                            <FileCheck className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={() => handleOpenModal(order)} className="text-blue-600 hover:text-blue-900" title="Editar">
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteOrder(order.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </td>
              </tr>
            ))}
             {filteredOrders.length === 0 && (
                <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">Nenhum pedido encontrado.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

       {/* Edit/Add Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
             <h3 className="text-lg font-bold mb-4">{editingOrder ? 'Editar Pedido' : 'Novo Pedido'}</h3>
             <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="Construtora" required value={formData.constructorName || ''} onChange={e => setFormData({...formData, constructorName: e.target.value})} />
                 <Input label="Obra" required value={formData.workName || ''} onChange={e => setFormData({...formData, workName: e.target.value})} />
                 <Input label="Ordem de Compra (Op)" placeholder="Gerado autom. se vazio" value={formData.poNumber || ''} onChange={e => setFormData({...formData, poNumber: e.target.value})} />
                 
                 <Input type="date" label="Data de Envio" required value={formData.sendDate || ''} onChange={e => setFormData({...formData, sendDate: e.target.value})} />
                 
                 <div className="space-y-1">
                     <Input 
                        type="date" 
                        label="Data Prev. Entrega" 
                        required 
                        value={formData.deliveryDate || ''} 
                        onChange={e => setFormData({...formData, deliveryDate: e.target.value, isManualDeliveryDate: true})} 
                     />
                     <div className="flex items-center text-xs text-gray-500 mt-1">
                        <input 
                            type="checkbox" 
                            id="manualOverride"
                            className="mr-2 h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                            checked={formData.isManualDeliveryDate || false}
                            onChange={(e) => {
                                const isManual = e.target.checked;
                                setFormData(prev => {
                                    const newData = {...prev, isManualDeliveryDate: isManual};
                                    // If unchecking, immediately recalc based on current product/sendDate
                                    if (!isManual && newData.product && newData.sendDate) {
                                        const days = getLeadTime(newData.product);
                                        newData.deliveryDate = format(addDays(parseISO(newData.sendDate!), days), 'yyyy-MM-dd');
                                    }
                                    return newData;
                                });
                            }}
                        />
                        <label htmlFor="manualOverride">Definir manualmente</label>
                     </div>
                 </div>

                 <Select 
                    label="Fábrica" 
                    required
                    options={FACTORY_OPTIONS.map(f => ({ value: f, label: f }))}
                    value={formData.factory || ''}
                    onChange={e => setFormData({...formData, factory: e.target.value as Factory, product: ''})}
                 />

                <Select 
                    label="Produto" 
                    required
                    options={formData.factory ? FACTORY_PRODUCTS[formData.factory as Factory].map(p => ({ value: p, label: p })) : []}
                    value={formData.product || ''}
                    onChange={e => setFormData({...formData, product: e.target.value})}
                />

                <Input type="number" label="Quantidade" required value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                <Input type="number" step="0.01" label="Valor Total R$" required value={formData.value || ''} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                
                <Select 
                    label="Status" 
                    required
                    options={ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
                    value={formData.status || ''}
                    onChange={e => setFormData({...formData, status: e.target.value as OrderStatus})}
                />

                <Input type="date" label="Previsão do Sistema" value={formData.systemForecast || ''} onChange={e => setFormData({...formData, systemForecast: e.target.value})} />

                <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </div>
             </form>
          </div>
        </div>
       )}

       {/* Billing Modal */}
       {isBillingModalOpen && orderToBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4 text-green-600">
                <FileCheck className="w-6 h-6" />
                <h3 className="text-lg font-bold">Faturar Pedido</h3>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                <p><strong>Obra:</strong> {orderToBill.constructorName} - {orderToBill.workName}</p>
                <p><strong>Valor:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderToBill.value)}</p>
            </div>
            <form onSubmit={handleBillingSave} className="space-y-4">
                <Input 
                    type="date" 
                    label="Data do Faturamento" 
                    required 
                    value={billingData.invoiceDate} 
                    onChange={e => setBillingData({...billingData, invoiceDate: e.target.value})} 
                />
                
                <Select 
                    label="Condição de Pagamento" 
                    required
                    options={PAYMENT_TERMS_OPTIONS.map(o => ({ value: o, label: o }))}
                    value={billingData.paymentTerms}
                    onChange={e => setBillingData({...billingData, paymentTerms: e.target.value})}
                />

                <Input 
                    type="number" 
                    step="0.1" 
                    label="Comissão (%)" 
                    required 
                    value={billingData.commissionRate} 
                    onChange={e => setBillingData({...billingData, commissionRate: Number(e.target.value)})} 
                />

                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="ghost" onClick={() => setIsBillingModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">Confirmar Faturamento</Button>
                </div>
            </form>
          </div>
        </div>
       )}
    </div>
  );
};
