import React, { useState } from 'react'
import { supabase } from '../config/supabase'
import { Mail, Lock, LogIn, KeyRound, ArrowLeft } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState('')
  
  // Controle de qual tela estamos vendo
  const [modoRecuperar, setModoRecuperar] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    
    if (error) {
      console.error("ERRO DO SUPABASE:", error.message)
      if (error.message.includes('Email not confirmed')) {
        setError('E-mail não confirmado! Confirme no painel do Supabase.')
      } else if (error.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos. Verifique a digitação.')
      } else {
        setError(`Erro: ${error.message}`)
      }
    }
    setLoading(false)
  }

  async function handleRecuperarSenha(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSucesso('')

    // Pede pro Supabase enviar o e-mail e voltar pro link atual do site
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, 
    })

    if (error) {
      setError(`Erro ao enviar: ${error.message}`)
    } else {
      setSucesso('Link de recuperação enviado! Verifique sua caixa de entrada (e o Spam).')
      setSenha('') // Limpa a senha por segurança
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

        {error && <div className="error-msg">{error}</div>}
        {sucesso && <div className="error-msg" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>{sucesso}</div>}

        {/* TELA DE RECUPERAÇÃO DE SENHA */}
        {modoRecuperar ? (
          <form onSubmit={handleRecuperarSenha}>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Digite seu e-mail abaixo. Enviaremos um link para você redefinir sua senha com segurança.
            </p>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <div className="input-with-icon">
                <Mail size={20} />
                <input 
                  type="email" 
                  required 
                  placeholder="Seu e-mail de acesso" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', marginBottom: '15px' }}>
              {loading ? 'Enviando...' : <><KeyRound size={20}/> Enviar Link</>}
            </button>

            <button type="button" onClick={() => { setModoRecuperar(false); setError(''); setSucesso(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
              <ArrowLeft size={16}/> Voltar para o Login
            </button>
          </form>

        ) : (
          /* TELA DE LOGIN NORMAL */
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <div className="input-with-icon">
                <Mail size={20} />
                <input 
                  type="email" 
                  required 
                  placeholder="E-mail" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <div className="input-with-icon">
                <Lock size={20} />
                <input 
                  type="password" 
                  required 
                  placeholder="Senha" 
                  value={senha} 
                  onChange={e => setSenha(e.target.value)} 
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
              {loading ? 'Entrando...' : <><LogIn size={20}/> Entrar no Sistema</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button type="button" onClick={() => { setModoRecuperar(true); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'underline' }}>
                Esqueci minha senha
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}