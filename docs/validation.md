# Validação da extração

Baseline: /code/think/vendor/packages/modules/mediated-io/index.cjs.
SHA-256: 25e627aaf0421223124a46e9adad730058fbbd376b0a135e945565aa24fb2a22.

- Build com logostype fixado em acdcc6032ab94219e0d4a4d25b1538fb55fa19cf.
- 11 testes locais aprovados, sem falhas ou ignorados.
- 114 comparações com a implementação original: caminhos/grants e respostas/redirecionamentos de rede.
- Instalação do tarball em diretório isolado, sem scripts de instalação, seguida de importação aprovada.
- Núcleo importado com imports node: bloqueados.
- Cliente de eventos testado com arquivos reais autorizados e implementação em memória.

Isso não prova equivalência para todas as entradas, execução em QuickJS/ESP32 ou integração no runtime completo.

## Caracteres

Inclui espaços, comentários e quebras de linha. Exclui documentação, testes, build, wrappers e JavaScript gerado.

| Fontes | Caracteres |
| --- | ---: |
| Original index.cjs | 7.115 |
| Todos os quatro .type | 8.844 |
| .type sem a interface nova events.type | 7.498 |

O total aumentou 1.729 caracteres, ou 24,30%. Sem events.type, aumentou 383, ou 5,38%.
Não houve economia de fonte nesta extração. A versão anterior já usava diversas instruções por linha; a nova estrutura separa responsabilidades e adiciona contratos por eventos.
O tamanho instalado também inclui o JavaScript compilado e não corresponde à contagem de fonte.
