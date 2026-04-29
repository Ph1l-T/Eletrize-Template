# Roadmap - Criador e Editor de Cenarios

Este arquivo registra as melhorias planejadas para modernizar o criador/editor de cenarios.

## Prioridade 1

- Trocar descricoes tecnicas por frases visuais de acao, como `Ligar Lustre da Sala`.
- Substituir o campo generico `Valor (opcional)` por controles especificos:
  - slider para intensidade de luz;
  - slider para volume;
  - seletor de temperatura para ar-condicionado;
  - botoes diretos para cortinas e midia.
- Permitir reordenar, remover, duplicar e testar cada acao isoladamente.

## Prioridade 2

- Transformar o fluxo em um montador guiado:
  1. ambiente;
  2. tipo de dispositivo;
  3. dispositivo;
  4. acao;
  5. parametros da acao.
- Usar uma folha inferior/modal no mobile para escolher dispositivos e acoes.
- Agrupar a lista de acoes por ambiente e numerar cada etapa.

## Prioridade 3

- Criar modelos prontos de cenarios:
  - Cinema;
  - Chegada;
  - Dormir;
  - Sair de casa;
  - Jantar;
  - Festa;
  - Relaxar.
- Melhorar cards da lista de cenarios com icone, quantidade de acoes, ambientes usados e menu de opcoes.
- Adicionar tela de revisao antes de salvar.

## Observacoes tecnicas

- Manter compatibilidade com Supabase/localStorage.
- Manter controle de acesso por ambiente/dispositivo.
- Preservar o formato atual de `steps` ou criar migracao suave se o schema precisar evoluir.
