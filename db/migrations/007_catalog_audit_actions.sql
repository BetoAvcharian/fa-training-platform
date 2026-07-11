-- ============================================================
-- 007_catalog_audit_actions.sql
-- Extiende el enum audit_action con las acciones que introduce el
-- dominio catalog. Migración separada porque ALTER TYPE ... ADD VALUE no
-- puede usarse en la misma transacción en la que el valor nuevo ya se
-- referencia (evita mezclarlo dentro de 004/005/006).
-- ============================================================

alter type audit_action add value 'catalog.observable_create';
alter type audit_action add value 'catalog.item_hidden';
