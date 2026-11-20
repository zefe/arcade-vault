-- SPEC 09: los 4 juegos reales se pueden jugar en táctil; la ficha lo refleja.

update public.games set controls = 'TECLADO / TÁCTIL'
where id in ('rocas', 'caida', 'serpentina');

update public.games set controls = 'TECLADO / RATÓN / TÁCTIL'
where id = 'bloque-buster';
