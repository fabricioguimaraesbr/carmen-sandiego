# Onde Está Carmen Sandiego? — versão PT-BR para navegador

Recriação, com código novo, do jogo de detetive do Master System. Você é um agente da ACME e persegue a gangue V.I.L.E. pelo mundo: investiga locais, segue pistas, viaja entre cidades e emite um mandado de prisão antes do prazo.

- **30 cidades** com descrição, tesouro roubado e pistas próprias, além de 10 membros da V.I.L.E. com dossiê.
- **Animações em pixel art**: voos, caminhada até os locais, ataques de capangas, noite no hotel, carimbo do mandado, prisão e fuga.
- **Trilha sonora 8-bit original** gerada pelo navegador, com um tema por região do mundo e variações por cidade.
- **6 patentes** de Detetive Novato a Superdetetive, e o caso final contra a própria Carmen.
- **Salvamento automático na nuvem** cifrado, para continuar em qualquer aparelho, mais um código de backup manual.

## Como funciona o salvamento

```
 usuário + senha ──PBKDF2 (600 mil)──► 512 bits
                                       ├─ 256 bits → chave AES-GCM (cifra o progresso, nunca sai do aparelho)
                                       └─ 256 bits → token de acesso → servidor confere SHA-256(token) == SAVE_AUTH_HASH
```

- O Cloudflare guarda só um arquivo ilegível no KV.
- O jogo salva no aparelho a cada ação e envia para a nuvem alguns segundos depois. Sem internet, ele continua salvando no aparelho e envia quando a conexão volta.
- Quando dois aparelhos salvam ao mesmo tempo, vale o progresso mais recente.
- **Não existe "esqueci a senha"**. Se perder a senha, use o código de backup (Menu › Salvar progresso).

## Publicar no Cloudflare

O projeto roda como um **Cloudflare Worker com arquivos estáticos**: o mesmo Worker entrega o jogo e a API de salvamento.

1. **Conecte o repositório**: Workers & Pages › Create › Import a repository › `Carmen-Sandiego`. O nome do Worker precisa ser **`carmen-sandiego`**, igual ao `wrangler.toml`. Build command: deixe vazio. Deploy command: `npx wrangler deploy`.
2. **KV automático**: no primeiro deploy, o Cloudflare cria sozinho o armazenamento `SAVE`.
3. **Domínio (opcional)**: no Worker, Settings › Domains & Routes › Add › Custom domain.
4. **Primeiro acesso**: abra o site, vá em Menu › Salvamento na nuvem e entre com usuário e senha. O jogo mostra um **código**.
5. **Cadastre o código**: no Worker, Settings › Variables and Secrets › Add › tipo *Secret*, nome `SAVE_AUTH_HASH`, valor = o código › Deploy.
6. Volte ao jogo e toque em **Tentar de novo**. O indicador muda para **Sincronizado**. Nos outros aparelhos, entre com o mesmo usuário e senha.

> No iPhone: Safari › Compartilhar › **Adicionar à Tela de Início** para usar como app.
> Na TV LG (webOS): abra o endereço no navegador da TV.

## Desenvolvimento

```bash
npm install
echo "SAVE_AUTH_HASH=<código>" > .dev.vars   # opcional, para testar a nuvem
npx wrangler dev                             # jogo + API em http://localhost:8787
npm run typecheck                            # checa o Worker
```

### Estrutura

```
public/index.html          o jogo inteiro (HTML, CSS e JS num arquivo só)
public/icon*.{svg,png}     ícones e manifest para instalar como app
worker/index.ts            API de salvamento (GET/PUT /api/save, GET /api/status)
wrangler.toml              configuração do Worker, assets e KV
```

## Aviso

Projeto pessoal, sem fins comerciais. As mecânicas foram recriadas do zero, e toda a arte, música e texto deste repositório são originais. Carmen Sandiego é marca dos respectivos titulares.
