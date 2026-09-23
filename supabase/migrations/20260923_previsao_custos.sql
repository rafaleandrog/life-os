-- Previsão de custos futuros: parcelas de cartão + pagamentos recorrentes da conta.
--
-- 1) Parcelas — reescritas. A versão anterior agrupava por mes_compra estimado a partir de
--    data_compra_original (que já é a data da compra) MENOS (parcela_atual-1), o que jogava
--    a série vários meses para trás, e fazia AVG do valor, somando séries distintas com a
--    mesma descrição. Resultado: previsão inflada e "inconsistente".
--    Agora a série é (descricao_normalizada, total_parcelas, mes_origem) com
--    mes_origem = ano_mes − (parcela_atual−1), e a previsão sai só da ÚLTIMA parcela vista:
--    faltam = total_parcelas − parcela_atual, valor = valor dessa última parcela.
--    Série "desatualizada" = ainda faltavam parcelas, mas a fatura mais recente importada do
--    emissor já não a trouxe (quitada antecipadamente / renomeada) — fica fora da previsão.
--
-- 2) Recorrentes — pagamentos da conta (pix, boleto, transferência) que se repetem:
--    mesmo favorecido (1ª palavra da descrição sem o prefixo "pix enviado"/"boleto"/…) +
--    mesma categoria específica, em ≥3 dos últimos 6 meses fechados, e visto em um dos
--    últimos 2 meses fechados ou no mês corrente. Valor previsto = mediana mensal.
--    No mês corrente, prevê só o que ainda falta (mediana − já pago no mês).
--
-- 3) v_previsao_custos — união das duas fontes, uma linha por item × mês, já com categoria.

drop view if exists public.v_previsao_custos;
drop view if exists public.v_recorrentes_ativos;
drop view if exists public.v_parcelas_previsao_mensal;
drop view if exists public.v_parcelas_previsao;
drop view if exists public.v_parcelas_ativas;

create view public.v_parcelas_ativas with (security_invoker = true) as
with base as (
  select m.*,
         to_date(m.ano_mes || '-01', 'YYYY-MM-DD') as mes_ref,
         (to_date(m.ano_mes || '-01', 'YYYY-MM-DD') - make_interval(months => m.parcela_atual - 1))::date as mes_origem
    from public.movimentacoes m
   where m.meio = 'cartao' and m.tipo = 'despesa'
     and m.total_parcelas > 1 and m.parcela_atual between 1 and m.total_parcelas
), ref_emissor as (
  select user_id, emissor, max(to_date(ano_mes || '-01', 'YYYY-MM-DD')) as mx
    from public.movimentacoes
   where meio = 'cartao' and origem <> 'consolidado'
   group by 1, 2
), ref_geral as (
  select user_id, max(mx) as mx from ref_emissor group by 1
), qtd as (
  select user_id, descricao_normalizada, total_parcelas, mes_origem, count(*) as qtd_linhas,
         array_agg(distinct emissor) as emissores
    from base group by 1, 2, 3, 4
), ult as (
  select distinct on (user_id, descricao_normalizada, total_parcelas, mes_origem) *
    from base
   order by user_id, descricao_normalizada, total_parcelas, mes_origem, parcela_atual desc, ano_mes desc
)
select u.user_id,
       u.descricao_normalizada || ':' || u.total_parcelas || ':' || to_char(u.mes_origem, 'YYYY-MM') as chave,
       u.descricao,
       u.categoria_geral, u.categoria_especifica, u.categoria_app, u.grupo_fluxo,
       u.emissor, q.emissores,
       u.mes_origem,
       u.valor as valor_parcela,
       u.parcela_atual as parcelas_pagas,
       u.total_parcelas,
       greatest(u.total_parcelas - u.parcela_atual, 0) as faltam,
       u.mes_ref as ultimo_mes_pago,
       case when u.total_parcelas > u.parcela_atual
            then (u.mes_ref + make_interval(months => u.total_parcelas - u.parcela_atual))::date end as vai_pagar_ate,
       round((u.total_parcelas - u.parcela_atual) * u.valor, 2) as divida_futura,
       u.total_parcelas <= u.parcela_atual as quitada,
       (u.total_parcelas > u.parcela_atual
        and u.mes_ref < coalesce(case when u.emissor in ('nao_identificado', 'varios') then null else r.mx end, g.mx)) as desatualizada,
       false as inconsistente,
       q.qtd_linhas
  from ult u
  join qtd q using (user_id, descricao_normalizada, total_parcelas, mes_origem)
  left join ref_emissor r on r.user_id = u.user_id and r.emissor = u.emissor
  join ref_geral g on g.user_id = u.user_id;

create view public.v_parcelas_previsao with (security_invoker = true) as
select p.user_id, p.chave, p.descricao, p.categoria_geral, p.categoria_especifica, p.categoria_app,
       p.grupo_fluxo, p.inconsistente,
       (p.ultimo_mes_pago + make_interval(months => k))::date as mes_previsto,
       p.valor_parcela as valor_previsto,
       (p.parcelas_pagas + k) as parcela_prevista,
       p.total_parcelas
  from public.v_parcelas_ativas p
  cross join lateral generate_series(1, p.faltam) k
 where p.faltam > 0 and not p.desatualizada
   and (p.ultimo_mes_pago + make_interval(months => k)) >= date_trunc('month', current_date);

create view public.v_parcelas_previsao_mensal with (security_invoker = true) as
select user_id, mes_previsto, round(sum(valor_previsto), 2) as total_previsto,
       count(*) as qtd_parcelas, bool_or(inconsistente) as tem_inconsistente
  from public.v_parcelas_previsao
 group by user_id, mes_previsto;

create view public.v_recorrentes_ativos with (security_invoker = true) as
with base as (
  select m.user_id, m.data, m.valor, m.descricao, m.categoria_geral, m.categoria_especifica,
         m.categoria_app, m.grupo_fluxo,
         to_date(m.ano_mes || '-01', 'YYYY-MM-DD') as mes,
         coalesce(nullif(split_part(btrim(regexp_replace(
           regexp_replace(coalesce(m.descricao_normalizada, ''),
             '^(pix enviado|pix agendado|pix|boleto|pagamento de boleto|pagamento|transferencia enviada|transferencia|ted|doc|debito automatico|deb aut)\s+', ''),
           '[^a-z ]', ' ', 'g')), ' ', 1), ''), coalesce(m.descricao_normalizada, '?')) as favorecido
    from public.movimentacoes m
   where m.meio = 'conta' and m.tipo = 'despesa' and m.grupo_fluxo <> 'investimento'
), serie as (
  select user_id, categoria_especifica, favorecido, mes, sum(valor) as total
    from base group by 1, 2, 3, 4
), jan as (
  select date_trunc('month', current_date)::date as atual,
         (date_trunc('month', current_date) - interval '6 months')::date as ini,
         (date_trunc('month', current_date) - interval '2 months')::date as recente
), agg as (
  select s.user_id, s.categoria_especifica, s.favorecido,
         count(*) filter (where s.mes >= j.ini and s.mes < j.atual) as meses_janela,
         max(s.mes) as ultimo_mes,
         percentile_cont(0.5) within group (order by s.total) filter (where s.mes >= j.ini and s.mes < j.atual) as mediana,
         coalesce(sum(s.total) filter (where s.mes = j.atual), 0) as pago_mes_atual
    from serie s cross join jan j
   group by 1, 2, 3
), recente as (
  select distinct on (user_id, categoria_especifica, favorecido) *
    from base order by user_id, categoria_especifica, favorecido, data desc
)
select a.user_id,
       a.categoria_especifica || ':' || a.favorecido as chave,
       r.descricao, r.categoria_geral, a.categoria_especifica, r.categoria_app, r.grupo_fluxo,
       a.favorecido, a.meses_janela, a.ultimo_mes,
       round(a.mediana::numeric, 2) as valor_mensal,
       round(a.pago_mes_atual, 2) as pago_mes_atual
  from agg a
  join recente r using (user_id, categoria_especifica, favorecido)
  cross join jan j
 where a.meses_janela >= 3 and a.ultimo_mes >= j.recente;

create view public.v_previsao_custos with (security_invoker = true) as
select user_id, mes_previsto, 'parcela'::text as fonte, chave, descricao,
       categoria_geral, categoria_especifica, categoria_app, grupo_fluxo,
       valor_previsto, parcela_prevista || '/' || total_parcelas as detalhe
  from public.v_parcelas_previsao
union all
select r.user_id, (date_trunc('month', current_date) + make_interval(months => k))::date,
       'recorrente', r.chave, r.descricao,
       r.categoria_geral, r.categoria_especifica, r.categoria_app, r.grupo_fluxo,
       case when k = 0 then greatest(r.valor_mensal - r.pago_mes_atual, 0) else r.valor_mensal end,
       'mediana de ' || r.meses_janela || ' meses'
  from public.v_recorrentes_ativos r
  cross join generate_series(0, 11) k;

grant select on public.v_parcelas_ativas, public.v_parcelas_previsao, public.v_parcelas_previsao_mensal,
                public.v_recorrentes_ativos, public.v_previsao_custos to authenticated;
