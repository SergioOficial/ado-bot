# Mapa del porteo desde Shin-MD

_Generado el 2026-11-10 comparando los comandos de [Shin-MD](https://github.com/riokuroxi-svg/Shin-MD) con los registrados hoy en Levi-Bot._

- Comandos en Shin: **219**
- Ya existen en Levi (al menos con un nombre): **61**
- Pendientes de portar o de descartar: **158**

«Ya existe» no significa «igual»: Levi puede tener el mismo comando con menos cosas.
Cada comando que se porta se reescribe al formato de plugin de Levi y se apunta abajo.

## Portados a mano (con cabecera de procedencia)

| Comando | Archivo en Levi | Qué se corrigió al portarlo |
|---|---|---|
| `qr` | `plugins/utils/qr.js` | el QR se dibuja en el bot; antes dependía de api.qrserver.com |
| `morse` / `demorse` | `plugins/utils/morse.js` | dice cuántos grupos no reconoce en vez de tragárselos |
| `encuesta` | `plugins/utils/encuesta.js` + `lib/encuestas.js` | quiz nativo y voto múltiple; el secreto de 32 bytes y el nodo `meta polltype=creation` |
| `say` | `plugins/utils/say.js` | reenvía la foto/vídeo citado con pie de foto y menciona de verdad |

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

### economy (16)

| Comando | En Shin | Nombres |
|---|---|---|
| adventure | `cmds/economy/adventure.js` | adventure, aventura |
| casino | `cmds/economy/casino.js` | casino, apostar |
| coffer | `cmds/economy/coffer.js` | coffer, cofre |
| dungeon | `cmds/economy/dungeon.js` | dungeon, mazmorra |
| economyboard | `cmds/economy/economyboard.js` | economyboard, eboard, baltop |
| einfo | `cmds/economy/einfo.js` | einfo, infoeconomy, cooldowns, economyinfo |
| heal | `cmds/economy/heal.js` | heal, curar, pocion, potion |
| invoke | `cmds/economy/invoke.js` | invoke, ritual, invocar |
| monthly | `cmds/economy/monthly.js` | monthly, mensual |
| ppt | `cmds/economy/ppt.js` | ppt |
| roulette | `cmds/economy/roulette.js` | roulette, rt, ruleta |
| shop | `cmds/economy/shop.js` | shop, tienda, buy, comprar, inventory, inv, inventario |
| slot | `cmds/economy/slot.js` | slot |
| slut | `cmds/economy/slut.js` | slut, prostituirse |
| transfer | `cmds/economy/transfer.js` | transfer |
| weekly | `cmds/economy/weekly.js` | weekly, semanal |

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

### group (23)

| Comando | En Shin | Nombres |
|---|---|---|
| autotraducir | `cmds/group/autotraducir.js` | autotraducir, autotrad, autotr |
| bot | `cmds/group/bot.js` | bot |
| count | `cmds/group/count.js` | count, mensajes, messages, msgcount |
| delwarn | `cmds/group/delwarn.js` | delwarn |
| demote | `cmds/group/demote.js` | demote, degradar |
| evento | `cmds/group/evento.js` | evento |
| groupinfo | `cmds/group/groupinfo.js` | groupinfo, gp |
| guardar | `cmds/group/guardar.js` | guardar |
| kick | `cmds/group/kick.js` | kick, ban, bang |
| link | `cmds/group/link.js` | link |
| promote | `cmds/group/promote.js` | promote, promover |
| revoke | `cmds/group/revoke.js` | revoke, restablecer |
| setgoodbye | `cmds/group/setgoodbye.js` | setgoodbye |
| setgpbanner | `cmds/group/setgpbanner.js` | setgpbanner |
| setgpdesc | `cmds/group/setgpdesc.js` | setgpdesc |
| setgpname | `cmds/group/setgpname.js` | setgpname |
| setprimary | `cmds/group/setprimary.js` | setprimary |
| setwarnlimit | `cmds/group/setwarnlimit.js` | setwarnlimit |
| setwelcome | `cmds/group/setwelcome.js` | setwelcome |
| topcount | `cmds/group/topcount.js` | topcount, topmensajes, topmsgcount, topmessages |
| topinactive | `cmds/group/topinactive.js` | topinactive, topinactivos, topinactiveusers |
| warn | `cmds/group/warn.js` | warn |
| warns | `cmds/group/warns.js` | warns |

### main (10)

| Comando | En Shin | Nombres |
|---|---|---|
| allmenu | `cmds/main/allmenu.js` | allmenu |
| cache | `cmds/main/cache.js` | cache, limpiarcache, clearcache |
| health | `cmds/main/health.js` | health, statsbot, salud |
| infobot | `cmds/main/infobot.js` | infobot, botinfo |
| lid | `cmds/main/lid.js` | lid, miid, identidad |
| menucat | `cmds/main/menucat.js` | menucat |
| runtime | `cmds/main/runtime.js` | runtime |
| status | `cmds/main/status.js` | status, estado |
| terminos | `cmds/main/terminos.js` | terminos |
| warmup | `cmds/main/warmup.js` | warmup |

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

### owner (4)

| Comando | En Shin | Nombres |
|---|---|---|
| compat | `cmds/owner/compat.js` | compat, diagnostico |
| setmenu | `cmds/owner/setmenu.js` | setmenu |
| subir | `cmds/owner/subir.js` | subir |
| subircookies | `cmds/owner/subircookies.js` | subircookies |

### profile (13)

| Comando | En Shin | Nombres |
|---|---|---|
| afk | `cmds/profile/afk.js` | afk |
| afktime | `cmds/profile/afktime.js` | afktime |
| delbirth | `cmds/profile/delbirth.js` | delbirth |
| deldesc | `cmds/profile/deldesc.js` | deldesc, deldescription |
| delgenre | `cmds/profile/delgenre.js` | delgenre |
| delhobby | `cmds/profile/delhobby.js` | delhobby, delpasatiempo, removehobby |
| divorce | `cmds/profile/divorce.js` | divorce |
| lboard | `cmds/profile/lboard.js` | lboard, lb, leaderboard |
| marry | `cmds/profile/marry.js` | marry, casarse |
| setbirth | `cmds/profile/setbirth.js` | setbirth |
| setdesc | `cmds/profile/setdesc.js` | setdesc, setdescription |
| setgenre | `cmds/profile/setgenre.js` | setgenre |
| sethobby | `cmds/profile/sethobby.js` | sethobby, setpasatiempo |

### raíz (4)

| Comando | En Shin | Nombres |
|---|---|---|
| antilink | `cmds/antilink.js` | antilink |
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

### utils (15)

| Comando | En Shin | Nombres |
|---|---|---|
| acortar | `cmds/utils/acortar.js` | acortar, shorturl, shorten, acorta |
| benchdl | `cmds/utils/benchdl.js` | benchdl |
| carbon | `cmds/utils/carbon.js` | carbon, codigoimg, codeimg |
| crypto | `cmds/utils/crypto.js` | crypto, btc, precio |
| deepseek | `cmds/utils/deepseek.js` | deepseek, ds, deepthink, reasoning, r1 |
| get | `cmds/utils/get.js` | get, fetch |
| getpic | `cmds/utils/getpic.js` | getpic, pfp |
| githubstalk | `cmds/utils/githubstalk.js` | githubstalk, ghstalk, gh |
| hd | `cmds/utils/hd.js` | hd, enhance, remini |
| letra | `cmds/utils/letra.js` | letra, lyrics, lyric |
| ptv | `cmds/utils/ptv.js` | ptv |
| read | `cmds/utils/read.js` | read, readviewonce, readvo |
| recordar | `cmds/utils/recordar.js` | recordar, recordatorio, reminder, alarma |
| tourl | `cmds/utils/tourl.js` | tourl |
| wastalk | `cmds/utils/wastalk.js` | wastalk, stalknum, numbstalk, perfilwa, infowa |
