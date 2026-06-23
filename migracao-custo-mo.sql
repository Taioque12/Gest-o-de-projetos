-- ============================================================
-- MIGRAÇÃO: custo_dia em funcionarios
-- Adiciona coluna custo_dia (R$/dia) à tabela funcionarios para
-- calcular custo de mão de obra previsto vs realizado por OS.
-- Rodar no SQL Editor do Supabase (projeto uaooutzbxkkcyfuwijbi)
-- Data: 2026-06-23
-- ============================================================

alter table public.funcionarios
  add column if not exists custo_dia numeric(10,2) default 0;
