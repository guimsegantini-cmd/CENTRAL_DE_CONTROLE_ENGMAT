import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { FACTORY_OPTIONS, FACTORY_PRODUCTS } from '../constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Factory } from '../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useData();
  const [leadTimes, setLeadTimes] = useState<Record<string, number>>({});
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Flatten settings to local state
    const lt: Record<string, number> = {};
    const tg: Record<string, number> = {};

    Object.keys(FACTORY_PRODUCTS).forEach(factory => {
        FACTORY_PRODUCTS[factory as Factory].forEach(prod => {
            lt[prod] = settings.products[prod]?.leadTimeDays || 15;
        });
        tg[factory] = settings.targets[factory]?.monthlyTarget || 0;
    });

    setLeadTimes(lt);
    setTargets(tg);
  }, [settings]);

  const handleSave = () => {
    const newSettings = { ...settings };
    
    // Update Lead Times
    Object.entries(leadTimes).forEach(([prod, days]) => {
        if (!newSettings.products[prod]) newSettings.products[prod] = { leadTimeDays: 0 };
        newSettings.products[prod].leadTimeDays = Number(days);
    });

    // Update Targets
    Object.entries(targets).forEach(([factory, val]) => {
        if (!newSettings.targets[factory]) newSettings.targets[factory] = { monthlyTarget: 0 };
        newSettings.targets[factory].monthlyTarget = Number(val);
    });

    updateSettings(newSettings);
    setSuccessMsg('Configurações salvas com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </div>
      
      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMsg}
        </div>
      )}

      {/* Metas */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">Metas Mensais por Representada (R$)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FACTORY_OPTIONS.map(factory => (
                <div key={factory}>
                    <Input 
                        label={factory} 
                        type="number"
                        value={targets[factory] || 0}
                        onChange={(e) => setTargets({...targets, [factory]: Number(e.target.value)})}
                    />
                </div>
            ))}
        </div>
      </div>

      {/* Prazos */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">Prazos de Produção Padrão (Dias)</h3>
        <div className="space-y-6">
            {FACTORY_OPTIONS.map(factory => (
                <div key={factory} className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-semibold text-primary mb-3">{factory}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FACTORY_PRODUCTS[factory as Factory].map(product => (
                            <div key={product}>
                                <Input 
                                    label={product}
                                    type="number"
                                    value={leadTimes[product] || 15}
                                    onChange={(e) => setLeadTimes({...leadTimes, [product]: Number(e.target.value)})}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
