

## Correção dos Erros de Build

O projeto tem vários problemas que precisam ser corrigidos:

### Problemas Identificados

1. **Dependência `socket.io-client` ausente** - O arquivo `services/socketClient.ts` importa `socket.io-client`, mas ela nao esta no `package.json`.
2. **Dependência `@types/react` e `@types/react-dom` ausentes** - Sem os tipos do React, todos os arquivos `.tsx` geram erros de TypeScript.
3. **Dependência `@supabase/supabase-js` ausente** - Foi mencionada anteriormente mas nao esta no `package.json`.
4. **Porta do servidor incorreta** - `vite.config.ts` usa porta 3000, mas o Lovable exige porta 8080.
5. **Script `build:dev` ausente** - Necessario para o Lovable compilar o projeto.
6. **Arquivo de lock ausente** - Necessario para garantir versoes consistentes.

### Plano de Implementacao

**Passo 1: Atualizar `package.json`**
- Adicionar `socket.io-client` nas dependencies
- Adicionar `@types/react` e `@types/react-dom` nos devDependencies
- Adicionar `@supabase/supabase-js` nas dependencies
- Adicionar script `"build:dev": "vite build --mode development"`

**Passo 2: Atualizar `vite.config.ts`**
- Mudar a porta do servidor de 3000 para 8080

**Passo 3: Atualizar `tsconfig.json`**
- Adicionar `"strict": false` e `"noImplicitAny": false` para evitar erros de tipo implicito `any` nos arquivos existentes que nao tem tipagem completa

Essas mudancas devem resolver todos os erros de build de uma vez.

