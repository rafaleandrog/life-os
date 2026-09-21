-- ════════════════════════════════════════════════════════════════════════════════════
-- Separação de Impostos / Despesas Financeiras no rótulo de categoria (categoria_app)
--
-- mov_app() jogava em 'Miscelaneous' toda despesa cujo categoria_geral não estivesse na
-- whitelist de seis grupos, o que na prática era TODO o grupo 'Despesas Financeiras':
-- impostos, empréstimos e transferências familiares acabavam na mesma fatia cinza, sem
-- grupo visual próprio na tela de Fluxo. Aqui esse grupo se abre em quatro categorias.
--
-- A função roda no INSERT (chamada por processar_staging, nos dois caminhos: cartão e
-- conta) e não há trigger — por isso trocá-la só vale para linhas novas, e o UPDATE do
-- passo 3 é necessário para reclassificar o histórico.
--
-- O app não depende deste backfill: assets/state/movimentacoes.js deriva a mesma
-- categoria no cliente, a partir de (categoria_geral, categoria_especifica). Depois de
-- rodar isto, banco e cliente passam a produzir exatamente os mesmos rótulos — é o
-- que o passo 4 confere.
--
-- Rodar por inteiro no SQL Editor do Supabase. Tudo dentro de uma transação.
-- ════════════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1) guarda o estado anterior, para conferência e rollback ────────────────────────
create table if not exists mov_app_backup_20260921 as
  select id, categoria_app from movimentacoes;

-- ── 2) nova regra ──────────────────────────────────────────────────────────────────
-- 'Investimento' ganha rótulo próprio por clareza; ele já fica fora dos cards de
-- orçamento pelo grupo_fluxo, definido em mov_fluxo() — este é só o nome que aparece.
-- O 'else' final deixa de ser 'Miscelaneous': hoje a classificação só produz os grupos
-- da whitelist ou 'Despesas Financeiras', então ele só dispara se um categoria_geral
-- novo aparecer — e aí 'Outros' diz a verdade, em vez de esconder o caso novo.
-- Receitas ficam exatamente como estavam.
create or replace function public.mov_app(p_tipo text, p_geral text, p_esp text)
 returns text
 language sql
 immutable
as $function$
  select case when p_tipo = 'despesa' then
           case when p_geral in ('Alimentação','Transporte','Saúde','Educação','Moradia','Entretenimento') then p_geral
                when p_geral = 'Despesas Financeiras' then
                  case p_esp
                    when 'Impostos'               then 'Impostos'
                    when 'Empréstimo'             then 'Dívidas e Empréstimos'
                    when 'Empréstimo pago'        then 'Dívidas e Empréstimos'
                    when 'Transferência Familiar' then 'Transferência Familiar'
                    when 'Investimento'           then 'Investimento'
                    else 'Despesas Financeiras'   -- Taxas e Tarifas, Serviços Digitais, Outros
                  end
                else 'Outros' end
         else case p_esp when 'Salário' then 'Salário' when 'Dividendos / Rendimentos' then 'Rendimentos' else 'Outras fontes de renda' end end
$function$;

-- ── 3) backfill do histórico ───────────────────────────────────────────────────────
update movimentacoes
   set categoria_app  = public.mov_app(tipo, categoria_geral, categoria_especifica),
       atualizado_em  = now()
 where categoria_app is distinct from public.mov_app(tipo, categoria_geral, categoria_especifica);

-- ── 4) conferências: nada aqui pode falhar ─────────────────────────────────────────
do $$
declare v_falhas int; v_miscelaneous int; v_soma_antes numeric; v_soma_depois numeric;
begin
  -- 4a) nenhuma linha fora da nova regra
  select count(*) into v_falhas from movimentacoes
   where categoria_app is distinct from public.mov_app(tipo, categoria_geral, categoria_especifica);
  if v_falhas > 0 then raise exception 'backfill incompleto: % linha(s) fora da regra', v_falhas; end if;

  -- 4b) 'Miscelaneous' não existe mais
  select count(*) into v_miscelaneous from movimentacoes where categoria_app = 'Miscelaneous';
  if v_miscelaneous > 0 then raise exception 'ainda restam % linhas em Miscelaneous', v_miscelaneous; end if;

  -- 4c) o dinheiro que estava em Miscelaneous continua todo lá dentro dos grupos novos
  select coalesce(sum(m.valor), 0) into v_soma_antes
    from movimentacoes m join mov_app_backup_20260921 b on b.id = m.id
   where b.categoria_app = 'Miscelaneous';
  select coalesce(sum(valor), 0) into v_soma_depois from movimentacoes
   where categoria_app in ('Impostos','Dívidas e Empréstimos','Transferência Familiar','Despesas Financeiras','Investimento');
  if v_soma_antes <> v_soma_depois then
    raise exception 'soma não bate: antes % / depois %', v_soma_antes, v_soma_depois;
  end if;

  -- 4d) nenhuma receita mudou de rótulo
  select count(*) into v_falhas
    from movimentacoes m join mov_app_backup_20260921 b on b.id = m.id
   where m.tipo = 'receita' and m.categoria_app is distinct from b.categoria_app;
  if v_falhas > 0 then raise exception '% receita(s) mudaram de categoria_app', v_falhas; end if;

  raise notice 'OK: backfill consistente, % reclassificadas, R$ % preservados',
    (select count(*) from movimentacoes m join mov_app_backup_20260921 b on b.id = m.id
      where m.categoria_app is distinct from b.categoria_app), v_soma_depois;
end $$;

commit;

-- ── conferência visual (rodar depois do commit) ────────────────────────────────────
-- select categoria_app, count(*) qtd, sum(valor)::numeric(14,2) total
--   from movimentacoes group by 1 order by 3 desc;

-- ── rollback, se precisar ──────────────────────────────────────────────────────────
-- begin;
--   update movimentacoes m set categoria_app = b.categoria_app
--     from mov_app_backup_20260921 b where b.id = m.id and m.categoria_app is distinct from b.categoria_app;
--   -- e reaplicar a versão anterior da função:
--   create or replace function public.mov_app(p_tipo text, p_geral text, p_esp text)
--    returns text language sql immutable as $f$
--     select case when p_tipo='despesa' then
--              case when p_geral in ('Alimentação','Transporte','Saúde','Educação','Moradia','Entretenimento') then p_geral else 'Miscelaneous' end
--            else case p_esp when 'Salário' then 'Salário' when 'Dividendos / Rendimentos' then 'Rendimentos' else 'Outras fontes de renda' end end
--   $f$;
-- commit;
-- drop table mov_app_backup_20260921;   -- só depois de conferir que está tudo certo
