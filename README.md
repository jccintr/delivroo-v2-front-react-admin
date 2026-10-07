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

- **Pedidos** — quadro com colunas *Novos / Em preparo / Prontos-A caminho / Finalizados* (no celular vira abas). Atualiza sozinho a cada 12 s, com **aviso sonoro** (botão *Som*), selo no menu e contador no título da aba. Botões seguem o fluxo da API (entrega x retirada); recusar/cancelar pedem motivo. Cada mudança oferece **“Avisar no WhatsApp”** com a mensagem da loja. Detalhe com itens, opções, troco, histórico, **impressão de cupom 80 mm** e histórico por período/status com paginação.
- **Resumo** — faturamento, pedidos, ticket médio, não concluídos, faturamento por dia, pedidos por hora, mais vendidos, entrega x retirada, pagamentos e status (hoje, ontem, 7/30 dias, mês).
- **Cardápio** — produtos (foto, categoria, descrição, vários tamanhos/preços, disponível), categorias (ordem, ativar, renomear), e **grupos de adicionais e obrigatórios**: regra de escolha (obrigatório/opcional, mínimo, máximo, repetição da mesma opção, cobrar soma ou a mais cara), opções com foto, preço, padrão e **preço por tamanho**; vínculo dos grupos aos produtos.
- **Configurações** — link da loja (copiar/abrir), logo, nome, cores do cardápio, endereço, tempos de espera, PIX, horários de funcionamento (várias faixas por dia), bairros e taxas, formas de pagamento e mensagens de WhatsApp por status.
- Botão **Aberta/Fechada** sempre visível (abrir inicia um novo turno).

## Estrutura

```
src/api        cliente HTTP (token Bearer, 401 desloga) e wrappers dos endpoints
src/context    Auth, UI (toasts/confirmação) e Orders (polling + som)
src/components UI kit (Button, Modal/Sheet, Field, MoneyInput, ImageUpload…), AppShell, peças de pedido
src/pages      Pedidos, Resumo, menu/* (cardápio), settings/*
src/lib        dinheiro (centavos), telefone, datas, fluxo de status, regras de grupos
tests          unitários das regras (vitest)
```

Identidade visual (cores, fonte Baloo 2 e ícone) vem da landing page do Delivroo.

## Observações

- Valores em reais são convertidos para **centavos** antes de ir para a API.
- O som exige um clique do usuário (política dos navegadores): ligue o botão *Som* ao abrir o painel.
- Ainda não há WebSocket/push: a atualização é por polling (12 s e ao voltar para a aba).
- Upload de imagens depende do Cloudinary configurado na API.
