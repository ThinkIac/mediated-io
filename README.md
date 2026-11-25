# Mediated I/O

I/O autorizado para pacotes do Lógos, escrito em [LogosType](https://github.com/ThinkIac/LogosType). Preserva a API CommonJS anterior e separa política de autoridade do adaptador Node.

## Instalar

```sh
npm install ThinkIac/mediated-io#main
```

Para instalações reproduzíveis, substitua `main` por um commit. O build usa um commit fixo do compilador; JavaScript gerado acompanha o pacote. Node 18+ para o adaptador e as ferramentas de build.

## Capacidades preservadas

| API | Comportamento |
| --- | --- |
| PackageFiles | readFile, readdir, writeFile e mkdir; autorização, grants e resolução de symlinks |
| PackageNetwork | fetch autorizado por origem/método e novamente em cada redirecionamento |
| PackageSecrets | handles congelados, serialização redigida e consumo explícito por withValue |
| PackageProcess | executable/argv/cwd/env autorizados, shell bloqueado e registro no EffectScope |

```js
const {PackageFiles} = require('@thinkiac/module-mediated-io');
const files = new PackageFiles(host, 'meu-pacote');
const text = await files.readFile('data/config.json', 'utf8');
```

O host fornece autoridade; este pacote não concede permissões sozinho.

## Acesso por eventos

O protocolo novo cobre arquivos com valores simples: texto UTF-8, listas de nomes e null para operações sem resultado. Rede, segredos e processos mantêm a API de compatibilidade; ainda não têm protocolo portável neste pacote.

```js
const {createEventClient, createDispatcher} =
  require('@thinkiac/module-mediated-io/core.cjs');
const request = createDispatcher({files}); // vinculado ao pacote autenticado
const client = createEventClient(request);
await client.writeText('data/message.txt', 'Olá');
console.log(await client.readText('data/message.txt'));
```

O mesmo cliente aceita um transporte para implementação em memória ou Rust. O transporte deve preservar o contexto autenticado do chamador. Nunca aceite um owner fornecido pelo payload.

Uso no .type, depois de o host conectar os eventos:

```coffee
config = await $('files::event:readText', {path: 'data/config.json'})
```

Os nomes acima são contratos deste adaptador. Não são eventos instalados automaticamente no runtime atual.

## Estrutura e fluxo

```text
.type consumidor → request(evento, payload)
                        ↓
              dispatcher do pacote autenticado
                        ↓
              PackageFiles → autoridade/grants
                        ↓
                adaptador da plataforma
```

- `src/core.type`: políticas, arquivos, rede e segredos, com capacidades injetadas.
- `src/process.type`: política e ciclo de vida dos processos.
- `src/events.type`: cliente e dispatcher de arquivos.
- `src/index.type`: adaptador Node, único fonte que importa APIs nativas.
- `dist/*.cjs`: resultado do build, não editar manualmente.

## Desenvolver

```sh
npm ci
npm test
node scripts/check-legacy.cjs /caminho/do/mediated-io-original
npm pack --dry-run
```

Consulte [contratos](docs/contracts.md) e [migração e limites](docs/migration.md). MIT.
