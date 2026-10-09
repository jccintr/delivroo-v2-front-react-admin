# Delivroo — Painel da loja (web)

Aplicativo web responsivo (celular, tablet e desktop) para o lojista gerenciar **pedidos, cardápio, adicionais/obrigatórios e configurações** da loja.
Stack: Vite + React 19 + Tailwind v4 (JavaScript). Consome a `delivroo-api-v2`.

## Rodando

```bash
npm install
cp .env.example .env     # em dev pode deixar VITE_API_URL vazio
npm run dev              # http://localhost:5174  (proxy de /api -> http://localhost:3000)
npm test                 # testes unitários (vitest)
npm run build            # gera dist/
```

Variáveis (`.env`):

| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | URL pública da API em produção (vazio em dev: o Vite faz proxy de `/api`) |
| `VITE_CLIENT_URL` | URL do cardápio do cliente; o link da loja é `VITE_CLIENT_URL/<slug>` |
| `VITE_API_PROXY` | (só dev) destino do proxy, padrão `http://localhost:3000` |

Se a API estiver em outra porta (ex.: `PORT=3111` no `.env` da API): `VITE_API_PROXY=http://localhost:3111 npm run dev`.

Deploy estático: `vercel.json` e `public/_redirects` já cuidam do roteamento SPA (Vercel/Netlify).

## O que o painel faz

- **Pedidos** — quadro com colunas *Novos / Em preparo / Prontos-A caminho / Finalizados* (no celular vira abas). Atualiza **em tempo real (SSE)** — pedido novo aparece na hora, também em outros aparelhos logados — com **aviso sonoro** (botão *Som*), selo no menu e contador no título da aba. Botões seguem o fluxo da API (entrega x retirada); recusar/cancelar pedem motivo. Cada mudança oferece **“Avisar no WhatsApp”** com a mensagem da loja. Detalhe com itens, opções, troco, histórico, **impressão de cupom 80 mm** e histórico por período/status com paginação.
- **Resumo** — faturamento, pedidos, ticket médio, não concluídos, faturamento por dia, pedidos por hora, mais vendidos, entrega x retirada, pagamentos e status (hoje, ontem, 7/30 dias, mês).
- **Cardápio** — produtos (foto, categoria, descrição, vários tamanhos/preços, disponível), categorias (ordem, ativar, renomear), e **grupos de adicionais e obrigatórios**: regra de escolha (obrigatório/opcional, mínimo, máximo, repetição da mesma opção, cobrar soma ou a mais cara), opções com foto, preço, padrão e **preço por tamanho**; vínculo dos grupos aos produtos.
- **Configurações** — link da loja (copiar/abrir), logo, nome, cores do cardápio, endereço, tempos de espera, PIX, horários de funcionamento (várias faixas por dia), bairros e taxas, formas de pagamento e mensagens de WhatsApp por status.
- **Assinatura** — situação (teste grátis de 14 dias, em dia, em atraso, suspensa), escolha/troca de plano, fatura em aberto com a **chave Pix do Delivroo** (copiar) e botão **Já paguei**, histórico de faturas e **Baixar meus dados**. Faixa de aviso no topo quando o teste/pagamento está perto de vencer ou em atraso (7 dias de carência). Com a assinatura **suspensa** o painel mostra só *Pedidos* (para concluir os em andamento) e *Assinatura*; o cardápio público fica fora do ar até o pagamento ser confirmado.
- Botão **Aberta/Fechada** sempre visível (abrir inicia um novo turno).

## Estrutura

```
src/api        cliente HTTP (token Bearer, 401 desloga) e wrappers dos endpoints
src/context    Auth, UI (toasts/confirmação) e Orders (SSE + polling de segurança + som)
src/components UI kit (Button, Modal/Sheet, Field, MoneyInput, ImageUpload…), AppShell, peças de pedido
src/pages      Pedidos, Resumo, menu/* (cardápio), settings/*
src/lib        dinheiro (centavos), telefone, datas, fluxo de status, regras de grupos
tests          unitários das regras (vitest)
```

Identidade visual (cores, fonte Baloo 2 e ícone) vem da landing page do Delivroo.

## Observações

- Valores em reais são convertidos para **centavos** antes de ir para a API.
- O som exige um clique do usuário (política dos navegadores): ligue o botão *Som* ao abrir o painel.
- Tempo real por **SSE**: `GET /api/stores/events` com token curto (`src/api/sse.js` reconecta com espera crescente e pega token novo). Indicador **Ao vivo / Reconectando…** no menu. Sem conexão ao vivo o painel volta a buscar a cada 12 s; com ela, só confere a cada 60 s por segurança.
- Push com o painel fechado (Web Push) ainda não existe: o aviso exige a aba aberta.
- Upload de imagens depende do Cloudinary configurado na API.
