# Academy Notes

Aplicativo acadêmico em React Native, TypeScript e Expo Router para gerenciar alunos, notas, disciplinas e rotina de estudos. Interface escura com cartões, destaques azuis e layout em Flexbox/StyleSheet.

## Executar

Use Node.js 22.13+ na linha 22 ou Node.js 24.3+ na linha 24, conforme os requisitos das dependências do Expo 58. O Node 25 pode emitir avisos de versão não suportada.

```bash
npm ci
npm start
```

Abra pelo Expo Go compatível com o SDK do projeto ou use `npm run web` no navegador. O login atual é demonstrativo: o botão de entrada abre uma sessão local, sem senha nem servidor de autenticação.

## 14 telas navegáveis

| Tela                  | Rota                 | Funcionalidade                                               |
| --------------------- | -------------------- | ------------------------------------------------------------ |
| Login                 | `/login`             | Entrada demonstrativa                                        |
| Dashboard             | `/`                  | Indicadores da turma e atalhos                               |
| Alunos                | `/alunos`            | Consulta, filtros e remoção confirmada de alunos             |
| Adicionar aluno       | `/novo-aluno`        | Cadastro de estudante                                        |
| Notas                 | `/notas`             | Seleção para lançamento                                      |
| Notas do aluno        | `/aluno/[id]`        | Editar notas entre 0 e 10, com ponto ou vírgula              |
| Relatórios            | `/relatorios`        | Desempenho acadêmico                                         |
| Configurações         | `/config`            | Informações e saída da sessão                                |
| Disciplinas           | `/disciplinas`       | Busca sem acentos e média por matéria                        |
| Detalhe da disciplina | `/disciplina/[nome]` | Notas dos alunos e acesso à edição                           |
| Agenda acadêmica      | `/agenda`            | Cadastro vinculado a aluno, filtros, conclusão e exclusão     |
| Plano de estudos      | `/plano-estudos`     | Revisão por aluno, prioridades, tempo e progresso            |
| Clima para sua rotina | `/clima`             | Clima real por cidade, previsão de 3 dias e atualização      |
| Previsão por horário  | `/previsao/[data]`   | Temperatura e chance de chuva por horário do dia selecionado |

Os arquivos `_layout.tsx` são layouts de navegação e não entram na contagem. As rotas dinâmicas contam como uma tela cada, independentemente da quantidade de alunos ou matérias.

## Comportamentos

- Disciplinas e médias são calculadas a partir das notas do estado do app.
- A agenda valida datas, ordena por prazo e destaca compromissos vencidos ou para hoje.
- O plano sugere 40 minutos para notas abaixo de 5, 30 para notas de 5 até abaixo de 7 e 20 para notas a partir de 7.
- Revisões concluídas são separadas por aluno e disciplina.
- A exclusão de um aluno também remove seus compromissos vinculados e revisões concluídas; notas ficam armazenadas no próprio registro do aluno.
- Compromissos antigos, criados antes do vínculo com aluno, são preservados como registros sem vínculo.
- Alunos, notas, agenda e revisões são restaurados do armazenamento local ao abrir o app. O tema e a última cidade também ficam salvos.

## Situação das aulas 9 e 10

O mínimo de telas e as integrações das aulas 9 e 10 estão implementados:

- **Aula 9 — API implementada:** consulta meteorológica real na API pública Open-Meteo, sem cadastro ou chave para uso acadêmico. Primeiro o app busca as coordenadas da cidade; depois consulta o clima e a previsão. A tela apresenta temperatura, sensação térmica, umidade, vento e previsão de 3 dias. A `FlatList` liga cada data ao detalhe por horário. Há atualização por botão e pull-to-refresh, carregamento, erro com nova tentativa e estado vazio. O serviço usa HTTPS, valida as respostas, cancela as chamadas ao sair da tela e limita a consulta completa a 12 segundos. Fontes: <https://open-meteo.com/en/docs> e <https://open-meteo.com/en/docs/geocoding-api>.
- **Aula 10 — persistência implementada:** wrapper tipado de AsyncStorage, `usePersistedState`, tema claro/escuro em Configurações, sessão restaurada antes da guarda de rota, splash durante a inicialização, alunos/notas/agenda/revisões persistidos e clima com cache local. Há validade de 5 minutos, apresentação imediata de cache antigo enquanto atualiza, aviso de dados salvos/offline e atualização ao reconectar. Uma sessão demonstrativa persistente não equivale a autenticação real.

## Verificações

```bash
npm test
npm run typecheck
npx expo export --platform web
```

Os 41 testes cobrem médias, notas e datas, busca, prioridades, Open-Meteo sem variável de chave, consulta por coordenadas, conversão de horários e condições meteorológicas, respostas inválidas, falhas HTTP, cancelamento, timeout, leitura corrompida, hidratação, reabertura, gravações concorrentes e cache offline.

## Armazenamento local — Aula 10

As chaves são versionadas com o prefixo `academy:v1:`. O app lê o disco antes de decidir a rota ou exibir os dados acadêmicos; os valores iniciais não são gravados por cima dos valores existentes durante a hidratação. Alterações consecutivas são gravadas em ordem.

| Informação                          | Onde fica    | Comportamento                                 |
| ----------------------------------- | ------------ | --------------------------------------------- |
| Sessão demonstrativa Admin          | AsyncStorage | Restaura ao abrir; removida ao sair           |
| Tema e última cidade                | AsyncStorage | Preferências do aparelho; preservadas ao sair |
| Alunos e notas                      | AsyncStorage | Dados acadêmicos locais; preservados ao sair  |
| Agenda e revisões concluídas        | AsyncStorage | Restauradas com os dados acadêmicos           |
| Clima por cidade e data da consulta | AsyncStorage | Cache válido por 5 minutos; removido ao sair  |

Se a leitura falhar ou o formato salvo for incompatível, o app mostra nova tentativa sem substituir os dados pelo padrão. Se uma gravação falhar, mantém o trabalho na memória e informa que ainda não foi salvo; o botão de nova tentativa grava o valor atual.

O login é único e demonstrativo; os dados acadêmicos pertencem ao espaço local do aparelho. Sair encerra a sessão e remove as consultas de clima, preservando o trabalho cadastrado. Não há sincronização entre celulares nem recuperação após desinstalar o app ou limpar seus dados.

O conjunto de dados e o cache são pequenos, por isso usam AsyncStorage. O login demonstrativo não utiliza senha nem token JWT. SecureStore é indicado para credenciais, e SQLite para dados que exijam consultas relacionais.

### Roteiro de teste no Android

1. Entre, cadastre um aluno, salve uma nota, adicione um compromisso e conclua uma revisão.
2. Em Configurações, altere o tema. Consulte uma cidade no Clima.
3. Com internet, feche e reabra o app: confirme a sessão, o tema, o aluno, a nota, o compromisso e a revisão.
4. Com o app já aberto, ative o modo avião e volte ao Clima: a última consulta aparece com aviso de dados salvos. Uma cidade nunca consultada exige internet.
5. Reconecte para atualizar a previsão. Use o botão Atualizar para forçar uma nova chamada antes dos 5 minutos.
6. Saia da conta e reabra: deve aparecer o login. Ao entrar novamente, o trabalho acadêmico continua salvo.

No Expo Go, a conexão com o servidor de desenvolvimento é necessária para carregar/recarregar o código. Faça o teste de modo avião com o app já carregado. A aparência da splash no Expo Go pode diferir de um aplicativo instalado, mas a leitura e a guarda de rota usam as mesmas flags de inicialização.

## Clima pronto para testar após clonar

O clima funciona sem configurar `.env`, criar conta ou obter chave. Basta ter internet, instalar as dependências e iniciar o Expo. A API pública do Open-Meteo permite esse uso acadêmico não comercial sem autenticação.

Para quem já tinha o projeto:

```bash
git pull origin main
npm ci
npm start -- --clear
```

No Expo Go, recarregue o projeto e abra Clima. Consulte, por exemplo, `Vassouras` ou `São Paulo, Brasil`. Separe a cidade e o estado ou país por vírgula quando precisar distinguir localidades com o mesmo nome.

A antiga variável `EXPO_PUBLIC_WEATHER_API_KEY` não é mais utilizada. Quem tiver um `.env.local` antigo pode mantê-lo sem afetar o clima. Nenhuma credencial acompanha o GitHub.

As condições e previsões vêm de modelos meteorológicos do Open-Meteo; as localidades vêm do GeoNames. Os códigos meteorológicos são apresentados em português. Sem conexão, o app mostra a consulta salva com um aviso; se não houver cache, informa que precisa de internet. O cache do novo provedor é separado do antigo, sem alterar alunos, notas, agenda, sessão ou preferências. As dicas de mochila usam os valores da previsão. A consulta usa a cidade digitada, sem permissão de GPS. Os horários e a data seguem a localidade consultada.

## Testar no celular com Expo Go

1. Instale uma versão do Expo Go compatível com o SDK 58 do projeto.
2. Conecte o computador e o celular à mesma rede Wi-Fi.
3. Na pasta do projeto execute `npm run start:phone` e leia o QR code pelo Expo Go (Android) ou pela câmera (iPhone).
4. Se o iPhone solicitar autenticação, entre com a mesma conta Expo no computador (`npx expo login`) e no Expo Go.
5. Se a rede bloquear a conexão e o Expo Go mostrar uma falha ao abrir o projeto, use `npm run start:tunnel` e escaneie o novo QR code. O projeto inclui `@expo/ngrok` como dependência de desenvolvimento para esse modo. O computador e o celular precisam de internet, mas podem estar em redes diferentes. O endereço do túnel muda ao reiniciar; use sempre o QR code do servidor atual.

A API externa usa HTTPS: a consulta do clima não precisa de servidor local, chave nem configuração do IP do computador. O servidor Expo ainda precisa estar acessível ao celular para carregar o aplicativo.

Confira no aparelho: login, menu horizontal, cadastro, notas com vírgula, agenda com teclado aberto, plano de estudos e clima. Consulte sua cidade, puxe a lista para atualizar e toque em uma data para abrir os horários. Teste reabertura, troca de tema e modo avião com o roteiro acima.

O layout protege as áreas de câmera/barra de status e de gestos, quebra cartões em telas estreitas e permite rolagem dos formulários. Exportações web e Android verificam a compilação; não substituem o teste físico de teclado, gestos e Expo Go.
