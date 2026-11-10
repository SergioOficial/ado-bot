# Mapa del porteo desde Shin-MD

_Generado el 2026-11-10 comparando los comandos de [Shin-MD](https://github.com/riokuroxi-svg/Shin-MD) con los registrados hoy en Levi-Bot._

- Comandos en Shin: **219**
- Ya existen en Levi (al menos con un nombre): **115**
- Pendientes de portar o de descartar: **104**

«Ya existe» no significa «igual»: Levi puede tener el mismo comando con menos cosas.
Cada comando que se porta se reescribe al formato de plugin de Levi y se apunta abajo.

## Portados a mano (con cabecera de procedencia)

| Comando | Archivo en Levi | Qué se corrigió al portarlo |
|---|---|---|
| `qr` | `plugins/utils/qr.js` | el QR se dibuja en el bot; antes dependía de api.qrserver.com |
| `morse` / `demorse` | `plugins/utils/morse.js` | dice cuántos grupos no reconoce en vez de tragárselos |
| `encuesta` | `plugins/utils/encuesta.js` + `lib/encuestas.js` | quiz nativo y voto múltiple; el secreto de 32 bytes y el nodo `meta polltype=creation` |
| `say` | `plugins/utils/say.js` | reenvía la foto/vídeo citado con pie de foto y menciona de verdad |
| `read` / `readvo` | `plugins/utils/read.js` | desenvuelve también ViewOnceV2 y dice cuándo el archivo ya caducó |
| `recordar` / `olvidar` | `plugins/utils/recordar.js` + `lib/recordatorios.js` | avisos en la base: sobreviven al reinicio (antes era un setTimeout) |
| `warn` / `warns` / `delwarn` / `setwarnlimit` | `plugins/admin/warn.js` + `lib/grupo.js` | el objetivo se busca también por número escrito; la expulsión dice si ocurrió de verdad |
| `kick` | `plugins/admin/kick.js` | no echa a administradores ni a dueños aunque se escriba el número a mano |
| `promote` / `demote` | `plugins/admin/promote.js` | comprueba que WhatsApp aplicó el cambio antes de decir «hecho» |
| `hidetag` | `plugins/admin/hidetag.js` | aviso a todos con las menciones ocultas |
| `antilink` | `plugins/admin/antilink.js` | Levi no lo tenía; borra enlaces de grupo y avisa si le falta ser admin |
| `get` | `plugins/utils/get.js` + `lib/red-segura.js` | solo el dueño, con filtro de IPs privadas, DNS y sin seguir redirecciones |
| `pfp` | `plugins/utils/pfp.js` | si la foto es privada lo dice; no manda una imagen de relleno |
| `wastalk` | `plugins/utils/wastalk.js` | solo lo público (existe, estado, foto); respeta la privacidad |
| `bot on/off` | `plugins/admin/bot.js` | el apagado lo respeta el router, no cada plugin |
| `link` / `revoke` | `plugins/admin/link.js` | si el grupo no tiene enlace, se crea en vez de dar error |
| `setgpname` / `setgpdesc` / `setgpbanner` | `plugins/admin/setgp.js` | comprueban en `groupMetadata` que el cambio se aplicó |
| `pin` / `unpin` | `plugins/admin/pin.js` | avisa del tope de 7 días de WhatsApp |
| `count` / `topcount` / `topinactive` | `plugins/admin/actividad-grupo.js` + `lib/actividad.js` | contador propio topado a 1000 personas por grupo |
| `gp` | `plugins/admin/groupinfo.js` | ficha del grupo con lo que el bot tiene activado |
| `setdesc`…`setbirth` y sus borrados | `plugins/perfil/ficha.js` | valida la fecha de verdad (rechaza 32/13/9999) |
| `level` / `lboard` | `plugins/perfil/level.js` | una sola curva (100 × nivel), no una nueva |
| `afk` | `plugins/perfil/afk.js` | avisa al mencionar con límite de 10 min por chat y se quita al escribir |
| `health` `runtime` `status` `lid` `cache` `infobot` | `plugins/info/estado.js` | datos medidos (RAM, encendido, tamaños), no inventados |
| `allmenu` / `menucat` | `plugins/info/allmenu.js` | la lista se genera leyendo los plugins cargados |
| `weekly` / `monthly` | `plugins/economia/recompensas.js` | campos nuevos (`lastWeekly`, `lastMonthly`): no se reinicia la racha de `.daily` |
| `ppt` / `roulette` / `casino` | `plugins/economia/apuestas.js` | ruleta europea de verdad con pagos ×2 y ×36 |
| `coffer` | `plugins/economia/coffer.js` | lo guardado no lo toca `.rob`; sin intereses (no se fabrica dinero) |
| `crypto` | `plugins/utils/consultas.js` + `lib/consultas.js` | CoinGecko en vivo (probado): dólares y pesos con cambio de 24 h |
| `letra` | `plugins/utils/consultas.js` | lyrics.ovh (probado); si no hay letra lo dice, no inventa |
| `acortar` | `plugins/utils/enlaces-utils.js` | is.gd (probado), sin claves ni páginas intermedias |
| `tourl` | `plugins/utils/enlaces-utils.js` | uguu.se (probado). Se descartaron 0x0.st (cerró subidas por spam de bots), catbox (rechaza servidores) y tmpfiles (solo medios) |
| `botinfo` | `plugins/owner/bot-info.js` | versión, cliente, prefijos y dueños de la config real |
| `blocklist` | `plugins/owner/bot-info.js` | lee `fetchBlocklist` de WhatsApp |
| `block` / `unblock` | `plugins/owner/bot-info.js` | tras bloquear se comprueba contra la lista real |
| `getplugin` | `plugins/owner/bot-info.js` | solo nombres simples (sin rutas); se niega si pasa de 25 KB |
| `nuevo` / `delplugin` | `plugins/owner/nuevo.js` | escribe un plugin que ya responde; borrar pide confirmación |
| `newsletter` / `canales` | `plugins/owner/canales.js` | se apuntan por evento: este cliente no tiene `sock.chats` |
| `fix` (endurecido) | `plugins/owner/fix.js` | guarda parche y pide confirmación si hay cambios sin subir |
| **anti-ban** (cola, ritmo, calentamiento, vigilante) | `lib/antiban.js` | puerto de `src/network/queue.js`, `src/core/engine/throttler.js`, `src/network/health.js` y `src/services/watchdog.js`: una cola para todo, jitter gaussiano, tope diario que sube por días, pausa por riesgo y reconexión con tope de intentos |
| `warmup` / `antiban` | `plugins/owner/antiban.js` | el tope y el riesgo a la vista; solo lectura |
| **guía rápida del menú** y crédito | `lib/menu-ayuda.js` + `plugins/info/menu.js` | leyenda de símbolos y crédito de Shin-MD tal cual; las marcas Ⓓ/Ⓐ/Ⓟ salen de los plugins cargados |

## Pendientes por categoría

### anime (1)

| Comando | En Shin | Nombres |
|---|---|---|
| ppcouple | `cmds/anime/ppcouple.js` | ppcouple, ppcp |

### downloads (10)

| Comando | En Shin | Nombres |
|---|---|---|
| apk | `cmds/downloads/apk.js` | apk, aptoide, apkdl |
| deezer | `cmds/downloads/deezer.js` | deezer, dzr, deezermusic |
| gdrive | `cmds/downloads/gdrive.js` | gdrive, drive |
| instagram | `cmds/downloads/instagram.js` | instagram, ig, reel |
| mediafire | `cmds/downloads/mediafire.js` | mediafire, mf |
| play2 | `cmds/downloads/play2.js` | play2 |
| soundcloud | `cmds/downloads/soundcloud.js` | soundcloud |
| spotify | `cmds/downloads/spotify.js` | spotify |
| twitter | `cmds/downloads/twitter.js` | twitter, x |
| ytdlp | `cmds/downloads/ytdlp.js` | ytdlp, ytdl |

### economy (9)

| Comando | En Shin | Nombres |
|---|---|---|
| adventure | `cmds/economy/adventure.js` | adventure, aventura |
| dungeon | `cmds/economy/dungeon.js` | dungeon, mazmorra |
| economyboard | `cmds/economy/economyboard.js` | economyboard, eboard, baltop |
| heal | `cmds/economy/heal.js` | heal, curar, pocion, potion |
| invoke | `cmds/economy/invoke.js` | invoke, ritual, invocar |
| shop | `cmds/economy/shop.js` | shop, tienda, buy, comprar, inventory, inv, inventario |
| slot | `cmds/economy/slot.js` | slot |
| slut | `cmds/economy/slut.js` | slut, prostituirse |
| transfer | `cmds/economy/transfer.js` | transfer |

### fun (1)

| Comando | En Shin | Nombres |
|---|---|---|
| fax | `cmds/fun/fax.js` | fax |

### gacha (24)

| Comando | En Shin | Nombres |
|---|---|---|
| buychar | `cmds/gacha/buychar.js` | buychar, buyc, buycharacter |
| charimage | `cmds/gacha/charimage.js` | charimage, waifuimage, cimage, wimage |
| charinfo | `cmds/gacha/charinfo.js` | charinfo, winfo, waifuinfo |
| claim | `cmds/gacha/claim.js` | claim, c, reclamar |
| delclaimmsg | `cmds/gacha/delclaimmsg.js` | delclaimmsg, resetclaimmsg |
| deletefav | `cmds/gacha/deletefav.js` | deletefav, delfav |
| deletewaifu | `cmds/gacha/deletewaifu.js` | deletewaifu, delchar, delwaifu |
| favboard | `cmds/gacha/favboard.js` | favboard, favtop, favoritetop |
| gachainfo | `cmds/gacha/gachainfo.js` | gachainfo, ginfo, infogacha |
| giveallharem | `cmds/gacha/giveallharem.js` | giveallharem |
| givechar | `cmds/gacha/givechar.js` | givechar, givewaifu, regalar |
| harem | `cmds/gacha/harem.js` | harem, waifus, claims |
| haremshop | `cmds/gacha/haremshop.js` | haremshop, wshop, tiendawaifus |
| removesale | `cmds/gacha/removesale.js` | removesale, removerventa |
| robwaifu | `cmds/gacha/robwaifu.js` | robwaifu, robarwaifu |
| rollwaifu | `cmds/gacha/rollwaifu.js` | rollwaifu, rw, roll |
| sell | `cmds/gacha/sell.js` | sell, vender |
| serieinfo | `cmds/gacha/serieinfo.js` | serieinfo, ainfo, animeinfo |
| serielist | `cmds/gacha/serielist.js` | serielist, slist, animelist |
| setclaimmsg | `cmds/gacha/setclaimmsg.js` | setclaimmsg, setclaim |
| setfavourite | `cmds/gacha/setfavourite.js` | setfavourite, setfav |
| trade | `cmds/gacha/trade.js` | trade, intercambiar |
| vote | `cmds/gacha/vote.js` | vote, votar |
| waifusboard | `cmds/gacha/waifusboard.js` | waifusboard, waifustop, topwaifus, wtop |

### games (4)

| Comando | En Shin | Nombres |
|---|---|---|
| adivina | `cmds/games/adivina.js` | adivina |
| demo | `cmds/games/demo.js` | demo |
| kuro | `cmds/games/kuro.js` | kuro |
| ttt | `cmds/games/ttt.js` | ttt |

### group (6)

| Comando | En Shin | Nombres |
|---|---|---|
| autotraducir | `cmds/group/autotraducir.js` | autotraducir, autotrad, autotr |
| evento | `cmds/group/evento.js` | evento |
| guardar | `cmds/group/guardar.js` | guardar |
| setgoodbye | `cmds/group/setgoodbye.js` | setgoodbye |
| setprimary | `cmds/group/setprimary.js` | setprimary |
| setwelcome | `cmds/group/setwelcome.js` | setwelcome |

### main (1)

| Comando | En Shin | Nombres |
|---|---|---|
| terminos | `cmds/main/terminos.js` | terminos |

### media (1)

| Comando | En Shin | Nombres |
|---|---|---|
| audioeffects | `cmds/media/audioeffects.js` | audioeffects, audioeffect, bass, nightcore, slow, robot, reverse, blown |

### nsfw (6)

| Comando | En Shin | Nombres |
|---|---|---|
| danbooru | `cmds/nsfw/danbooru.js` | danbooru, dbooru |
| gelbooru | `cmds/nsfw/gelbooru.js` | gelbooru, gbooru |
| reactions | `cmds/nsfw/reactions.js` | reactions, anal, violar, cum, undress, encuerar, fuck, coger, spank, nalgada, lickpussy, fap, paja, grope, sixnine, 69, suckboobs, grabboobs, blowjob, mamada, bj, boobjob, yuri, tijeras, footjob, cummouth, cumshot, handjob, lickass, lickdick, fingering, creampie, facesitting, deepthroat, thighjob, bondage, pegging, futanari, futa, yaoi, bukkake, orgy, orgia, squirt, squirting |
| rule34 | `cmds/nsfw/rule34.js` | rule34, r34, rule |
| xnxx | `cmds/nsfw/xnxx.js` | xnxx |
| xvideos | `cmds/nsfw/xvideos.js` | xvideos |

### owner (3)

| Comando | En Shin | Nombres |
|---|---|---|
| compat | `cmds/owner/compat.js` | compat, diagnostico |
| setmenu | `cmds/owner/setmenu.js` | setmenu |
| subircookies | `cmds/owner/subircookies.js` | subircookies |

### profile (3)

| Comando | En Shin | Nombres |
|---|---|---|
| afktime | `cmds/profile/afktime.js` | afktime |
| divorce | `cmds/profile/divorce.js` | divorce |
| marry | `cmds/profile/marry.js` | marry, casarse |

### raíz (3)

| Comando | En Shin | Nombres |
|---|---|---|
| antistatus | `cmds/antistatus.js` | antistatus |
| events | `cmds/events.js` | events |
| gachareserved | `cmds/gachareserved.js` | gachareserved |

### socket (11)

| Comando | En Shin | Nombres |
|---|---|---|
| logout | `cmds/socket/logout.js` | logout |
| self | `cmds/socket/self.js` | self |
| setbanner | `cmds/socket/setbanner.js` | setbanner, setbotbanner |
| setchannel | `cmds/socket/setchannel.js` | setchannel, setbotchannel |
| setcurrency | `cmds/socket/setcurrency.js` | setcurrency, setbotcurrency |
| setlink | `cmds/socket/setlink.js` | setlink, setbotlink |
| setowner | `cmds/socket/setowner.js` | setowner, setbotowner |
| setpfp | `cmds/socket/setpfp.js` | setpfp, setimage |
| setprefix | `cmds/socket/setprefix.js` | setprefix, setbotprefix |
| setstatus | `cmds/socket/setstatus.js` | setstatus |
| setusername | `cmds/socket/setusername.js` | setusername |

### stickers (15)

| Comando | En Shin | Nombres |
|---|---|---|
| addsticker | `cmds/stickers/addsticker.js` | addsticker, stickeradd |
| bratv | `cmds/stickers/bratv.js` | bratv |
| delmeta | `cmds/stickers/delmeta.js` | delmeta, delstickermeta |
| delpack | `cmds/stickers/delpack.js` | delpack |
| delsticker | `cmds/stickers/delsticker.js` | delsticker, stickerdel |
| emojimix | `cmds/stickers/emojimix.js` | emojimix |
| getpack | `cmds/stickers/getpack.js` | getpack, pack, stickerpack |
| newpack | `cmds/stickers/newpack.js` | newpack, newstickerpack |
| packlist | `cmds/stickers/packlist.js` | packlist, stickerpacks |
| qc | `cmds/stickers/qc.js` | qc |
| setmeta | `cmds/stickers/setmeta.js` | setmeta, setstickermeta |
| setpackdesc | `cmds/stickers/setpackdesc.js` | setpackdesc, setstickerpackdesc, packdesc |
| setpackname | `cmds/stickers/setpackname.js` | setpackname, setstickerpackname, packname |
| setpackprivate | `cmds/stickers/setpackprivate.js` | setpackprivate, setpackpriv, packprivate |
| setpackpublic | `cmds/stickers/setpackpublic.js` | setpackpublic, setpackpub, packpublic |

### utils (6)

| Comando | En Shin | Nombres |
|---|---|---|
| benchdl | `cmds/utils/benchdl.js` | benchdl |
| carbon | `cmds/utils/carbon.js` | carbon, codigoimg, codeimg |
| deepseek | `cmds/utils/deepseek.js` | deepseek, ds, deepthink, reasoning, r1 |
| githubstalk | `cmds/utils/githubstalk.js` | githubstalk, ghstalk, gh |
| hd | `cmds/utils/hd.js` | hd, enhance, remini |
| ptv | `cmds/utils/ptv.js` | ptv |
