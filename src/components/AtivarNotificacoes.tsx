import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { Bell, BellRing, CheckCircle2, AlertCircle } from "lucide-react";

const VAPID_PUBLIC_KEY = "BHFmp1-YzkviNyQbvO3BAJrAVc6x6m417IlgHtWfolx4tvbaPPc15qOvNnP6HgJdZIv7WWHWr_FONsCvzB8FgGQ";

// Traduz a chave para o formato que o navegador entende
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AtivarNotificacoes() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "unsupported">("idle");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Verifica se o navegador suporta notificações Push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus("unsupported");
      return;
    }

    // Verifica se este telemóvel já está cadastrado para receber alertas
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      }
    });
  }, []);

  async function assinarNotificacoes() {
    setStatus("loading");
    try {
      // 1. Regista o Fantasminha (Service Worker)
      const register = await navigator.serviceWorker.register('/sw.js');
      
      // 2. Pede permissão à Apple/Google e gera as chaves únicas do telemóvel
      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subJSON = subscription.toJSON();
      
      if (!subJSON.endpoint || !subJSON.keys) throw new Error("Falha ao gerar chaves.");

      // 3. Guarda as chaves na nossa tabela nova do Supabase
      const { error } = await supabase.from('push_subscriptions').insert([{
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth,
        dispositivo: navigator.userAgent
      }]);

      if (error) throw error;

      setStatus("success");
      setIsSubscribed(true);
    } catch (error: any) {
      console.error(error);
      setStatus("error");
    }
  }

  // Se o navegador não suportar, nem mostra o botão
  if (status === "unsupported") return null; 

  // Se já estiver ativo, mostra apenas um selo de confirmação
  if (isSubscribed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 'bold', fontSize: '0.9rem', padding: '15px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--success)' }}>
        <BellRing size={20} /> Alertas de Aniversário Ativos neste Celular
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid #8b5cf6', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.1rem' }}>
        <Bell size={22} /> Receber Alertas de Aniversário
      </div>
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Ative para que este celular receba os avisos (Push) de aniversariantes da Corrente automaticamente.
      </p>
      
      <button 
        onClick={assinarNotificacoes}
        disabled={status === "loading"}
        style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '5px' }}
      >
        {status === "loading" && "Ativando..."}
        {status === "idle" && "Ativar Notificações neste Aparelho"}
        {status === "error" && <><AlertCircle size={18} /> Erro ao ativar. Tente novamente.</>}
        {status === "success" && <><CheckCircle2 size={18} /> Ativado com sucesso!</>}
      </button>
    </div>
  );
}