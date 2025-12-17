- El boton para eliminar cliente no funciona. Simplemente lo elimina del fronted de la UI interna pero sigue apareciendo en la base de datos y sigue disponible en el portal web
- Productos Que no estan en el catalogo (opc de comprar productos que no son de ninguno de los coleegios con stock activo (por encargo) web (algo similar a custom en encargos de la UI interna))
- Seccion de preguntas Preguntas frecuentes.
- 

Hola perdi un gran chat de claude que estaba ejecutando un ampliado plan para combatir principalmente estos tres enfoques:
- mostrar el correo en uniformesconsuelorios@gmail.com en las paginas de PQRS y soporte (cambiar)
- no se tiene una ui interna para el proceso de peticiones quejas y reclamos hechos en la pagina web.
- no se tiene una pasarela de pagos.



PASA QUE EL AGENTE CLAUDE ESTABA EJECUTANDO UN AMPLIO PLAN QUE HIZO CUANDO DE LA NADA SE ME CERRO EL CHAT Y NO HUBO MANERA DE RECUPERAR.
ACTUALMENTE YA EL SERVICIO ESTA EN LA PAGINA UNIFORMESCONSUELORIOS.COM, AHI ESTA LA PAGINA WEB QUE LA MANEJAMOS EN EL SERVIDOR CON PM2 Y LA API CON SYSTEMCTL (uniformes-api)

asi solemos entrar al servidor:

ssh root@104.156.247.226
 el proyecto esta:
 /var/www/uniformes-system-v2/

en el servidor no estan aplicados los cambios que hizo claude:
-pues se desarrolla aca localmente y se pasan los archivos pertientes por github, se usa alembic si es necesario y tienes acceso a ejecutar en el servidor.

La idea es identificar que cosas logro cambiar claude y entender cual era su plan del todo y en que proceso quedo implementado (usa git que no he commiteado ningun cambio)
