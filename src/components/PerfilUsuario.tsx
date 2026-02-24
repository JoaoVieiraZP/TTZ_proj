import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { User, Lock, UploadCloud, Save, CheckCircle2 } from 'lucide-react'

export function PerfilUsuario({ session }: { session: any }) {
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ texto: '', tipo: '' })

  // Puxa os dados que já estão salvos no seu usuário do Supabase
  useEffect(() => {
    if (session?.user?.user_metadata) {
      setNome(session.user.user_metadata.nome || '')
      setFotoUrl(session.user.user_metadata.foto_url || '')
    }
  }, [session])

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setLoading(true)
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `perfil-${session.user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatares/${fileName}`

      // 1. Envia a imagem para o bucket 'fotos' do Supabase
      const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, file)
      if (uploadError) throw uploadError

      // 2. Pega o link permanente da imagem que acabou de subir
      const { data } = supabase.storage.from('fotos').getPublicUrl(filePath)
      
      setFotoUrl(data.publicUrl)
      setMsg({ texto: 'Foto carregada! Clique em Salvar para confirmar.', tipo: 'sucesso' })
    } catch (error: any) {
      setMsg({ texto: `Erro no upload: ${error.message}`, tipo: 'erro' })
    } finally {
      setLoading(false)
    }
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg({ texto: '', tipo: '' })

    // Prepara as informações para atualizar
    const updates: any = { data: { nome, foto_url: fotoUrl } }
    if (senha) updates.password = senha // Só atualiza a senha se você digitou alguma coisa

    // Manda pro Supabase
    const { error } = await supabase.auth.updateUser(updates)

    if (error) {
      setMsg({ texto: `Erro ao salvar: ${error.message}`, tipo: 'erro' })
    } else {
      setMsg({ texto: 'Perfil e acesso atualizados com sucesso!', tipo: 'sucesso' })
      setSenha('') // Limpa o campo de senha por segurança
    }
    setLoading(false)
  }

  return (
    <div className="table-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User size={24} color="var(--primary)"/> Meu Perfil e Acesso
      </h3>
      
      {msg.texto && (
        <div className={`error-msg`} style={{ background: msg.tipo === 'sucesso' ? 'var(--success)' : 'var(--danger)', color: '#fff', border: 'none' }}>
          {msg.tipo === 'sucesso' && <CheckCircle2 size={20} style={{ marginRight: '8px' }} />}
          {msg.texto}
        </div>
      )}

      <form onSubmit={salvarPerfil}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt="Perfil" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', padding: '3px' }} />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed var(--border)' }}>
              <User size={50} color="var(--text-muted)" />
            </div>
          )}
          
          <div>
            <input type="file" id="foto-upload" accept="image/*" onChange={handleUploadFoto} style={{ display: 'none' }} disabled={loading} />
            <label htmlFor="foto-upload" className="btn-primary" style={{ background: 'var(--secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', fontSize: '0.9rem' }}>
              <UploadCloud size={18} /> {loading ? 'Enviando...' : 'Mudar Foto'}
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>E-mail de Acesso (Login)</label>
          <input type="email" value={session?.user?.email || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O e-mail principal não pode ser alterado por aqui.</span>
        </div>

        <div className="form-group">
          <label>Nome de Exibição</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Como você quer ser chamado?" />
        </div>

        <div className="form-group" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <label style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} /> Redefinir Senha
          </label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Deixe em branco se não quiser mudar" />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '20px', padding: '15px', fontSize: '1.1rem' }}>
          <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  )
}