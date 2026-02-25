import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Save, X, UploadCloud, User } from 'lucide-react'

export function CadastroFilho({ filhoEditando, onSucesso, onCancelar }: any) {
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [dataEntrada, setDataEntrada] = useState('')
  const [isento, setIsento] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState(10) // <--- ESTADO DO VENCIMENTO
  const [fotoUrl, setFotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (filhoEditando) {
      setNome(filhoEditando.nome)
      setDataNascimento(filhoEditando.data_nascimento?.split('T')[0] || '')
      setDataEntrada(filhoEditando.data_entrada?.split('T')[0] || '')
      setIsento(filhoEditando.isento || false)
      setDiaVencimento(filhoEditando.dia_vencimento || 10) // <--- PUXA O DIA NA EDIÇÃO
      setFotoUrl(filhoEditando.foto_url || '')
    }
  }, [filhoEditando])

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `membro-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `membros/${fileName}`

      const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('fotos').getPublicUrl(filePath)
      setFotoUrl(data.publicUrl)
    } catch (error: any) {
      alert(`Erro ao subir a foto: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const dados = { 
      nome, 
      data_nascimento: dataNascimento, 
      data_entrada: dataEntrada,
      isento,
      dia_vencimento: Number(diaVencimento), // <--- SALVA NO BANCO
      foto_url: fotoUrl, 
      ativo: true 
    }

    if (filhoEditando) {
      await supabase.from('filhos').update(dados).eq('id', filhoEditando.id)
    } else {
      await supabase.from('filhos').insert([dados])
    }
    
    setLoading(false)
    onSucesso()
  }

  return (
    <form onSubmit={salvar} style={{ padding: '10px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '10px' }}>
        {fotoUrl ? (
          <img src={fotoUrl} alt="Foto do Membro" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
        ) : (
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
            <User size={40} color="var(--text-muted)" />
          </div>
        )}
        
        <div>
          <input type="file" id="foto-membro" accept="image/*" onChange={handleUploadFoto} style={{ display: 'none' }} disabled={uploading} />
          <label htmlFor="foto-membro" className="btn-primary" style={{ background: 'var(--bg-sub)', color: 'var(--text-dark)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <UploadCloud size={16} /> {uploading ? 'Enviando...' : 'Escolher Foto'}
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Nome Completo do Membro</label>
        <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Pedro Vieira" />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Data de Nascimento</label>
          <input type="date" required value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Data de Entrada na Casa</label>
          <input type="date" required value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} />
        </div>
      </div>

      {/* === LINHA DO VENCIMENTO E ISENÇÃO === */}
      <div className="form-row" style={{ alignItems: 'center', marginTop: '10px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Dia de Vencimento</label>
          <input type="number" min="1" max="31" required value={diaVencimento} onChange={e => setDiaVencimento(Number(e.target.value))} placeholder="Ex: 10" />
        </div>
        
        <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', margin: 0 }}>
          <input type="checkbox" id="isento" checked={isento} onChange={e => setIsento(e.target.checked)} style={{ width: '22px', height: '22px', cursor: 'pointer' }} />
          <label htmlFor="isento" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            Isento de Mensalidade
          </label>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button type="button" onClick={onCancelar} className="btn-primary" style={{ background: 'var(--text-muted)' }}>
          <X size={20}/> Cancelar
        </button>
        <button type="submit" disabled={loading || uploading} className="btn-primary">
          <Save size={20}/> {loading ? 'Salvando...' : 'Salvar Ficha'}
        </button>
      </div>
    </form>
  )
}