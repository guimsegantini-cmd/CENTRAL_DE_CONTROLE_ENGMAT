import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { isFirebaseConfigured } from '../lib/firebase';

export const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        if (isRegistering) {
            await register(email, password);
        } else {
            await login(email, password);
        }
    } catch (err) {
        // Error handled by context/displayed via error state
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-full mb-4">
            <Building2 className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CENTRAL DE CONTROLE</h1>
          <h2 className="text-lg font-medium text-gray-600">ENGMAT</h2>
        </div>
        
        {!isFirebaseConfigured && (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-xs">
                <strong>Modo Demo:</strong> Firebase não configurado. Dados serão salvos localmente. Use qualquer email e senha vazia.
            </div>
        )}

        {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="E-mail"
            type="email" 
            placeholder="seu@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          {isFirebaseConfigured && (
             <Input 
                label="Senha"
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={isFirebaseConfigured}
                minLength={6}
            />
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </Button>

          {isFirebaseConfigured && (
            <div className="text-center mt-4">
                <button 
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-sm text-primary hover:underline"
                >
                    {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
                </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};