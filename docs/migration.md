# Migração

A extração mantém nomes das sete classes exportadas pelo entrypoint anterior.
A implementação agora está em quatro arquivos .type. index.cjs mantém CommonJS.
core.cjs não importa APIs Node e expõe createMediatedIO, createEventClient, createDispatcher e classes de erro/segredo.

O consumidor Node pode substituir a dependência pelo repositório sem mudar a construção das classes.
O host precisa optar pelo cliente de eventos para remover objetos específicos de Node do seu código.

A cópia incorporada em /code/think não é substituída por esta publicação. A integração no perfil/runtime será uma etapa separada.
Não há módulo auto-registrado, migração do launcher, implementação Rust ou validação em ESP32/QuickJS nesta entrega.

## Limites herdados

As verificações realpath e a operação de arquivo são separadas: não há proteção contra troca concorrente de symlinks (TOCTOU).
O adaptador não é uma sandbox para código Node arbitrário. Código com acesso direto a fs pode contorná-lo.
O host é responsável por impedir APIs não mediadas e manter o contexto de autoridade.
Não adicionar novas operações destrutivas ao protocolo sem contrato e testes.

## Validação

Testes originais preservados, regressões de limites, fluxo de eventos com disco e memória e importação do núcleo com APIs nativas bloqueadas.
check-legacy compara resolução de caminhos e redes com o pacote original. Não prova equivalência de todas as entradas.
A CI cobre Linux/macOS e Node 18/22.
