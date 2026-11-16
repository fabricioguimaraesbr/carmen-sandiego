# CLAUDE.md — regras do projeto (Carmen Sandiego PT-BR)

Contexto para o Claude (e para quem mais contribuir). Leia antes de alterar o código.

## O que é
Recriação do jogo Carmen Sandiego (Master System) em português do Brasil, jogável no navegador, publicada como **Cloudflare Worker com assets estáticos** (`wrangler.toml`, API em `worker/`).
O jogo inteiro fica em `public/index.html` (sem build). O Worker só serve os arquivos e a API de salvamento.

## Regras invioláveis
- **Perguntar antes de decidir**: o dono do projeto quer ser consultado sobre funcionalidades e escolhas de design antes da implementação.
- Todo texto do jogo em **português do Brasil**.
- **Nada de arte, sprites, músicas ou textos copiados do jogo original**. Mecânicas podem ser recriadas; o conteúdo é sempre original. A personagem Carmen não é desenhada: suspeitos aparecem como silhueta.
- O progresso vai para a nuvem **sempre cifrado** (AES-GCM com chave derivada de usuário + senha, PBKDF2 600 mil). Nunca enviar senha, chave ou progresso em texto aberto, nem logar esses valores.
- O salvamento passa por `save()` (local + agenda o envio à nuvem). Não grave no `localStorage` direto.
- Mudou o formato do estado (`S.player` / `S.caso`)? Mantenha compatibilidade com saves antigos (nuvem, `localStorage` e código `CSB1-`).

## Fluxo de trabalho
- Commits pequenos, em português, no formato `tipo: descrição` (`feat`, `fix`, `refactor`, `docs`, `chore`).
- O Cloudflare (Workers Builds) publica a `main` automaticamente.
- Não é projeto Pages: nada de `functions/` nem `wrangler pages`. Testar local com `npx wrangler dev`.
- Antes de commitar: `npm run typecheck` e jogar um caso completo no `wrangler dev` (sem erros no console).

## Visual e som
- Mistura de pixel art 8-bit (cenas em canvas 160×90, fonte Press Start 2P) com interface moderna escura.
- Paleta: fundo `#0f1420`, vermelho `#e0393e`, dourado `#f2c14e`, verde `#3ecf8e`.
- Música chiptune sintetizada com Web Audio (`THEMES` + `CITY_THEME`): um tema por região, com variação de tom e andamento por cidade.
- Mobile first: testar em 390px; navegação inferior.
