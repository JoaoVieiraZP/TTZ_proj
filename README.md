# 🕊️ TTZ Gestão

![Status](https://img.shields.io/badge/Status-Produção-success)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

Um sistema de gestão web completo e responsivo, desenvolvido com o objetivo de modernizar as operações financeiras e administrativas do Terreiro de Umbanda Baiana Terezinha e Zé Pelintra (TTZ).

O projeto nasceu para resolver problemas reais de controle de caixa e prestação de contas, substituindo processos manuais por um fluxo de dados automatizado, seguro e de fácil visualização.

## ⚙️ Como Funciona (Visão Geral)

O sistema opera em duas frentes principais: um painel administrativo no frontend e rotinas autônomas no backend.

- **Dashboard Financeiro Dinâmico:** Uma interface que compila entradas, saídas e saldos em tempo real. A lógica de filtragem é capaz de reconstruir o cenário exato de meses anteriores.
- **Gestão Lógica da Corrente:** O motor de cobrança calcula a adimplência respeitando rigorosamente o ciclo de vida do usuário (cruzando `data_entrada` e `data_saida`), evitando que membros inativos ou futuros apareçam em relatórios passados.
- **Centro de Custos Específicos:** Módulos paralelos para isolar a arrecadação e os gastos de festas e eventos fechados.
- **Exportação Nativa:** Algoritmos client-side que processam os dados da tela e geram balancetes detalhados em formato PDF, além de resumos formatados para o WhatsApp.
- **Automação de Fechamento (CRON):** Um serviço de background que acorda todo dia 1º, compila o desempenho financeiro do mês encerrado, monta um template HTML e dispara o balancete oficial por e-mail para a diretoria.

## 🛠️ Tecnologias e Arquitetura

O software foi arquitetado separando claramente as responsabilidades de interface e infraestrutura:

### Frontend (Client-Side)
- **React + TypeScript:** Base da aplicação garantindo tipagem forte, prevenção de bugs em tempo de compilação e componentização da interface.
- **Lucide React:** Biblioteca otimizada de iconografia.
- **jsPDF & AutoTable:** Utilizados para desenhar e renderizar documentos PDF complexos diretamente no navegador, poupando processamento do servidor.

### Backend & Infraestrutura (BaaS)
- **Supabase (PostgreSQL):** Banco de dados relacional responsável pelo armazenamento seguro e integridade das relações entre membros, mensalidades e despesas.
- **Edge Functions (Deno/TypeScript):** Microserviços serverless isolados. O `robo-fechamento` executa regras de negócio pesadas e requisições HTTP externas de forma segura.
- **pg_cron:** Gatilho agendador direto no banco de dados, garantindo a execução de rotinas autônomas sem a necessidade de um servidor 24/7.
- **Brevo API (SMTP):** Serviço integrado no backend para assegurar a entrega confiável dos e-mails transacionais gerados pelo sistema.

---
*Desenvolvido por **[João Vieira](https://www.linkedin.com/in/jo%C3%A3o-pedro-vieira-pereira-7aab772b1?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app)***
