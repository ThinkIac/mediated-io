# Contratos

## Host

Todas as classes recebem `(host, owner)`. O owner é determinado pelo host, nunca por dados não confiáveis.

- enforce(owner, surface, operation, resource, metadata?): autoriza ou lança erro.
- packageRoot(owner): diretório absoluto do pacote.
- grantsFor(owner): files e process normalizados.
- resolveSecret(name, owner): valor ou Promise.
- fetch(url, init): implementação opcional por host.
- activeScope(owner): EffectScope ativo.
- trackProcess(scope, child, label): registra encerramento do subprocesso.

Grants files: `{root, access: 'read'|'write'|'read-write'}`.
Grants process: `{executable, args: ['literal','*'], cwd: ['data'], env: ['SAFE']}`.
O wildcard de argv corresponde a exatamente um argumento.

## Arquivos

Caminhos relativos ao pacote. Caminhos absolutos, NUL e segmentos .. são rejeitados.
O host autoriza primeiro; o módulo verifica o grant e os caminhos reais da raiz e do alvo.
Escritas em alvos novos verificam o ancestral existente. Não há criação automática de diretórios por writeFile.
A verificação de grant usa a convenção existente de prefixo; o host deve normalizar roots.

## Rede

Método normalizado para maiúsculas. Redirect manual; status 301/302/303/307/308.
Cada nova origem é autorizada. URLs com username/password são rejeitadas.
Mantém método e init originais nos redirects, inclusive 303, por compatibilidade.
Limite herdado: até 11 requests, depois RESOURCE_BOUNDARY_DENIED.
Não altera headers entre origens; quem concede destinos deve considerar headers sensíveis.
Retorna Response da plataforma; não é um contrato JSON portável.

## Segredos

get autoriza e retorna SecretHandle. Resolução é adiada até withValue(consumer).
withValue retorna Promise. Valor não entra em toString/toJSON; o consumer pode expô-lo e deve ser confiável.
Não há revogação adicional implícita dentro de withValue.

## Processos

spawn retorna ChildProcess da plataforma Node. Bloqueia shell, valida argv, cwd real e nomes de env.
Não herda process.env: apenas env explicitamente fornecido.
Se não houver EffectScope, encerra o filho e lança PROCESS_BOUNDARY_DENIED.
Timeout, limite de saída e cancelamento estruturado não são implementados aqui.

## Eventos de arquivos

| Evento | Payload | Retorno |
| --- | --- | --- |
| files::event:readText | {path: string} | string UTF-8 |
| files::event:writeText | {path: string, text: string} | null |
| files::event:list | {path: string} | string[] |
| files::event:mkdir | {path: string, recursive?: boolean} | null |

Dispatcher valida tipos e usa uma allowlist, sem invocação dinâmica de propriedades.
Não serializa erros: o transporte deve preservar name/code/message, sem stack ou segredos para outros domínios.
Erros de política: RESOURCE_BOUNDARY_DENIED e PROCESS_BOUNDARY_DENIED.
AUTHORITY_DENIED e erros do sistema de arquivos continuam vindo do host/adaptador.

## Implementar outra plataforma

createEventClient(request) é a interface mínima recomendada. Um provedor Rust pode implementar diretamente os quatro contratos com suas próprias verificações de autoridade.
createMediatedIO(platform) reutiliza a política existente, mas requer primitivas síncronas de fs/path compatíveis, spawn e URL/fetch. Não é uma ABI Rust nem um runtime embarcado.
