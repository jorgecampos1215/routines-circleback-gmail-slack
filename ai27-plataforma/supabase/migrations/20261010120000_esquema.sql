-- AI27 · Plataforma de operación de custodia
-- Esquema inicial para Supabase (Postgres). Pégalo en el SQL Editor de tu proyecto y ejecútalo,
-- o corre `supabase db push` con la CLI (también lo hace el workflow "AI27 · Migrar y cargar Supabase").

create extension if not exists "pgcrypto";

-- ───────────────────────── Catálogos operativos ─────────────────────────
create table if not exists zonas (
  nombre text primary key,
  plantilla int not null default 0,
  disponibles int not null default 0
);

create table if not exists clientes (
  nombre text primary key,
  sector text,
  contacto text,
  correo text,
  telefono text,
  servicios_activos int default 0,
  servicios_trimestre int default 0,
  ingresos_mes numeric default 0,
  margen numeric default 0,
  incidentes int default 0,
  portal_en_vivo boolean default false,
  desde text,
  cxc numeric default 0,
  dias_cobro int default 0,
  creado timestamptz default now()
);

create table if not exists custodios (
  id text primary key,
  nombre text not null,
  zona text references zonas(nombre),
  base text,
  estatus text not null check (estatus in ('Disponible','Asignado','En servicio','Descanso','Vacaciones','Incapacidad','Baja')),
  asignacion text,
  horas_semana int default 0,
  calificacion numeric default 0,
  docs text,
  documentos jsonb default '[]'::jsonb,
  telefono text,
  ingreso date,
  servicios_acumulados int default 0,
  incidentes int default 0,
  certificaciones text[] default '{}',
  portacion boolean default false,
  turnos text,
  actualizado timestamptz default now()
);

create table if not exists unidades (
  id text primary key,
  vehiculo text,
  placas text,
  zona text references zonas(nombre),
  custodio text,
  servicio text,
  gps text check (gps in ('Samsara','Ruptela')),
  poliza text,
  poliza_vence date,
  verificacion text,
  estatus text check (estatus in ('Operando','Disponible','En taller','Siniestrada','Baja')),
  km int default 0,
  rendimiento numeric default 0,
  costo_mes numeric default 0,
  anio int,
  vin text
);

create table if not exists ordenes_taller (
  id text primary key,
  unidad text references unidades(id),
  tipo text check (tipo in ('Preventivo','Correctivo')),
  falla text,
  proveedor text,
  costo numeric default 0,
  dias_fuera int default 0,
  estatus text check (estatus in ('Abierta','Cerrada','En aseguradora')),
  fecha date
);

create table if not exists cargas_combustible (
  id bigserial primary key,
  unidad text references unidades(id),
  fecha date,
  litros numeric,
  costo numeric,
  km_gps int,
  rendimiento numeric,
  anomalo boolean default false
);

create table if not exists servicios (
  id text primary key,
  cliente text,
  tipo text check (tipo in ('Por evento','Dedicado','Monitoreo')),
  zona text,
  ruta text,
  estatus text check (estatus in ('Cotizado','Confirmado','En tránsito','Entregado','Con incidente','Cerrado')),
  custodios text,
  unidad text,
  monitorista text,
  inicio timestamptz,
  monto numeric default 0,
  fuente text check (fuente in ('Samsara','Ruptela')),
  creado timestamptz default now()
);

create table if not exists incidentes (
  id text primary key,
  fecha date,
  hora text,
  tipo text,
  carretera text,
  zona text,
  servicio text,
  cliente text,
  resultado text,
  valor_carga numeric default 0,
  valor_recuperado numeric default 0,
  tiempo_reaccion_min int default 0
);

create table if not exists colaboradores (
  id text primary key,
  nombre text not null,
  area text,
  puesto text,
  sede text,
  zona text,
  ingreso date,
  sueldo numeric default 0,
  vacaciones_disponibles int default 0,
  estatus text check (estatus in ('Activo','Baja')) default 'Activo'
);

-- Telemetría normalizada (Samsara + Ruptela): la que llena src/lib/telemetria.ts
create table if not exists eventos_telemetria (
  id bigserial primary key,
  fuente text check (fuente in ('samsara','ruptela')),
  tipo text,
  unidad text,
  lat double precision,
  lng double precision,
  velocidad int,
  fecha timestamptz default now()
);
create index if not exists eventos_telemetria_fecha on eventos_telemetria (fecha desc);

-- ───────────────────────── Estado del demo (lo que crea el usuario) ─────────────────────────
-- Una fila por colección: vacaciones, servicios, decisiones, tramites, clientesNuevos, leads.
-- La app lo lee al arrancar, lo guarda al cambiar y lo sincroniza en tiempo real.
create table if not exists demo_estado (
  coleccion text primary key,
  datos jsonb not null default '[]'::jsonb,
  actualizado timestamptz not null default now()
);

alter publication supabase_realtime add table demo_estado;

-- ───────────────────────── Seguridad (modo demo) ─────────────────────────
-- Para el demo, la llave anónima puede leer todo y escribir en demo_estado.
-- Antes de producción: Supabase Auth + políticas por rol (ver usuarios/roles en la app).
alter table demo_estado enable row level security;
create policy "demo lee estado" on demo_estado for select using (true);
create policy "demo escribe estado" on demo_estado for insert with check (true);
create policy "demo actualiza estado" on demo_estado for update using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array['zonas','clientes','custodios','unidades','ordenes_taller','cargas_combustible','servicios','incidentes','colaboradores','eventos_telemetria'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lectura publica demo" on %I for select using (true)', t);
  end loop;
end $$;
