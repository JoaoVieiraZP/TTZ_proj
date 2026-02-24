import React, { useState } from 'react'
import { supabase } from '../config/supabase'
import { Lock, Mail, AlertCircle, LogIn } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.')
    }
    
    setLoading(false)
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="brand-container">
          <img src="/logo.png" alt="Logo TTZ" className="brand-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h2>TTZ GESTÃO</h2>
          <h5>Terreiro de Umbanda <br /> Baiana Terezinha e Zé Pelintra</h5>
        </div>
        
        <form onSubmit={handleLogin} style={{ marginTop: '20px' }}>
          {error && (
            <div className="error-msg">
              <AlertCircle size={20}/> 
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-group">
            <label>E-mail de Acesso</label>
            <div className="input-with-icon">
              <Mail size={20} className="input-icon" />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="contato@terreiro.com" 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Senha de Segurança</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '25px', padding: '16px' }}>
            <LogIn size={20} />
            {loading ? 'Validando acesso...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}